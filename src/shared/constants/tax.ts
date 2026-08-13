/**
 * 消費税と按分に関する定数。
 * 税率・按分率はいずれも「整数のベーシスポイント」で保持し、浮動小数の誤差を避ける。
 *   税率   : 1000 = 10.00%
 *   按分率 : 10000 = 100.00%
 */

/** 率 1 単位あたりのスケール（100% = 10000） */
export const RATE_SCALE = 10_000;

/** 率を「%」表記に変換するときの除数（1000 -> 10%） */
export const RATE_PERCENT_DIVISOR = 100;

/** 率の小数点以下の表示桁数 */
export const RATE_FRACTION_DIGITS = 2;

/** 税区分 */
export const TAX_TREATMENTS = {
  /** 税込入力 */
  INCLUSIVE: 'inclusive',
  /** 税抜入力 */
  EXCLUSIVE: 'exclusive',
  /** 非課税・不課税 */
  EXEMPT: 'exempt',
} as const;

export type TaxTreatment = (typeof TAX_TREATMENTS)[keyof typeof TAX_TREATMENTS];

export interface TaxTreatmentOption {
  value: TaxTreatment;
  label: string;
  /** この区分で税率入力を行うか */
  hasRate: boolean;
}

export const TAX_TREATMENT_OPTIONS: readonly TaxTreatmentOption[] = [
  { value: TAX_TREATMENTS.INCLUSIVE, label: '税込', hasRate: true },
  { value: TAX_TREATMENTS.EXCLUSIVE, label: '税抜', hasRate: true },
  { value: TAX_TREATMENTS.EXEMPT, label: '非課税・不課税', hasRate: false },
];

export interface TaxRateOption {
  /** ベーシスポイント（1000 = 10%） */
  value: number;
  label: string;
}

export const TAX_RATE_OPTIONS: readonly TaxRateOption[] = [
  { value: 1000, label: '10%' },
  { value: 800, label: '8%（軽減税率）' },
  { value: 0, label: '0%' },
];

/** 端数処理の方式 */
export const ROUNDING_MODES = {
  ROUND: 'round',
  FLOOR: 'floor',
  CEIL: 'ceil',
} as const;

export type RoundingMode = (typeof ROUNDING_MODES)[keyof typeof ROUNDING_MODES];

/** 消費税額・按分額の端数処理（既定：四捨五入） */
export const DEFAULT_ROUNDING_MODE: RoundingMode = ROUNDING_MODES.ROUND;

/** 按分率のクイック選択（ベーシスポイント） */
export const ALLOCATION_RATE_PRESETS: readonly number[] = [10_000, 7_500, 5_000, 3_000];

/** 按分率の既定値（100%） */
export const DEFAULT_ALLOCATION_RATE = RATE_SCALE;

/**
 * 「按分なし」を選んだときに使う按分率。
 * 金額をそのまま計上し、実際の按分は税理士側で行ってもらう。
 */
export const NO_ALLOCATION_RATE = RATE_SCALE;

/**
 * 「按分なし」を選んだときに備考へ自動で追記する文言。
 * 税理士がこの経費を見たときに按分の要否を判断できるようにする。
 * 保存済みデータからチェック状態を復元する目印も兼ねるため、変更すると
 * 変更前に保存した経費ではチェックが復元されない点に注意。
 */
export const ALLOCATION_DELEGATED_NOTE = '【按分なし】按分は税理士側でお願いします。';

/** 税率の既定値（10%） */
export const DEFAULT_TAX_RATE = 1000;

/** 税区分の既定値 */
export const DEFAULT_TAX_TREATMENT: TaxTreatment = TAX_TREATMENTS.INCLUSIVE;

/** 金額の入力上限（円）。桁あふれと誤入力の防止用。 */
export const MAX_AMOUNT = 1_000_000_000;
