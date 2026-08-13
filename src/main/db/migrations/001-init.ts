import type { Migration } from '@main/db/migrations/types';

/**
 * 初期スキーマ。
 * 金額は整数（円）、率は整数のベーシスポイント（10000 = 100%）で保持する。
 */
export const migration001Init: Migration = {
  version: 1,
  name: 'init',
  up: (db) => {
    db.exec(`
      CREATE TABLE account_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        display_order INTEGER NOT NULL DEFAULT 0,
        default_allocation_rate INTEGER,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE payment_methods (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        display_order INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE payees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        last_account_category_id INTEGER REFERENCES account_categories(id) ON DELETE SET NULL,
        last_payment_method_id INTEGER REFERENCES payment_methods(id) ON DELETE SET NULL,
        last_allocation_rate INTEGER,
        last_tax_treatment TEXT,
        last_tax_rate INTEGER,
        last_description TEXT,
        use_count INTEGER NOT NULL DEFAULT 0,
        last_used_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        expense_date TEXT NOT NULL,
        account_category_id INTEGER NOT NULL REFERENCES account_categories(id) ON DELETE RESTRICT,
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

      CREATE INDEX idx_expenses_date ON expenses(expense_date);
      CREATE INDEX idx_expenses_account_category ON expenses(account_category_id);
      CREATE INDEX idx_expenses_payee ON expenses(payee_id);

      CREATE TABLE attachments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        expense_id INTEGER NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
        original_name TEXT NOT NULL,
        stored_path TEXT NOT NULL,
        mime_type TEXT,
        byte_size INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );

      CREATE INDEX idx_attachments_expense ON attachments(expense_id);

      CREATE TABLE settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
  },
};
