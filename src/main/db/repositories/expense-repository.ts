import { getDatabase } from '@main/db/connection';
import { listAttachmentsByExpense, listAttachmentsByExpenses } from '@main/db/repositories/attachment-repository';
import { nowIso } from '@main/utils/time';
import type { TaxTreatment } from '@shared/constants/tax';
import type { Expense, ExpenseFilter } from '@shared/types/expense';
import type { YearRange } from '@shared/types/api';
import { toDateRange } from '@shared/utils/period';

interface ExpenseRow {
  id: number;
  expense_date: string;
  account_category_id: number | null;
  account_category_name: string | null;
  payee_id: number;
  payee_name: string;
  amount: number;
  tax_treatment: string;
  tax_rate: number;
  payment_method_id: number | null;
  payment_method_name: string | null;
  allocation_rate: number;
  allocation_delegated: number;
  description: string;
  note: string;
  created_at: string;
  updated_at: string;
}

const SELECT_BASE = `
  SELECT e.id,
         e.expense_date,
         e.account_category_id,
         c.name AS account_category_name,
         e.payee_id,
         p.name AS payee_name,
         e.amount,
         e.tax_treatment,
         e.tax_rate,
         e.payment_method_id,
         m.name AS payment_method_name,
         e.allocation_rate,
         e.allocation_delegated,
         e.description,
         e.note,
         e.created_at,
         e.updated_at
    FROM expenses e
    LEFT JOIN account_categories c ON c.id = e.account_category_id
    JOIN payees p ON p.id = e.payee_id
    LEFT JOIN payment_methods m ON m.id = e.payment_method_id
`;

const toExpense = (row: ExpenseRow, attachments: Expense['attachments']): Expense => ({
  id: row.id,
  expenseDate: row.expense_date,
  accountCategoryId: row.account_category_id,
  accountCategoryName: row.account_category_name,
  payeeId: row.payee_id,
  payeeName: row.payee_name,
  amount: row.amount,
  taxTreatment: row.tax_treatment as TaxTreatment,
  taxRate: row.tax_rate,
  paymentMethodId: row.payment_method_id,
  paymentMethodName: row.payment_method_name,
  allocationRate: row.allocation_rate,
  allocationDelegated: row.allocation_delegated === 1,
  description: row.description,
  note: row.note,
  attachments,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const findExpense = (id: number): Expense | null => {
  const row = getDatabase()
    .prepare<[number], ExpenseRow>(`${SELECT_BASE} WHERE e.id = ?`)
    .get(id);
  return row ? toExpense(row, listAttachmentsByExpense(id)) : null;
};

/** 絞り込み条件に一致する経費を日付昇順で返す。 */
export const listExpenses = (filter: ExpenseFilter): Expense[] => {
  const range = toDateRange(filter.period);
  const conditions: string[] = ['e.expense_date BETWEEN ? AND ?'];
  const params: (string | number)[] = [range.start, range.end];

  if (filter.accountCategoryId != null) {
    conditions.push('e.account_category_id = ?');
    params.push(filter.accountCategoryId);
  }
  if (filter.payeeId != null) {
    conditions.push('e.payee_id = ?');
    params.push(filter.payeeId);
  }
  if (filter.hasAttachment != null) {
    // 添付は 1 件でもあれば「あり」。件数は数えず存在の有無だけを見る
    const exists = `EXISTS (SELECT 1 FROM attachments a WHERE a.expense_id = e.id)`;
    conditions.push(filter.hasAttachment ? exists : `NOT ${exists}`);
  }
  const keyword = filter.keyword.trim();
  if (keyword.length > 0) {
    const escaped = keyword.replace(/[%_\\]/g, (match) => `\\${match}`);
    const pattern = `%${escaped}%`;
    conditions.push(
      `(e.description LIKE ? ESCAPE '\\' OR e.note LIKE ? ESCAPE '\\' OR p.name LIKE ? ESCAPE '\\')`,
    );
    params.push(pattern, pattern, pattern);
  }

  const rows = getDatabase()
    .prepare<(string | number)[], ExpenseRow>(
      `${SELECT_BASE} WHERE ${conditions.join(' AND ')} ORDER BY e.expense_date ASC, e.id ASC`,
    )
    .all(...params);

  const attachmentsByExpense = listAttachmentsByExpenses(rows.map((row) => row.id));
  return rows.map((row) => toExpense(row, attachmentsByExpense.get(row.id) ?? []));
};

export interface ExpenseRecord {
  expenseDate: string;
  accountCategoryId: number | null;
  payeeId: number;
  amount: number;
  taxTreatment: TaxTreatment;
  taxRate: number;
  paymentMethodId: number | null;
  allocationRate: number;
  allocationDelegated: boolean;
  description: string;
  note: string;
}

export const insertExpense = (record: ExpenseRecord): number => {
  const timestamp = nowIso();
  const result = getDatabase()
    .prepare(
      `INSERT INTO expenses
        (expense_date, account_category_id, payee_id, amount, tax_treatment, tax_rate,
         payment_method_id, allocation_rate, allocation_delegated, description, note,
         created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      record.expenseDate,
      record.accountCategoryId,
      record.payeeId,
      record.amount,
      record.taxTreatment,
      record.taxRate,
      record.paymentMethodId,
      record.allocationRate,
      record.allocationDelegated ? 1 : 0,
      record.description,
      record.note,
      timestamp,
      timestamp,
    );
  return Number(result.lastInsertRowid);
};

export const updateExpense = (id: number, record: ExpenseRecord): void => {
  getDatabase()
    .prepare(
      `UPDATE expenses
          SET expense_date = ?, account_category_id = ?, payee_id = ?, amount = ?,
              tax_treatment = ?, tax_rate = ?, payment_method_id = ?, allocation_rate = ?,
              allocation_delegated = ?, description = ?, note = ?, updated_at = ?
        WHERE id = ?`,
    )
    .run(
      record.expenseDate,
      record.accountCategoryId,
      record.payeeId,
      record.amount,
      record.taxTreatment,
      record.taxRate,
      record.paymentMethodId,
      record.allocationRate,
      record.allocationDelegated ? 1 : 0,
      record.description,
      record.note,
      nowIso(),
      id,
    );
};

export const deleteExpense = (id: number): void => {
  getDatabase().prepare(`DELETE FROM expenses WHERE id = ?`).run(id);
};

/** 登録済みの経費が存在する年の範囲 */
export const getYearRange = (): YearRange => {
  const row = getDatabase()
    .prepare<[], { oldest: string | null; newest: string | null }>(
      `SELECT MIN(expense_date) AS oldest, MAX(expense_date) AS newest FROM expenses`,
    )
    .get();
  return {
    oldest: row?.oldest ? Number(row.oldest.slice(0, 4)) : null,
    newest: row?.newest ? Number(row.newest.slice(0, 4)) : null,
  };
};
