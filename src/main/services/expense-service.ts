import { getDatabase } from '@main/db/connection';
import {
  deleteExpense,
  findExpense,
  insertExpense,
  listExpenses,
  updateExpense,
  type ExpenseRecord,
} from '@main/db/repositories/expense-repository';
import {
  deleteOrphanPayees,
  ensurePayee,
  rememberPayeeUsage,
} from '@main/db/repositories/payee-repository';
import { notFoundError } from '@main/errors';
import { removeAttachmentFiles, syncAttachments } from '@main/services/attachment-service';
import { validateExpenseInput } from '@main/services/expense-validator';
import { UNCATEGORIZED_LABEL } from '@shared/constants/presets';
import type {
  CategorySummary,
  Expense,
  ExpenseFilter,
  ExpenseInput,
  ExpenseListResult,
  ExpenseSummary,
} from '@shared/types/expense';
import { calcAmountBreakdown } from '@shared/utils/money';

const toRecord = (
  input: ReturnType<typeof validateExpenseInput>,
  payeeId: number,
): ExpenseRecord => ({
  expenseDate: input.expenseDate,
  accountCategoryId: input.accountCategoryId,
  payeeId,
  amount: input.amount,
  taxTreatment: input.taxTreatment,
  taxRate: input.taxRate,
  paymentMethodId: input.paymentMethodId,
  allocationRate: input.allocationRate,
  allocationDelegated: input.allocationDelegated,
  description: input.description,
  note: input.note,
});

/** 一覧の合計と勘定科目別小計を計算する。 */
export const summarize = (expenses: Expense[]): ExpenseSummary => {
  // 勘定科目が未設定の経費も 1 つのグループ（キー null）にまとめる
  const byCategory = new Map<number | null, CategorySummary>();
  let totalTaxIncluded = 0;
  let totalTaxExcluded = 0;
  let totalTax = 0;
  let totalAllocated = 0;

  for (const expense of expenses) {
    const breakdown = calcAmountBreakdown(expense);
    totalTaxIncluded += breakdown.taxIncluded;
    totalTaxExcluded += breakdown.taxExcluded;
    totalTax += breakdown.taxAmount;
    totalAllocated += breakdown.allocatedAmount;

    const current = byCategory.get(expense.accountCategoryId);
    if (current) {
      current.count += 1;
      current.totalAmount += breakdown.taxIncluded;
      current.totalAllocatedAmount += breakdown.allocatedAmount;
    } else {
      byCategory.set(expense.accountCategoryId, {
        accountCategoryId: expense.accountCategoryId,
        accountCategoryName: expense.accountCategoryName ?? UNCATEGORIZED_LABEL,
        count: 1,
        totalAmount: breakdown.taxIncluded,
        totalAllocatedAmount: breakdown.allocatedAmount,
      });
    }
  }

  return {
    count: expenses.length,
    totalTaxIncluded,
    totalTaxExcluded,
    totalTax,
    totalAllocated,
    byCategory: [...byCategory.values()].sort(
      (a, b) => b.totalAllocatedAmount - a.totalAllocatedAmount,
    ),
  };
};

export const getExpenseList = (filter: ExpenseFilter): ExpenseListResult => {
  const expenses = listExpenses(filter);
  return { expenses, summary: summarize(expenses) };
};

export const getExpense = (id: number): Expense => {
  const expense = findExpense(id);
  if (!expense) {
    throw notFoundError('対象の経費が見つかりません。');
  }
  return expense;
};

/** 「キロク」：保存内容を請求元に記憶させ、次回入力の自動補完に使う。 */
const rememberUsage = (
  payeeId: number,
  input: ReturnType<typeof validateExpenseInput>,
): void => {
  rememberPayeeUsage(payeeId, {
    accountCategoryId: input.accountCategoryId,
    paymentMethodId: input.paymentMethodId,
    allocationRate: input.allocationRate,
    taxTreatment: input.taxTreatment,
    taxRate: input.taxRate,
    description: input.description,
  });
};

export const createExpense = async (rawInput: ExpenseInput): Promise<Expense> => {
  const input = validateExpenseInput(rawInput);
  const db = getDatabase();

  const expenseId = db.transaction(() => {
    const payeeId = ensurePayee(input.payeeName);
    const id = insertExpense(toRecord(input, payeeId));
    rememberUsage(payeeId, input);
    return id;
  })();

  await syncAttachments(expenseId, input.expenseDate, input.attachments);
  return getExpense(expenseId);
};

export const modifyExpense = async (
  id: number,
  rawInput: ExpenseInput,
): Promise<Expense> => {
  if (!findExpense(id)) {
    throw notFoundError('対象の経費が見つかりません。');
  }
  const input = validateExpenseInput(rawInput);
  const db = getDatabase();

  db.transaction(() => {
    const payeeId = ensurePayee(input.payeeName);
    updateExpense(id, toRecord(input, payeeId));
    rememberUsage(payeeId, input);
    deleteOrphanPayees();
  })();

  await syncAttachments(id, input.expenseDate, input.attachments);
  return getExpense(id);
};

export const removeExpense = async (id: number): Promise<void> => {
  const expense = findExpense(id);
  if (!expense) {
    throw notFoundError('対象の経費が見つかりません。');
  }

  getDatabase().transaction(() => {
    // attachments テーブルは ON DELETE CASCADE で消える
    deleteExpense(id);
    deleteOrphanPayees();
  })();

  await removeAttachmentFiles(expense.attachments);
};
