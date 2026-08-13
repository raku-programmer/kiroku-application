import type { ExpenseInput } from '@shared/types/expense';

/** 取り込みプレビューの 1 行。解決済みの表示用の値と、保存に使う input を両方持つ。 */
export interface CsvImportRow {
  /** CSV 上の行番号（見出し行を 1 として数える。データは 2 行目から） */
  rowNumber: number;
  status: 'ok' | 'error';
  /** 検証エラーがあれば、その内容（複数可） */
  errors: string[];
  /** 画面のプレビュー表示用（解決前の生の文字列） */
  raw: {
    expenseDate: string;
    accountCategoryName: string;
    payeeName: string;
    amount: string;
    taxTreatmentLabel: string;
    taxRateLabel: string;
    paymentMethodName: string;
    allocationRateLabel: string;
    description: string;
    note: string;
  };
  /** status が 'ok' のときだけ入る、保存用の正規化済み値 */
  input: ExpenseInput | null;
}

export interface CsvImportPreview {
  fileName: string;
  rows: CsvImportRow[];
  okCount: number;
  errorCount: number;
}

/** 取り込み確定時に main へ渡す 1 件（失敗時の行番号特定のため rowNumber を保持する） */
export interface CsvImportCommitItem {
  rowNumber: number;
  input: ExpenseInput;
}

export interface CsvImportFailure {
  rowNumber: number;
  message: string;
}

export interface CsvImportCommitResult {
  importedCount: number;
  failedCount: number;
  failures: CsvImportFailure[];
}
