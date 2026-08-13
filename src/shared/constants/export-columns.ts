/** Excel 出力の列定義。見出し・幅・書式をここだけで管理する。 */

/** 1 行分の出力データ */
export interface ExpenseExportRow {
  expenseDate: string;
  accountCategoryName: string;
  payeeName: string;
  description: string;
  paymentMethodName: string;
  taxTreatmentLabel: string;
  taxRateLabel: string;
  amountTaxIncluded: number;
  amountTaxExcluded: number;
  taxAmount: number;
  allocationRatePercent: number;
  allocatedAmount: number;
  attachmentNames: string;
  note: string;
}

export const CELL_ALIGNMENTS = {
  LEFT: 'left',
  CENTER: 'center',
  RIGHT: 'right',
} as const;

export type CellAlignment = (typeof CELL_ALIGNMENTS)[keyof typeof CELL_ALIGNMENTS];

/** Excel の表示書式 */
export const NUMBER_FORMATS = {
  YEN: '#,##0',
  PERCENT: '0.##"%"',
} as const;

export interface ExportColumnDefinition {
  key: keyof ExpenseExportRow;
  header: string;
  width: number;
  numFmt?: string;
  alignment?: CellAlignment;
  /** 合計行で集計する列か */
  totalize?: boolean;
}

export const EXPENSE_EXPORT_COLUMNS: readonly ExportColumnDefinition[] = [
  { key: 'expenseDate', header: '日付', width: 12, alignment: CELL_ALIGNMENTS.CENTER },
  { key: 'accountCategoryName', header: '勘定科目', width: 16 },
  { key: 'payeeName', header: '請求元', width: 22 },
  { key: 'description', header: '内容', width: 32 },
  { key: 'paymentMethodName', header: '支払方法', width: 16 },
  { key: 'taxTreatmentLabel', header: '税区分', width: 14, alignment: CELL_ALIGNMENTS.CENTER },
  { key: 'taxRateLabel', header: '税率', width: 12, alignment: CELL_ALIGNMENTS.CENTER },
  {
    key: 'amountTaxIncluded',
    header: '金額（税込）',
    width: 14,
    numFmt: NUMBER_FORMATS.YEN,
    alignment: CELL_ALIGNMENTS.RIGHT,
    totalize: true,
  },
  {
    key: 'amountTaxExcluded',
    header: '税抜額',
    width: 14,
    numFmt: NUMBER_FORMATS.YEN,
    alignment: CELL_ALIGNMENTS.RIGHT,
    totalize: true,
  },
  {
    key: 'taxAmount',
    header: '消費税額',
    width: 12,
    numFmt: NUMBER_FORMATS.YEN,
    alignment: CELL_ALIGNMENTS.RIGHT,
    totalize: true,
  },
  {
    key: 'allocationRatePercent',
    header: '按分率',
    width: 10,
    numFmt: NUMBER_FORMATS.PERCENT,
    alignment: CELL_ALIGNMENTS.RIGHT,
  },
  {
    key: 'allocatedAmount',
    header: '経費計上額',
    width: 14,
    numFmt: NUMBER_FORMATS.YEN,
    alignment: CELL_ALIGNMENTS.RIGHT,
    totalize: true,
  },
  { key: 'attachmentNames', header: '領収書', width: 24 },
  { key: 'note', header: '備考', width: 28 },
];

/** 合計行の見出しを置く列 */
export const TOTAL_ROW_LABEL_KEY: keyof ExpenseExportRow = 'description';
export const TOTAL_ROW_LABEL = '合計';

/** 複数添付を 1 セルに並べるときの区切り */
export const ATTACHMENT_NAME_SEPARATOR = ' / ';

/** 支払方法が未設定のときの表示 */
export const EMPTY_CELL_PLACEHOLDER = '';

/** シート名のテンプレート（{period} は 2026 / 2026-08 のような表現） */
export const EXPORT_SHEET_NAME_TEMPLATE = '経費明細_{period}';

export const EXPORT_FILE_EXTENSION = 'xlsx';
