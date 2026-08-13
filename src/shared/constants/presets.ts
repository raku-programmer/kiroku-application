/** 初回起動時に投入するプリセットの定義。 */

export interface SeedAccountCategory {
  name: string;
  /** 既定の按分率（ベーシスポイント）。null なら設定の既定値を使う */
  defaultAllocationRate: number | null;
}

export const SEED_ACCOUNT_CATEGORIES: readonly SeedAccountCategory[] = [
  { name: '旅費交通費', defaultAllocationRate: null },
  { name: '通信費', defaultAllocationRate: null },
  { name: '消耗品費', defaultAllocationRate: null },
  { name: '事務用品費', defaultAllocationRate: null },
  { name: '会議費', defaultAllocationRate: null },
  { name: '接待交際費', defaultAllocationRate: null },
  { name: '新聞図書費', defaultAllocationRate: null },
  { name: '支払手数料', defaultAllocationRate: null },
  { name: '外注費', defaultAllocationRate: null },
  { name: '広告宣伝費', defaultAllocationRate: null },
  { name: '地代家賃', defaultAllocationRate: null },
  { name: '水道光熱費', defaultAllocationRate: null },
  { name: '租税公課', defaultAllocationRate: null },
  { name: '減価償却費', defaultAllocationRate: null },
  { name: '研修費', defaultAllocationRate: null },
  { name: '雑費', defaultAllocationRate: null },
];

/**
 * 勘定科目が未設定の経費に表示するラベル。
 * 一覧・照会・Excel 出力のすべてで同じ文言になるよう、ここ 1 箇所で定義する。
 */
export const UNCATEGORIZED_LABEL = '未設定';

export const SEED_PAYMENT_METHODS: readonly string[] = [
  '現金',
  'クレジットカード',
  '口座振替',
  '銀行振込',
  '電子マネー',
  'その他',
];
