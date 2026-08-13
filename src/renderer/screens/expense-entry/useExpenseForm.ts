import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, unwrap } from '@renderer/api/client';
import { SUGGEST_DEBOUNCE_MS } from '@renderer/constants/ui';
import { useAppData } from '@renderer/contexts/AppDataContext';
import {
  DEFAULT_TAX_RATE,
  NO_ALLOCATION_RATE,
  RATE_FRACTION_DIGITS,
  RATE_SCALE,
  TAX_TREATMENTS,
  type TaxTreatment,
} from '@shared/constants/tax';
import type {
  AttachmentDraft,
  Expense,
  ExpenseInput,
  PayeeSuggestion,
} from '@shared/types/expense';
import { withDelegatedNote, withoutDelegatedNote } from '@shared/utils/allocation-note';
import { calcAmountBreakdown, percentToRate, rateToPercent } from '@shared/utils/money';
import { todayString } from '@shared/utils/period';

export interface ExpenseFormState {
  expenseDate: string;
  accountCategoryId: number | null;
  payeeName: string;
  amountText: string;
  taxTreatment: TaxTreatment;
  taxRate: number;
  paymentMethodId: number | null;
  allocationPercentText: string;
  /**
   * 按分を税理士に依頼する（＝按分なし）。
   * 備考の定型文とは独立して持つ。文言を消してもチェックは外れない。
   */
  allocationDelegated: boolean;
  description: string;
  note: string;
  attachments: AttachmentDraft[];
}

/** 入力アシストで自動補完した項目 */
export type AssistedField =
  | 'accountCategoryId'
  | 'paymentMethodId'
  | 'allocationPercentText'
  | 'taxTreatment'
  | 'taxRate'
  | 'description';

const formatPercent = (rate: number): string => {
  const percent = rateToPercent(rate);
  return Number.isInteger(percent) ? String(percent) : percent.toFixed(RATE_FRACTION_DIGITS);
};

