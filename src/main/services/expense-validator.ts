import { findAccountCategory, findPaymentMethod } from '@main/db/repositories/preset-repository';
import { validationError } from '@main/errors';
import { MAX_ATTACHMENTS_PER_EXPENSE } from '@shared/constants/attachments';
import {
  MAX_AMOUNT,
  RATE_SCALE,
  TAX_RATE_OPTIONS,
  TAX_TREATMENTS,
  TAX_TREATMENT_OPTIONS,
  type TaxTreatment,
} from '@shared/constants/tax';
import type { ExpenseInput } from '@shared/types/expense';
import { isValidDateString } from '@shared/utils/period';

const FIELD_LABELS = {
  expenseDate: '日付',
  accountCategoryId: '勘定科目',
  payeeName: '請求元',
  amount: '金額',
  taxTreatment: '税区分',
  taxRate: '税率',
  paymentMethodId: '支払方法',
  allocationRate: '按分率',
  attachments: '領収書',
} as const;

/** 請求元名の最大長 */
export const MAX_PAYEE_NAME_LENGTH = 120;
/** 内容の最大長 */
export const MAX_DESCRIPTION_LENGTH = 500;
/** 備考の最大長 */
export const MAX_NOTE_LENGTH = 1000;

const isValidTaxTreatment = (value: string): value is TaxTreatment =>
  TAX_TREATMENT_OPTIONS.some((option) => option.value === value);

/** 正規化済みの入力値 */
export interface NormalizedExpenseInput extends ExpenseInput {
  payeeName: string;
  description: string;
  note: string;
}

/**
 * IPC で受け取った入力値を検証し、正規化して返す。
 * 検証に失敗した場合は項目ごとのメッセージを持つ例外を投げる。
 */
export const validateExpenseInput = (input: ExpenseInput): NormalizedExpenseInput => {
  const fields: Record<string, string> = {};

  const expenseDate = String(input.expenseDate ?? '').trim();
  if (!isValidDateString(expenseDate)) {
    fields.expenseDate = `${FIELD_LABELS.expenseDate}を正しく入力してください。`;
  }

  // 勘定科目は未入力（null）を許容する。指定された場合のみ実在チェックする。
  const accountCategoryId = input.accountCategoryId ?? null;
  if (
    accountCategoryId != null &&
    (!Number.isInteger(accountCategoryId) || findAccountCategory(accountCategoryId) == null)
  ) {
    fields.accountCategoryId = `${FIELD_LABELS.accountCategoryId}の指定が正しくありません。`;
  }

  const payeeName = String(input.payeeName ?? '').trim();
  if (payeeName.length === 0) {
    fields.payeeName = `${FIELD_LABELS.payeeName}を入力してください。`;
  } else if (payeeName.length > MAX_PAYEE_NAME_LENGTH) {
    fields.payeeName = `${FIELD_LABELS.payeeName}は ${MAX_PAYEE_NAME_LENGTH} 文字以内で入力してください。`;
  }

  if (!Number.isInteger(input.amount) || input.amount < 0) {
    fields.amount = `${FIELD_LABELS.amount}は 0 以上の整数で入力してください。`;
  } else if (input.amount > MAX_AMOUNT) {
    fields.amount = `${FIELD_LABELS.amount}が大きすぎます。`;
  }

  const taxTreatment = String(input.taxTreatment ?? '');
  if (!isValidTaxTreatment(taxTreatment)) {
    fields.taxTreatment = `${FIELD_LABELS.taxTreatment}を選択してください。`;
  }

  const isExempt = taxTreatment === TAX_TREATMENTS.EXEMPT;
  const taxRate = isExempt ? 0 : input.taxRate;
  if (!isExempt && !TAX_RATE_OPTIONS.some((option) => option.value === taxRate)) {
    fields.taxRate = `${FIELD_LABELS.taxRate}を選択してください。`;
  }

  if (input.paymentMethodId != null) {
    if (!Number.isInteger(input.paymentMethodId) || findPaymentMethod(input.paymentMethodId) == null) {
      fields.paymentMethodId = `${FIELD_LABELS.paymentMethodId}を選択してください。`;
    }
  }

  if (
    !Number.isInteger(input.allocationRate) ||
    input.allocationRate < 0 ||
    input.allocationRate > RATE_SCALE
  ) {
    fields.allocationRate = `${FIELD_LABELS.allocationRate}は 0〜100% の範囲で入力してください。`;
  }

  const description = String(input.description ?? '').trim();
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    fields.description = `内容は ${MAX_DESCRIPTION_LENGTH} 文字以内で入力してください。`;
  }

  const note = String(input.note ?? '').trim();
  if (note.length > MAX_NOTE_LENGTH) {
    fields.note = `備考は ${MAX_NOTE_LENGTH} 文字以内で入力してください。`;
  }

  const attachments = Array.isArray(input.attachments) ? input.attachments : [];
  if (attachments.length > MAX_ATTACHMENTS_PER_EXPENSE) {
    fields.attachments = `${FIELD_LABELS.attachments}は ${MAX_ATTACHMENTS_PER_EXPENSE} 件までです。`;
  }

  if (Object.keys(fields).length > 0) {
    throw validationError('入力内容を確認してください。', fields);
  }

  return {
    expenseDate,
    accountCategoryId,
    payeeName,
    amount: input.amount,
    taxTreatment: taxTreatment as TaxTreatment,
    taxRate,
    paymentMethodId: input.paymentMethodId ?? null,
    allocationRate: input.allocationRate,
    allocationDelegated: input.allocationDelegated === true,
    description,
    note,
    attachments,
  };
};
