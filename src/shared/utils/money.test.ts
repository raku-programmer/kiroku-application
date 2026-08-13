import { describe, expect, it } from 'vitest';
import {
  RATE_SCALE,
  ROUNDING_MODES,
  TAX_TREATMENTS,
} from '@shared/constants/tax';
import {
  applyRounding,
  calcAllocatedAmount,
  calcAmountBreakdown,
  calcTaxBreakdown,
  percentToRate,
  rateToPercent,
} from '@shared/utils/money';

/**
 * 提出資料の金額そのものを決める計算。
 * ここがずれると利用者は気づけないため、端数と境界値を厚めに確認する。
 */

const TAX_10 = 1000;
const TAX_8 = 800;

describe('calcTaxBreakdown', () => {
  it('税込入力では税抜額を逆算し、差額を消費税額とする', () => {
    expect(calcTaxBreakdown(11_000, TAX_TREATMENTS.INCLUSIVE, TAX_10)).toEqual({
      taxExcluded: 10_000,
      taxAmount: 1_000,
      taxIncluded: 11_000,
    });
  });

  it('税抜入力では税額を上乗せする', () => {
    expect(calcTaxBreakdown(10_000, TAX_TREATMENTS.EXCLUSIVE, TAX_10)).toEqual({
      taxExcluded: 10_000,
      taxAmount: 1_000,
      taxIncluded: 11_000,
    });
  });

  it('軽減税率 8% を扱える', () => {
    expect(calcTaxBreakdown(10_000, TAX_TREATMENTS.EXCLUSIVE, TAX_8)).toEqual({
      taxExcluded: 10_000,
      taxAmount: 800,
      taxIncluded: 10_800,
    });
    expect(calcTaxBreakdown(10_800, TAX_TREATMENTS.INCLUSIVE, TAX_8)).toEqual({
      taxExcluded: 10_000,
      taxAmount: 800,
      taxIncluded: 10_800,
    });
  });

  it('非課税では税率の指定によらず税額が 0 になる', () => {
    expect(calcTaxBreakdown(5_000, TAX_TREATMENTS.EXEMPT, TAX_10)).toEqual({
      taxExcluded: 5_000,
      taxAmount: 0,
      taxIncluded: 5_000,
    });
  });

  it('税率 0% は非課税と同じ結果になる', () => {
    expect(calcTaxBreakdown(5_000, TAX_TREATMENTS.INCLUSIVE, 0)).toEqual({
      taxExcluded: 5_000,
      taxAmount: 0,
      taxIncluded: 5_000,
    });
  });

  it('税込入力では端数が出ても 税抜 + 消費税 = 税込 が必ず成り立つ', () => {
    for (const amount of [1, 3, 7, 1_234, 9_999, 10_001, 123_457]) {
      const result = calcTaxBreakdown(amount, TAX_TREATMENTS.INCLUSIVE, TAX_10);
      expect(result.taxExcluded + result.taxAmount).toBe(amount);
      expect(result.taxIncluded).toBe(amount);
    }
  });

  it('税抜入力でも 税抜 + 消費税 = 税込 が成り立つ', () => {
    for (const amount of [1, 3, 7, 1_234, 9_999, 123_457]) {
      const result = calcTaxBreakdown(amount, TAX_TREATMENTS.EXCLUSIVE, TAX_10);
      expect(result.taxExcluded + result.taxAmount).toBe(result.taxIncluded);
    }
  });

  it('税込 1234 円 / 10% は四捨五入で税抜 1122 円になる', () => {
    // 1234 / 1.1 = 1121.81... → 1122
    expect(calcTaxBreakdown(1_234, TAX_TREATMENTS.INCLUSIVE, TAX_10)).toEqual({
      taxExcluded: 1_122,
      taxAmount: 112,
      taxIncluded: 1_234,
    });
  });

  it('端数処理の方式を切り替えられる', () => {
    const floor = calcTaxBreakdown(1_234, TAX_TREATMENTS.INCLUSIVE, TAX_10, ROUNDING_MODES.FLOOR);
    const ceil = calcTaxBreakdown(1_234, TAX_TREATMENTS.INCLUSIVE, TAX_10, ROUNDING_MODES.CEIL);
    expect(floor.taxExcluded).toBe(1_121);
    expect(ceil.taxExcluded).toBe(1_122);
  });

  it('金額が数値でない場合は 0 として扱う', () => {
    expect(calcTaxBreakdown(Number.NaN, TAX_TREATMENTS.INCLUSIVE, TAX_10)).toEqual({
      taxExcluded: 0,
      taxAmount: 0,
      taxIncluded: 0,
    });
  });

  it('0 円を渡しても壊れない', () => {
    expect(calcTaxBreakdown(0, TAX_TREATMENTS.INCLUSIVE, TAX_10)).toEqual({
      taxExcluded: 0,
      taxAmount: 0,
      taxIncluded: 0,
    });
  });
});

