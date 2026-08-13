import type { TaxTreatment } from '@shared/constants/tax';

/** 領収書などの添付ファイル */
export interface Attachment {
  id: number;
  expenseId: number;
  /** 選択時の元ファイル名（表示用） */
  originalName: string;
  /** アプリのデータ領域に保存した実体のフルパス */
  storedPath: string;
  mimeType: string | null;
  byteSize: number;
  createdAt: string;
}

/** 添付候補（保存前にレンダラが保持するファイル参照） */
export interface AttachmentDraft {
  /** 既存の添付なら id を持つ。新規追加なら null */
  id: number | null;
  originalName: string;
  /** 新規追加時のみ。コピー元のフルパス */
  sourcePath: string | null;
  byteSize: number;
}

/**
 * 取り込みフォルダに置かれているファイル。
 * スマホから Bluetooth・クラウド同期などで送った画像を、この一覧から選んで添付する。
 */
export interface ImportCandidate {
  filePath: string;
  fileName: string;
  byteSize: number;
  /** 更新日時（ISO 文字列）。新しい順に並べるのに使う */
  modifiedAt: string;
  /** 一覧に出す小さな画像（data URL）。PDF など画像化できない場合は null */
  thumbnailDataUrl: string | null;
}

/** 経費の登録・更新に使う入力値 */
export interface ExpenseInput {
  /** YYYY-MM-DD */
  expenseDate: string;
  /**
   * 勘定科目。未入力（null）を許容する。
   * 税理士に確定申告を依頼する際、判断がつかない項目を安易に選ばせないため、
   * 未定のまま登録して後で判断してもらえるようにしている。
   */
  accountCategoryId: number | null;
  /** 請求元は名称で受け取り、main 側で payees に upsert する */
  payeeName: string;
  /** 入力された金額（円・整数）。税区分に応じて税込／税抜のいずれか */
  amount: number;
  taxTreatment: TaxTreatment;
  /** 税率（ベーシスポイント。1000 = 10%） */
  taxRate: number;
  paymentMethodId: number | null;
  /** 事業按分率（ベーシスポイント。10000 = 100%） */
  allocationRate: number;
  /**
   * 按分の判断を税理士に委ねる（＝按分なし）。
   * 備考の定型文とは独立して保持する。文言を消してもこの状態は変わらない。
   */
  allocationDelegated: boolean;
  description: string;
  note: string;
  attachments: AttachmentDraft[];
}

/** 一覧・詳細で扱う経費（表示に必要な名称を結合済み） */
export interface Expense {
  id: number;
  expenseDate: string;
  accountCategoryId: number | null;
  /** 未設定なら null。表示するときは UNCATEGORIZED_LABEL などで補ってから出す */
  accountCategoryName: string | null;
  payeeId: number;
  payeeName: string;
  amount: number;
  taxTreatment: TaxTreatment;
  taxRate: number;
  paymentMethodId: number | null;
  paymentMethodName: string | null;
  allocationRate: number;
  /** 按分の判断を税理士に委ねる（＝按分なし） */
  allocationDelegated: boolean;
  description: string;
  note: string;
  attachments: Attachment[];
  createdAt: string;
  updatedAt: string;
}

/** 期間の指定方法 */
export const PERIOD_MODES = {
  YEAR: 'year',
  MONTH: 'month',
} as const;

export type PeriodMode = (typeof PERIOD_MODES)[keyof typeof PERIOD_MODES];

export interface Period {
  mode: PeriodMode;
  year: number;
  /** mode が month のときのみ使用（1-12） */
  month: number | null;
}

/** 一覧の絞り込み条件 */
export interface ExpenseFilter {
  period: Period;
  accountCategoryId: number | null;
  payeeId: number | null;
  /** 内容・備考・請求元名に対する部分一致 */
  keyword: string;
}

/** 勘定科目別の小計 */
export interface CategorySummary {
  /** 未設定の経費をまとめた行なら null */
  accountCategoryId: number | null;
  accountCategoryName: string;
  count: number;
  totalAmount: number;
  totalAllocatedAmount: number;
}

export interface ExpenseSummary {
  count: number;
  /** 税込合計 */
  totalTaxIncluded: number;
  /** 税抜合計 */
  totalTaxExcluded: number;
  /** 消費税合計 */
  totalTax: number;
  /** 按分後の経費計上額合計 */
  totalAllocated: number;
  byCategory: CategorySummary[];
}

export interface ExpenseListResult {
  expenses: Expense[];
  summary: ExpenseSummary;
}

/** 入力アシスト用に記憶している請求元 */
export interface PayeeSuggestion {
  id: number;
  name: string;
  useCount: number;
  lastUsedAt: string | null;
  lastAccountCategoryId: number | null;
  lastPaymentMethodId: number | null;
  lastAllocationRate: number | null;
  lastTaxTreatment: TaxTreatment | null;
  lastTaxRate: number | null;
  lastDescription: string | null;
}
