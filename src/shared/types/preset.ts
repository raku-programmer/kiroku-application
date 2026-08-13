/** 勘定科目プリセット */
export interface AccountCategory {
  id: number;
  name: string;
  displayOrder: number;
  /** 既定の按分率（ベーシスポイント）。未設定なら null */
  defaultAllocationRate: number | null;
  isActive: boolean;
}

/** 支払方法プリセット */
export interface PaymentMethod {
  id: number;
  name: string;
  displayOrder: number;
  isActive: boolean;
}

export interface AccountCategoryInput {
  name: string;
  defaultAllocationRate: number | null;
  isActive: boolean;
}

export interface PaymentMethodInput {
  name: string;
  isActive: boolean;
}

/** 並べ替え指示（id の並び順をそのまま displayOrder に反映する） */
export interface ReorderInput {
  ids: number[];
}

export interface PresetBundle {
  accountCategories: AccountCategory[];
  paymentMethods: PaymentMethod[];
}
