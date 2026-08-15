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
  /** 「按分なし」の経費は数値ではなく ALLOCATION_DELEGATED_CELL を入れる */
  allocationRatePercent: number | string;
  /** 同上。金額が確定していないため合計にも含めない */
  allocatedAmount: number | string;
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
    // 「按分未対応」が収まる幅にしている
    header: '按分率',
    width: 12,
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

/**
 * 「按分なし（税理士に依頼）」の経費で、按分率と経費計上額の代わりに置く表示。
 *
 * この状態は「按分率 100%」ではなく「按分をまだ決めていない」という意味なので、
 * 100% と全額を書くと按分済みの経費と見分けがつかなくなる。
 * 数値ではなく文字を入れることで、合計行の集計対象からも自動的に外れる。
 */
export const ALLOCATION_DELEGATED_CELL = '按分未対応';

/** シート名のテンプレート（{period} は 2026 / 2026-08 のような表現） */
export const EXPORT_SHEET_NAME_TEMPLATE = '経費明細_{period}';

export const EXPORT_FILE_EXTENSION = 'xlsx';
