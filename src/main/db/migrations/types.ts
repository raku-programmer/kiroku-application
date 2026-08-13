import type Database from 'better-sqlite3';

export interface Migration {
  /** 1 から始まる連番。PRAGMA user_version に記録する。 */
  version: number;
  name: string;
  up: (db: Database.Database) => void;
}