export const parseAmount = (text: string): number => {
  const normalized = text.replace(/[,\s]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : Number.NaN;
};

export const parseAllocationRate = (text: string): number => {
  const parsed = Number(text.replace(/[%\s]/g, ''));
  return Number.isFinite(parsed) ? percentToRate(parsed) : Number.NaN;
};

export interface UseExpenseFormResult {
  form: ExpenseFormState;
  assistedFields: Set<AssistedField>;
  payeeSuggestions: PayeeSuggestion[];
  descriptionSuggestions: string[];
  breakdown: ReturnType<typeof calcAmountBreakdown>;
  /** 按分を税理士に依頼する（＝按分なし）状態か */
  allocationDelegated: boolean;
  setAllocationDelegated: (next: boolean) => void;
  setField: <K extends keyof ExpenseFormState>(key: K, value: ExpenseFormState[K]) => void;
  applyPayeeSuggestion: (suggestion: PayeeSuggestion) => void;
  loadFromExpense: (expense: Expense, keepAttachmentIds: boolean) => void;
  reset: (keepPayee: boolean) => void;
  toInput: () => ExpenseInput;
}

/**
 * 経費入力フォームの状態と入力アシストを管理する。
 * 「キロク」された請求元を選ぶと、前回の入力内容で各項目を自動補完する。
 */
export const useExpenseForm = (): UseExpenseFormResult => {
  const { settings, activeAccountCategories } = useAppData();

  const createInitialState = useCallback(
    (): ExpenseFormState => ({
      expenseDate: todayString(),
      accountCategoryId: null,
      payeeName: '',
      amountText: '',
      taxTreatment: settings.defaultTaxTreatment,
      taxRate: settings.defaultTaxRate,
      paymentMethodId: null,
      allocationPercentText: formatPercent(settings.defaultAllocationRate),
      allocationDelegated: false,
      description: '',
      note: '',
      attachments: [],
    }),
    [settings],
  );

  const [form, setForm] = useState<ExpenseFormState>(createInitialState);
  /**
   * 保存済みの経費を読み込んだフォームか。
   * 既存の値を勘定科目の既定按分率で勝手に書き換えないための目印。
   */
  const loadedFromExisting = useRef(false);
  const [assistedFields, setAssistedFields] = useState<Set<AssistedField>>(new Set());
  const [payeeSuggestions, setPayeeSuggestions] = useState<PayeeSuggestion[]>([]);
  const [descriptionSuggestions, setDescriptionSuggestions] = useState<string[]>([]);

  const setField = useCallback(
    <K extends keyof ExpenseFormState>(key: K, value: ExpenseFormState[K]) => {
      setForm((current) => ({ ...current, [key]: value }));
      // 手で直した項目は「自動補完」の印を外す
      setAssistedFields((current) => {
        if (!current.has(key as AssistedField)) {
          return current;
        }
        const next = new Set(current);
        next.delete(key as AssistedField);
        return next;
      });
    },
    [],
  );

  // 請求元のサジェスト（入力の落ち着きを待ってから問い合わせる）
  useEffect(() => {
    let canceled = false;
    const timer = window.setTimeout(() => {
      void api.payees.suggest(form.payeeName).then((result) => {
        if (!canceled && result.ok) {
          setPayeeSuggestions(result.data);
        }
      });
    }, SUGGEST_DEBOUNCE_MS);

    return () => {
      canceled = true;
      window.clearTimeout(timer);
    };
  }, [form.payeeName]);

  const applyPayeeSuggestion = useCallback((suggestion: PayeeSuggestion) => {
    const assisted = new Set<AssistedField>();

    setForm((current) => {
      const next: ExpenseFormState = { ...current, payeeName: suggestion.name };

      if (suggestion.lastAccountCategoryId != null) {
        next.accountCategoryId = suggestion.lastAccountCategoryId;
        assisted.add('accountCategoryId');
      }
      if (suggestion.lastPaymentMethodId != null) {
        next.paymentMethodId = suggestion.lastPaymentMethodId;
        assisted.add('paymentMethodId');
      }
      if (suggestion.lastAllocationRate != null) {
        next.allocationPercentText = formatPercent(suggestion.lastAllocationRate);
        assisted.add('allocationPercentText');
      }
      if (suggestion.lastTaxTreatment != null) {
        next.taxTreatment = suggestion.lastTaxTreatment;
        assisted.add('taxTreatment');
      }
      if (suggestion.lastTaxRate != null) {
        next.taxRate = suggestion.lastTaxRate;
        assisted.add('taxRate');
      }
      if (suggestion.lastDescription) {
        next.description = suggestion.lastDescription;
        assisted.add('description');
      }
      return next;
    });

    setAssistedFields(assisted);

    void api.payees.descriptions(suggestion.id).then((result) => {
      if (result.ok) {
        setDescriptionSuggestions(result.data);
      }
    });
  }, []);

  const loadFromExpense = useCallback((expense: Expense, keepAttachmentIds: boolean) => {
    // 既存の内容を読み込んだあとに、勘定科目の既定按分率で上書きしてしまわないようにする
    loadedFromExisting.current = true;
    setAssistedFields(new Set());
    setDescriptionSuggestions([]);
    setForm({
      expenseDate: expense.expenseDate,
      accountCategoryId: expense.accountCategoryId,
      payeeName: expense.payeeName,
      amountText: String(expense.amount),
      taxTreatment: expense.taxTreatment,
      taxRate: expense.taxRate,
      paymentMethodId: expense.paymentMethodId,
      allocationPercentText: formatPercent(expense.allocationRate),
      allocationDelegated: expense.allocationDelegated,
      description: expense.description,
      note: expense.note,
      // 複製時は添付を引き継がない（同じ実体を二重管理しないため）
      attachments: keepAttachmentIds
        ? expense.attachments.map((attachment) => ({
            id: attachment.id,
            originalName: attachment.originalName,
            sourcePath: null,
            byteSize: attachment.byteSize,
          }))
        : [],
    });
  }, []);

  const reset = useCallback(
    (keepPayee: boolean) => {
      setAssistedFields(new Set());
      setForm((current) => ({
        ...createInitialState(),
        // 続けて入力するときは日付と請求元を引き継ぐ
        expenseDate: current.expenseDate,
        payeeName: keepPayee ? current.payeeName : '',
      }));
    },
    [createInitialState],
  );

  /**
   * 「按分なし」はフォーム自身の状態として持つ。
   * 備考の定型文は税理士へ伝えるための表示にすぎないので、
   * 利用者が備考を書き換えてもチェックは外れない。
   */
  const allocationDelegated = form.allocationDelegated;

  const setAllocationDelegated = useCallback(
    (next: boolean) => {
      setForm((current) => ({
        ...current,
        allocationDelegated: next,
        // 備考の定型文は状態に追随させる（利用者が後から消しても状態は保たれる）
        note: next ? withDelegatedNote(current.note) : withoutDelegatedNote(current.note),
        allocationPercentText: next
          ? formatPercent(NO_ALLOCATION_RATE)
          : formatPercent(settings.defaultAllocationRate),
      }));
      // 按分率は利用者の明示的な操作で決まったので自動補完の印を外す
      setAssistedFields((current) => {
        if (!current.has('allocationPercentText')) {
          return current;
        }
        const updated = new Set(current);
        updated.delete('allocationPercentText');
        return updated;
      });
    },
    [settings.defaultAllocationRate],
  );

  const amount = parseAmount(form.amountText);
  const allocationRate = parseAllocationRate(form.allocationPercentText);

  const breakdown = useMemo(
    () =>
      calcAmountBreakdown({
        amount: Number.isNaN(amount) ? 0 : amount,
        taxTreatment: form.taxTreatment,
        taxRate: form.taxTreatment === TAX_TREATMENTS.EXEMPT ? 0 : form.taxRate,
        allocationRate: Number.isNaN(allocationRate) ? RATE_SCALE : allocationRate,
      }),
    [amount, allocationRate, form.taxTreatment, form.taxRate],
  );

  // 勘定科目に既定按分率があれば、未入力時の初期値として使う
  useEffect(() => {
    // 「按分なし」を選んでいるときと、保存済みの内容を開いているときは上書きしない
    if (form.accountCategoryId == null || allocationDelegated || loadedFromExisting.current) {
      return;
    }
    const category = activeAccountCategories.find((item) => item.id === form.accountCategoryId);
    if (category?.defaultAllocationRate == null) {
      return;
    }
    setForm((current) =>
      current.accountCategoryId === category.id &&
      current.allocationPercentText === formatPercent(settings.defaultAllocationRate)
        ? { ...current, allocationPercentText: formatPercent(category.defaultAllocationRate ?? 0) }
        : current,
    );
  }, [form.accountCategoryId, activeAccountCategories, settings.defaultAllocationRate, allocationDelegated]);

  const toInput = useCallback((): ExpenseInput => {
    const resolvedAllocationRate = allocationDelegated
      ? NO_ALLOCATION_RATE
      : allocationRate;
    return {
      expenseDate: form.expenseDate,
      // 未設定（null）のまま登録できる。税理士に判断を委ねたい場合を想定している。
      accountCategoryId: form.accountCategoryId,
      payeeName: form.payeeName.trim(),
      amount: Number.isNaN(amount) ? Number.NaN : amount,
      taxTreatment: form.taxTreatment,
      taxRate: form.taxTreatment === TAX_TREATMENTS.EXEMPT ? 0 : form.taxRate,
      paymentMethodId: form.paymentMethodId,
      allocationRate: Number.isNaN(resolvedAllocationRate)
        ? Number.NaN
        : resolvedAllocationRate,
      allocationDelegated,
      description: form.description.trim(),
      note: form.note.trim(),
      attachments: form.attachments,
    };
  }, [form, amount, allocationRate, allocationDelegated]);

  return {
    form,
    assistedFields,
    payeeSuggestions,
    descriptionSuggestions,
    breakdown,
    allocationDelegated,
    setAllocationDelegated,
    setField,
    applyPayeeSuggestion,
    loadFromExpense,
    reset,
    toInput,
  };
};

export const DEFAULT_TAX_RATE_FALLBACK = DEFAULT_TAX_RATE;

/** 詳細取得のショートカット（画面から直接 unwrap を書かないため） */
export const fetchExpense = (id: number): Promise<Expense> => unwrap(api.expenses.get(id));
