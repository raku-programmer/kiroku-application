import { describe, expect, it } from 'vitest';
import { ALLOCATION_DELEGATED_CELL } from '@shared/constants/export-columns';
import { NO_ALLOCATION_RATE, TAX_TREATMENTS } from '@shared/constants/tax';
import type { Expense } from '@shared/types/expense';
import { toExportRow } from '@shared/utils/export-row';

/**
 * Excel は税理士がそのまま読む成果物なので、
 * 「按分済みで 100%」と「按分をこれから決める」を取り違えられないことを守る。
 */

const baseExpense: Expense = {
  id: 1,
  expenseDate: '2026-08-16',
  accountCategoryId: 1,
  accountCategoryName: '旅費交通費',
  payeeId: 1,
  payeeName: '〇〇株式会社',
  amount: 11_000,
  taxTreatment: TAX_TREATMENTS.INCLUSIVE,
  taxRate: 1_000,
  paymentMethodId: null,
  paymentMethodName: null,
  allocationRate: 6_000,
  allocationDelegated: false,
  description: '打ち合わせの交通費',
  note: '',
  attachments: [],
  createdAt: '2026-08-16T00:00:00.000Z',
  updatedAt: '2026-08-16T00:00:00.000Z',
};

describe('toExportRow', () => {
  it('按分ありは按分率と経費計上額を数値で出す', () => {
    const row = toExportRow(baseExpense);
    expect(row.allocationRatePercent).toBe(60);
    expect(row.allocatedAmount).toBe(6_600);
  });

  it('按分なしは按分率も経費計上額も数値を出さない', () => {
    const row = toExportRow({
      ...baseExpense,
      // 「按分なし」は 100% として保存される。この値をそのまま出さないことが要件
      allocationRate: NO_ALLOCATION_RATE,
      allocationDelegated: true,
    });
    expect(row.allocationRatePercent).toBe(ALLOCATION_DELEGATED_CELL);
    expect(row.allocatedAmount).toBe(ALLOCATION_DELEGATED_CELL);
  });

  it('按分なしでも金額・税額はそのまま出す', () => {
    const row = toExportRow({
      ...baseExpense,
      allocationRate: NO_ALLOCATION_RATE,
      allocationDelegated: true,
    });
    expect(row.amountTaxIncluded).toBe(11_000);
    expect(row.amountTaxExcluded).toBe(10_000);
    expect(row.taxAmount).toBe(1_000);
  });

  it('按分率 100% でも按分なしでなければ数値のまま', () => {
    const row = toExportRow({ ...baseExpense, allocationRate: NO_ALLOCATION_RATE });
    expect(row.allocationRatePercent).toBe(100);
    expect(row.allocatedAmount).toBe(11_000);
  });
});