describe('calcAllocatedAmount', () => {
  it('100% ならそのままの金額を返す', () => {
    expect(calcAllocatedAmount(11_000, RATE_SCALE)).toBe(11_000);
  });

  it('按分率に応じて減額する', () => {
    expect(calcAllocatedAmount(11_000, 6_000)).toBe(6_600);
    expect(calcAllocatedAmount(10_800, 5_000)).toBe(5_400);
    expect(calcAllocatedAmount(5_000, 3_000)).toBe(1_500);
  });

  it('端数は四捨五入する', () => {
    // 1234 * 0.3333 = 411.28... → 411
    expect(calcAllocatedAmount(1_234, 3_333)).toBe(411);
  });

  it('0% なら 0 円になる', () => {
    expect(calcAllocatedAmount(11_000, 0)).toBe(0);
  });

  it('100% を超える指定は 100% として扱う（過大計上を防ぐ）', () => {
    expect(calcAllocatedAmount(11_000, RATE_SCALE * 2)).toBe(11_000);
  });

  it('数値でない入力は 0 を返す', () => {
    expect(calcAllocatedAmount(Number.NaN, RATE_SCALE)).toBe(0);
    expect(calcAllocatedAmount(11_000, Number.NaN)).toBe(0);
  });
});

describe('calcAmountBreakdown', () => {
  it('税計算と按分計算をまとめて行う', () => {
    expect(
      calcAmountBreakdown({
        amount: 11_000,
        taxTreatment: TAX_TREATMENTS.INCLUSIVE,
        taxRate: TAX_10,
        allocationRate: 6_000,
      }),
    ).toEqual({
      taxExcluded: 10_000,
      taxAmount: 1_000,
      taxIncluded: 11_000,
      allocatedAmount: 6_600,
    });
  });

  it('按分は税抜額ではなく税込額に対して行う', () => {
    const result = calcAmountBreakdown({
      amount: 10_000,
      taxTreatment: TAX_TREATMENTS.EXCLUSIVE,
      taxRate: TAX_10,
      allocationRate: 5_000,
    });
    // 税込 11000 の 50% であって、税抜 10000 の 50% ではない
    expect(result.allocatedAmount).toBe(5_500);
  });

  it('非課税かつ按分ありでも計算できる', () => {
    expect(
      calcAmountBreakdown({
        amount: 5_000,
        taxTreatment: TAX_TREATMENTS.EXEMPT,
        taxRate: 0,
        allocationRate: 3_000,
      }),
    ).toEqual({
      taxExcluded: 5_000,
      taxAmount: 0,
      taxIncluded: 5_000,
      allocatedAmount: 1_500,
    });
  });
});

describe('率の変換', () => {
  it('ベーシスポイントとパーセントを相互に変換できる', () => {
    expect(rateToPercent(10_000)).toBe(100);
    expect(rateToPercent(1_000)).toBe(10);
    expect(rateToPercent(0)).toBe(0);
    expect(percentToRate(100)).toBe(10_000);
    expect(percentToRate(10)).toBe(1_000);
    expect(percentToRate(33.33)).toBe(3_333);
  });

  it('往復させても値が変わらない', () => {
    for (const rate of [0, 1, 800, 1_000, 3_333, 7_500, 10_000]) {
      expect(percentToRate(rateToPercent(rate))).toBe(rate);
    }
  });
});

describe('applyRounding', () => {
  it('既定は四捨五入', () => {
    expect(applyRounding(1.5)).toBe(2);
    expect(applyRounding(1.4)).toBe(1);
  });

  it('切り捨て・切り上げを指定できる', () => {
    expect(applyRounding(1.9, ROUNDING_MODES.FLOOR)).toBe(1);
    expect(applyRounding(1.1, ROUNDING_MODES.CEIL)).toBe(2);
  });
});
