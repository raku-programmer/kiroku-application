import { getDatabase } from '@main/db/connection';
import { nowIso } from '@main/utils/time';
import { SEED_ACCOUNT_CATEGORIES, SEED_PAYMENT_METHODS } from '@shared/constants/presets';

const countRows = (table: string): number => {
  const row = getDatabase()
    .prepare<[], { count: number }>(`SELECT COUNT(*) AS count FROM ${table}`)
    .get();
  return row?.count ?? 0;
};

/**
 * プリセットが 1 件も無い場合のみ初期データを投入する。
 * ユーザーが全件削除した状態を復活させないよう、起動のたびには入れ直さない。
 */
export const seedPresetsIfEmpty = (): void => {
  const db = getDatabase();
  const timestamp = nowIso();

  if (countRows('account_categories') === 0) {
    const statement = db.prepare(
      `INSERT INTO account_categories
        (name, display_order, default_allocation_rate, is_active, created_at, updated_at)
       VALUES (?, ?, ?, 1, ?, ?)`,
    );
    db.transaction(() => {
      SEED_ACCOUNT_CATEGORIES.forEach((category, index) => {
        statement.run(
          category.name,
          index + 1,
          category.defaultAllocationRate,
          timestamp,
          timestamp,
        );
      });
    })();
  }

  if (countRows('payment_methods') === 0) {
    const statement = db.prepare(
      `INSERT INTO payment_methods (name, display_order, is_active, created_at, updated_at)
       VALUES (?, ?, 1, ?, ?)`,
    );
    db.transaction(() => {
      SEED_PAYMENT_METHODS.forEach((name, index) => {
        statement.run(name, index + 1, timestamp, timestamp);
      });
    })();
  }
};
