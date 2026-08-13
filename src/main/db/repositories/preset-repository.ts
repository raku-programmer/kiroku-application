import { getDatabase } from '@main/db/connection';
import { AppException, notFoundError } from '@main/errors';
import { nowIso } from '@main/utils/time';
import { ERROR_CODES } from '@shared/constants/error-codes';
import type {
  AccountCategory,
  AccountCategoryInput,
  PaymentMethod,
  PaymentMethodInput,
  PresetBundle,
} from '@shared/types/preset';

interface AccountCategoryRow {
  id: number;
  name: string;
  display_order: number;
  default_allocation_rate: number | null;
  is_active: number;
}

interface PaymentMethodRow {
  id: number;
  name: string;
  display_order: number;
  is_active: number;
}

const toAccountCategory = (row: AccountCategoryRow): AccountCategory => ({
  id: row.id,
  name: row.name,
  displayOrder: row.display_order,
  defaultAllocationRate: row.default_allocation_rate,
  isActive: row.is_active === 1,
});

const toPaymentMethod = (row: PaymentMethodRow): PaymentMethod => ({
  id: row.id,
  name: row.name,
  displayOrder: row.display_order,
  isActive: row.is_active === 1,
});

const nextDisplayOrder = (table: string): number => {
  const row = getDatabase()
    .prepare<[], { next: number }>(
      `SELECT COALESCE(MAX(display_order), 0) + 1 AS next FROM ${table}`,
    )
    .get();
  return row?.next ?? 1;
};

const duplicatedError = (name: string): AppException =>
  new AppException(ERROR_CODES.DUPLICATED, `「${name}」は既に登録されています。`);

export const listAccountCategories = (): AccountCategory[] =>
  getDatabase()
    .prepare<[], AccountCategoryRow>(
      `SELECT id, name, display_order, default_allocation_rate, is_active
         FROM account_categories
        ORDER BY display_order ASC, id ASC`,
    )
    .all()
    .map(toAccountCategory);

export const listPaymentMethods = (): PaymentMethod[] =>
  getDatabase()
    .prepare<[], PaymentMethodRow>(
      `SELECT id, name, display_order, is_active
         FROM payment_methods
        ORDER BY display_order ASC, id ASC`,
    )
    .all()
    .map(toPaymentMethod);

export const listPresets = (): PresetBundle => ({
  accountCategories: listAccountCategories(),
  paymentMethods: listPaymentMethods(),
});

export const findAccountCategory = (id: number): AccountCategory | null => {
  const row = getDatabase()
    .prepare<[number], AccountCategoryRow>(
      `SELECT id, name, display_order, default_allocation_rate, is_active
         FROM account_categories WHERE id = ?`,
    )
    .get(id);
  return row ? toAccountCategory(row) : null;
};

export const findPaymentMethod = (id: number): PaymentMethod | null => {
  const row = getDatabase()
    .prepare<[number], PaymentMethodRow>(
      `SELECT id, name, display_order, is_active FROM payment_methods WHERE id = ?`,
    )
    .get(id);
  return row ? toPaymentMethod(row) : null;
};

const nameExists = (table: string, name: string, excludeId: number | null): boolean => {
  const row = getDatabase()
    .prepare<[string, number], { count: number }>(
      `SELECT COUNT(*) AS count FROM ${table} WHERE name = ? AND id <> ?`,
    )
    .get(name, excludeId ?? -1);
  return (row?.count ?? 0) > 0;
};

