import {
  ALLOCATION_DELEGATED_CELL,
  ATTACHMENT_NAME_SEPARATOR,
  EMPTY_CELL_PLACEHOLDER,
  type ExpenseExportRow,
} from '@shared/constants/export-columns';
import { UNCATEGORIZED_LABEL } from '@shared/constants/presets';
import type { Expense } from '@shared/types/expense';
import { formatDate, formatTaxRate, formatTaxTreatment } from '@shared/utils/format';
import { calcAmountBreakdown, rateToPercent } from '@shared/utils/money';

/** 経費 1 件を Excel の 1 行に変換する。 */
export const toExportRow = (expense: Expense): ExpenseExportRow => {
  const breakdown = calcAmountBreakdown(expense);
  // 「按分なし」は按分率 100% として保存しているが、これは按分を決めた結果ではなく
  // 税理士に委ねている状態。100% と全額をそのまま書くと按分済みと区別がつかないため、
  // 按分率・経費計上額のどちらも数値を出さない。
  const delegated = expense.allocationDelegated;

  return {
    expenseDate: formatDate(expense.expenseDate),
    accountCategoryName: expense.accountCategoryName ?? UNCATEGORIZED_LABEL,
    payeeName: expense.payeeName,
    description: expense.description,
    paymentMethodName: expense.paymentMethodName ?? EMPTY_CELL_PLACEHOLDER,
    taxTreatmentLabel: formatTaxTreatment(expense.taxTreatment),
    taxRateLabel: formatTaxRate(expense.taxTreatment, expense.taxRate),
    amountTaxIncluded: breakdown.taxIncluded,
    amountTaxExcluded: breakdown.taxExcluded,
    taxAmount: breakdown.taxAmount,
    allocationRatePercent: delegated
      ? ALLOCATION_DELEGATED_CELL
      : rateToPercent(expense.allocationRate),
    allocatedAmount: delegated ? ALLOCATION_DELEGATED_CELL : breakdown.allocatedAmount,
    attachmentNames: expense.attachments
      .map((attachment) => attachment.originalName)
      .join(ATTACHMENT_NAME_SEPARATOR),
    note: expense.note,
  };
};
