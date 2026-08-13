import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { getDatabasePath } from '@main/config/paths';
import { runMigrations } from '@main/db/migrations';

/** 接続時に適用する PRAGMA（外部キー制約は別途タイミングを分けて設定する） */
const PRAGMAS: readonly string[] = ['journal_mode = WAL', 'busy_timeout = 5000'];

let connection: Database.Database | null = null;

const applyPragmas = (db: Database.Database): void => {
  for (const pragma of PRAGMAS) {
    db.pragma(pragma);
  }
};

export const openDatabase = (): Database.Database => {
  if (connection) {
    return connection;
  }
  const databasePath = getDatabasePath();
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });

  const db = new Database(databasePath);
  applyPragmas(db);

  // マイグレーションはテーブルの作り直しを伴うことがある。外部キー制約を ON にしたまま
  // 親テーブルを DROP すると、CASCADE 指定が誤って発火し子テーブルの行が丸ごと消えうる
  // （例：expenses を作り直す際に attachments が巻き添えで消える）。
  // SQLite 公式が推奨する手順どおり、トランザクションの外側で OFF → 移行 → ON の順にする。
  db.pragma('foreign_keys = OFF');
  runMigrations(db);
  db.pragma('foreign_keys = ON');
  const violations = db.pragma('foreign_key_check') as unknown[];
  if (violations.length > 0) {
    throw new Error(
      `マイグレーション後に外部キー制約の不整合が見つかりました（${violations.length} 件）。`,
    );
  }

  connection = db;
  return db;
};

export const getDatabase = (): Database.Database => {
  if (!connection) {
    return openDatabase();
  }
  return connection;
};

export const closeDatabase = (): void => {
  if (connection) {
    connection.close();
    connection = null;
  }
};

/**
 * 復元後などに接続を張り直す。
 * ファイルを差し替える前に必ず close する必要がある。
 */
export const reopenDatabase = (): Database.Database => {
  closeDatabase();
  return openDatabase();
};

export type AppDatabase = Database.Database;
