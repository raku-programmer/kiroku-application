/**
 * CSV 取り込みの列定義。
 * 経費入力画面の項目に合わせているが、領収書ファイルの添付だけは
 * CSV では表現できないため対象外（取り込み後に個別で添付する）。
 */

export const CSV_IMPORT_COLUMNS = [
  { key: 'expenseDate', header: '日付', required: true },
  // 勘定科目は未入力可（税理士に判断を委ねたい場合を想定）
  { key: 'accountCategoryName', header: '勘定科目', required: false },
  { key: 'payeeName', header: '請求元', required: true },
  { key: 'amount', header: '金額', required: true },
  { key: 'taxTreatmentLabel', header: '税区分', required: true },
  { key: 'taxRateLabel', header: '税率', required: false },
  { key: 'paymentMethodName', header: '支払方法', required: false },
  { key: 'allocationRateLabel', header: '按分率', required: false },
  { key: 'description', header: '内容', required: false },
  { key: 'note', header: '備考', required: false },
] as const;

export type CsvImportColumnKey = (typeof CSV_IMPORT_COLUMNS)[number]['key'];

export const CSV_IMPORT_HEADER_ROW: readonly string[] = CSV_IMPORT_COLUMNS.map(
  (column) => column.header,
);

/**
 * 按分率の列にこの値が入っていたら「按分なし（税理士に依頼）」として扱う。
 * 経費入力画面のチェックボックスと同じ意味にする。
 */
export const CSV_ALLOCATION_DELEGATED_VALUES: readonly string[] = ['なし', '按分なし'];

/** テンプレート・取り込みで受け付ける 1 ファイルあたりの最大行数（見出し行を除く） */
export const MAX_CSV_IMPORT_ROWS = 1000;

export const CSV_IMPORT_FILE_EXTENSION = 'csv';

/** テンプレートに含める記入例（そのまま取り込める値にしてある） */
export const CSV_IMPORT_SAMPLE_ROW: readonly string[] = [
  '2026-08-12',
  '旅費交通費',
  'JR東日本',
  '1100',
  '税込',
  '10%',
  '交通系ICカード',
  '100',
  '取引先訪問の交通費',
  '',
];

export const CSV_TEMPLATE_FILE_NAME = 'Kiroku_経費取込テンプレート.csv';
