import {
  DEFAULT_ROUNDING_MODE,
  RATE_SCALE,
  ROUNDING_MODES,
  TAX_TREATMENTS,
  type RoundingMode,
  type TaxTreatment,
} from '@shared/constants/tax';

/** 端数処理。main（Excel 出力）と renderer（プレビュー）で同じ結果になるよう共有する。 */
export const applyRounding = (
  value: number,
  mode: RoundingMode = DEFAULT_ROUNDING_MODE,
): number => {
  switch (mode) {
    case ROUNDING_MODES.FLOOR:
      return Math.floor(value);
    case ROUNDING_MODES.CEIL:
      return Math.ceil(value);
    case ROUNDING_MODES.ROUND:
    default:
      return Math.round(value);
  }
};

export interface TaxBreakdown {
  /** 税抜額 */
  taxExcluded: number;
  /** 消費税額 */
  taxAmount: number;
  /** 税込額 */
  taxIncluded: number;
}

/**
 * 入力金額と税区分から税抜額・消費税額・税込額を求める。
 * @param amount 入力された金額（円・整数）
 * @param treatment 税区分
 * @param taxRate 税率（ベーシスポイント。1000 = 10%）
 */
export const calcTaxBreakdown = (
  amount: number,
  treatment: TaxTreatment,
  taxRate: number,
  mode: RoundingMode = DEFAULT_ROUNDING_MODE,
): TaxBreakdown => {
  const safeAmount = Number.isFinite(amount) ? amount : 0;

  if (treatment === TAX_TREATMENTS.EXEMPT || taxRate <= 0) {
    return { taxExcluded: safeAmount, taxAmount: 0, taxIncluded: safeAmount };
  }

  if (treatment === TAX_TREATMENTS.EXCLUSIVE) {
    const taxAmount = applyRounding((safeAmount * taxRate) / RATE_SCALE, mode);
    return {
      taxExcluded: safeAmount,
      taxAmount,
      taxIncluded: safeAmount + taxAmount,
    };
  }

  // 税込入力：税込額から税抜額を逆算する
  const taxExcluded = applyRounding((safeAmount * RATE_SCALE) / (RATE_SCALE + taxRate), mode);
  return {
    taxExcluded,
    taxAmount: safeAmount - taxExcluded,
    taxIncluded: safeAmount,
  };
};

/**
 * 事業按分率を適用した経費計上額を求める。
 * @param taxIncludedAmount 税込額
 * @param allocationRate 按分率（ベーシスポイント。10000 = 100%）
 */
export const calcAllocatedAmount = (
  taxIncludedAmount: number,
  allocationRate: number,
  mode: RoundingMode = DEFAULT_ROUNDING_MODE,
): number => {
  if (!Number.isFinite(taxIncludedAmount) || !Number.isFinite(allocationRate)) {
    return 0;
  }
  if (allocationRate >= RATE_SCALE) {
    return taxIncludedAmount;
  }
  return applyRounding((taxIncludedAmount * allocationRate) / RATE_SCALE, mode);
};

export interface AmountBreakdown extends TaxBreakdown {
  /** 按分後の経費計上額 */
  allocatedAmount: number;
}

/** 税計算と按分計算をまとめて行う。 */
export const calcAmountBreakdown = (params: {
  amount: number;
  taxTreatment: TaxTreatment;
  taxRate: number;
  allocationRate: number;
}): AmountBreakdown => {
  const tax = calcTaxBreakdown(params.amount, params.taxTreatment, params.taxRate);
  return {
    ...tax,
    allocatedAmount: calcAllocatedAmount(tax.taxIncluded, params.allocationRate),
  };
};

/** ベーシスポイントをパーセント値（数値）に変換する。1000 -> 10 */
export const rateToPercent = (rate: number): number => (rate / RATE_SCALE) * 100;

/** パーセント値をベーシスポイントに変換する。10 -> 1000 */
export const percentToRate = (percent: number): number =>
  Math.round((percent / 100) * RATE_SCALE);
