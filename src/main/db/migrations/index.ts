import type Database from 'better-sqlite3';
import { migration001Init } from '@main/db/migrations/001-init';
import { migration002NullableAccountCategory } from '@main/db/migrations/002-nullable-account-category';
import { migration003AllocationDelegated } from '@main/db/migrations/003-allocation-delegated';
import type { Migration } from '@main/db/migrations/types';

/** 適用順に並べる。新しいマイグレーションは末尾に追加する。 */
const MIGRATIONS: readonly Migration[] = [
  migration001Init,
  migration002NullableAccountCategory,
  migration003AllocationDelegated,
];

const getUserVersion = (db: Database.Database): number => {
  const row = db.pragma('user_version', { simple: true });
  return typeof row === 'number' ? row : 0;
};

/** 未適用のマイグレーションをトランザクション内で順に適用する。 */
export const runMigrations = (db: Database.Database): void => {
  const currentVersion = getUserVersion(db);

  for (const migration of MIGRATIONS) {
    if (migration.version <= currentVersion) {
      continue;
    }
    const apply = db.transaction(() => {
      migration.up(db);
      db.pragma(`user_version = ${migration.version}`);
    });
    apply();
  }
};

export const getLatestSchemaVersion = (): number =>
  MIGRATIONS.reduce((max, migration) => Math.max(max, migration.version), 0);