export const createAccountCategory = (input: AccountCategoryInput): AccountCategory => {
  if (nameExists('account_categories', input.name, null)) {
    throw duplicatedError(input.name);
  }
  const timestamp = nowIso();
  const result = getDatabase()
    .prepare(
      `INSERT INTO account_categories
        (name, display_order, default_allocation_rate, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.name,
      nextDisplayOrder('account_categories'),
      input.defaultAllocationRate,
      input.isActive ? 1 : 0,
      timestamp,
      timestamp,
    );
  const created = findAccountCategory(Number(result.lastInsertRowid));
  if (!created) {
    throw notFoundError('作成した勘定科目を取得できませんでした。');
  }
  return created;
};

export const updateAccountCategory = (
  id: number,
  input: AccountCategoryInput,
): AccountCategory => {
  if (!findAccountCategory(id)) {
    throw notFoundError('対象の勘定科目が見つかりません。');
  }
  if (nameExists('account_categories', input.name, id)) {
    throw duplicatedError(input.name);
  }
  getDatabase()
    .prepare(
      `UPDATE account_categories
          SET name = ?, default_allocation_rate = ?, is_active = ?, updated_at = ?
        WHERE id = ?`,
    )
    .run(input.name, input.defaultAllocationRate, input.isActive ? 1 : 0, nowIso(), id);
  const updated = findAccountCategory(id);
  if (!updated) {
    throw notFoundError('更新した勘定科目を取得できませんでした。');
  }
  return updated;
};

const countExpensesByColumn = (column: string, id: number): number => {
  const row = getDatabase()
    .prepare<[number], { count: number }>(
      `SELECT COUNT(*) AS count FROM expenses WHERE ${column} = ?`,
    )
    .get(id);
  return row?.count ?? 0;
};

export const deleteAccountCategory = (id: number): void => {
  if (!findAccountCategory(id)) {
    throw notFoundError('対象の勘定科目が見つかりません。');
  }
  if (countExpensesByColumn('account_category_id', id) > 0) {
    throw new AppException(
      ERROR_CODES.IN_USE,
      '使用中の勘定科目は削除できません。無効化してください。',
    );
  }
  getDatabase().prepare(`DELETE FROM account_categories WHERE id = ?`).run(id);
};

export const createPaymentMethod = (input: PaymentMethodInput): PaymentMethod => {
  if (nameExists('payment_methods', input.name, null)) {
    throw duplicatedError(input.name);
  }
  const timestamp = nowIso();
  const result = getDatabase()
    .prepare(
      `INSERT INTO payment_methods (name, display_order, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(
      input.name,
      nextDisplayOrder('payment_methods'),
      input.isActive ? 1 : 0,
      timestamp,
      timestamp,
    );
  const created = findPaymentMethod(Number(result.lastInsertRowid));
  if (!created) {
    throw notFoundError('作成した支払方法を取得できませんでした。');
  }
  return created;
};

export const updatePaymentMethod = (
  id: number,
  input: PaymentMethodInput,
): PaymentMethod => {
  if (!findPaymentMethod(id)) {
    throw notFoundError('対象の支払方法が見つかりません。');
  }
  if (nameExists('payment_methods', input.name, id)) {
    throw duplicatedError(input.name);
  }
  getDatabase()
    .prepare(
      `UPDATE payment_methods SET name = ?, is_active = ?, updated_at = ? WHERE id = ?`,
    )
    .run(input.name, input.isActive ? 1 : 0, nowIso(), id);
  const updated = findPaymentMethod(id);
  if (!updated) {
    throw notFoundError('更新した支払方法を取得できませんでした。');
  }
  return updated;
};

export const deletePaymentMethod = (id: number): void => {
  if (!findPaymentMethod(id)) {
    throw notFoundError('対象の支払方法が見つかりません。');
  }
  if (countExpensesByColumn('payment_method_id', id) > 0) {
    throw new AppException(
      ERROR_CODES.IN_USE,
      '使用中の支払方法は削除できません。無効化してください。',
    );
  }
  getDatabase().prepare(`DELETE FROM payment_methods WHERE id = ?`).run(id);
};

const reorder = (table: string, ids: number[]): void => {
  const db = getDatabase();
  const statement = db.prepare(
    `UPDATE ${table} SET display_order = ?, updated_at = ? WHERE id = ?`,
  );
  const timestamp = nowIso();
  const apply = db.transaction((orderedIds: number[]) => {
    orderedIds.forEach((id, index) => {
      statement.run(index + 1, timestamp, id);
    });
  });
  apply(ids);
};

export const reorderAccountCategories = (ids: number[]): AccountCategory[] => {
  reorder('account_categories', ids);
  return listAccountCategories();
};

export const reorderPaymentMethods = (ids: number[]): PaymentMethod[] => {
  reorder('payment_methods', ids);
  return listPaymentMethods();
};
