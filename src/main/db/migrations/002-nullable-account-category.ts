import type { Migration } from '@main/db/migrations/types';

/**
 * 勘定科目を未入力のまま経費を登録できるようにする。
 * （税理士に確定申告を依頼する際、判断がつかない項目を安易に選ばせないため）
 *
 * SQLite は列の NOT NULL 制約を直接外せないため、テーブルを作り直して移行する。
 * このマイグレーションは runMigrations 実行前後で外部キー制約を一時的に OFF にする
 * 前提で書いている（connection.ts 参照）。ON のまま DROP TABLE すると、
 * attachments の ON DELETE CASCADE が誤って発火し、添付の行ごと消えてしまう。
 */
export const migration002NullableAccountCategory: Migration = {
  version: 2,
  name: 'nullable-account-category',
  up: (db) => {
    db.exec(`
      CREATE TABLE expenses_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        expense_date TEXT NOT NULL,
        account_category_id INTEGER REFERENCES account_categories(id) ON DELETE RESTRICT,
        payee_id INTEGER NOT NULL REFERENCES payees(id) ON DELETE RESTRICT,
        amount INTEGER NOT NULL,
        tax_treatment TEXT NOT NULL,
        tax_rate INTEGER NOT NULL DEFAULT 0,
        payment_method_id INTEGER REFERENCES payment_methods(id) ON DELETE SET NULL,
        allocation_rate INTEGER NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        note TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      INSERT INTO expenses_new
        (id, expense_date, account_category_id, payee_id, amount, tax_treatment, tax_rate,
         payment_method_id, allocation_rate, description, note, created_at, updated_at)
      SELECT id, expense_date, account_category_id, payee_id, amount, tax_treatment, tax_rate,
             payment_method_id, allocation_rate, description, note, created_at, updated_at
        FROM expenses;

      DROP TABLE expenses;
      ALTER TABLE expenses_new RENAME TO expenses;

      CREATE INDEX idx_expenses_date ON expenses(expense_date);
      CREATE INDEX idx_expenses_account_category ON expenses(account_category_id);
      CREATE INDEX idx_expenses_payee ON expenses(payee_id);
    `);
  },
};
