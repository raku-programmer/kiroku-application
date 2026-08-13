import { getDatabase } from '@main/db/connection';
import { nowIso } from '@main/utils/time';
import type { TaxTreatment } from '@shared/constants/tax';
import type { PayeeSuggestion } from '@shared/types/expense';

interface PayeeRow {
  id: number;
  name: string;
  use_count: number;
  last_used_at: string | null;
  last_account_category_id: number | null;
  last_payment_method_id: number | null;
  last_allocation_rate: number | null;
  last_tax_treatment: string | null;
  last_tax_rate: number | null;
  last_description: string | null;
}

const toSuggestion = (row: PayeeRow): PayeeSuggestion => ({
  id: row.id,
  name: row.name,
  useCount: row.use_count,
  lastUsedAt: row.last_used_at,
  lastAccountCategoryId: row.last_account_category_id,
  lastPaymentMethodId: row.last_payment_method_id,
  lastAllocationRate: row.last_allocation_rate,
  lastTaxTreatment: (row.last_tax_treatment as TaxTreatment | null) ?? null,
  lastTaxRate: row.last_tax_rate,
  lastDescription: row.last_description,
});

const SELECT_COLUMNS = `
  id, name, use_count, last_used_at, last_account_category_id, last_payment_method_id,
  last_allocation_rate, last_tax_treatment, last_tax_rate, last_description
`;

/** よく使う順に全件返す（一覧画面の絞り込み用） */
export const listPayees = (): PayeeSuggestion[] =>
  getDatabase()
    .prepare<[], PayeeRow>(
      `SELECT ${SELECT_COLUMNS} FROM payees ORDER BY use_count DESC, last_used_at DESC, name ASC`,
    )
    .all()
    .map(toSuggestion);

/** 入力アシスト：前方一致 → 部分一致の順で候補を返す */
export const suggestPayees = (query: string, limit: number): PayeeSuggestion[] => {
  const trimmed = query.trim();
  if (trimmed.length === 0) {
    return getDatabase()
      .prepare<[number], PayeeRow>(
        `SELECT ${SELECT_COLUMNS} FROM payees
          ORDER BY use_count DESC, last_used_at DESC, name ASC
          LIMIT ?`,
      )
      .all(limit)
      .map(toSuggestion);
  }

  const escaped = trimmed.replace(/[%_\\]/g, (match) => `\\${match}`);
  return getDatabase()
    .prepare<[string, string, string, number], PayeeRow>(
      `SELECT ${SELECT_COLUMNS} FROM payees
        WHERE name LIKE ? ESCAPE '\\'
        ORDER BY
          CASE WHEN name = ? THEN 0 WHEN name LIKE ? ESCAPE '\\' THEN 1 ELSE 2 END,
          use_count DESC, last_used_at DESC, name ASC
        LIMIT ?`,
    )
    .all(`%${escaped}%`, trimmed, `${escaped}%`, limit)
    .map(toSuggestion);
};

export const findPayeeByName = (name: string): PayeeSuggestion | null => {
  const row = getDatabase()
    .prepare<[string], PayeeRow>(`SELECT ${SELECT_COLUMNS} FROM payees WHERE name = ?`)
    .get(name);
  return row ? toSuggestion(row) : null;
};

/** 請求元を取得（無ければ作成）して id を返す。 */
export const ensurePayee = (name: string): number => {
  const existing = findPayeeByName(name);
  if (existing) {
    return existing.id;
  }
  const timestamp = nowIso();
  const result = getDatabase()
    .prepare(`INSERT INTO payees (name, use_count, created_at, updated_at) VALUES (?, 0, ?, ?)`)
    .run(name, timestamp, timestamp);
  return Number(result.lastInsertRowid);
};

export interface PayeeMemory {
  accountCategoryId: number | null;
  paymentMethodId: number | null;
  allocationRate: number;
  taxTreatment: TaxTreatment;
  taxRate: number;
  description: string;
}

/**
 * 「キロク」：直近の入力内容を請求元に記憶し、使用回数を加算する。
 * 次回同じ請求元を選んだときの自動補完に使う。
 */
export const rememberPayeeUsage = (payeeId: number, memory: PayeeMemory): void => {
  const timestamp = nowIso();
  getDatabase()
    .prepare(
      `UPDATE payees
          SET last_account_category_id = ?,
              last_payment_method_id = ?,
              last_allocation_rate = ?,
              last_tax_treatment = ?,
              last_tax_rate = ?,
              last_description = ?,
              use_count = use_count + 1,
              last_used_at = ?,
              updated_at = ?
        WHERE id = ?`,
    )
    .run(
      memory.accountCategoryId,
      memory.paymentMethodId,
      memory.allocationRate,
      memory.taxTreatment,
      memory.taxRate,
      memory.description,
      timestamp,
      timestamp,
      payeeId,
    );
};

/** 請求元で過去に使った「内容」を、よく使う順に返す。 */
export const listDescriptionsByPayee = (payeeId: number, limit: number): string[] =>
  getDatabase()
    .prepare<[number, number], { description: string }>(
      `SELECT description, COUNT(*) AS usage_count, MAX(expense_date) AS latest
         FROM expenses
        WHERE payee_id = ? AND description <> ''
        GROUP BY description
        ORDER BY usage_count DESC, latest DESC
        LIMIT ?`,
    )
    .all(payeeId, limit)
    .map((row) => row.description);

/** どの経費からも参照されなくなった請求元を削除する。 */
export const deleteOrphanPayees = (): void => {
  getDatabase()
    .prepare(
      `DELETE FROM payees
        WHERE id NOT IN (SELECT DISTINCT payee_id FROM expenses)`,
    )
    .run();
};
