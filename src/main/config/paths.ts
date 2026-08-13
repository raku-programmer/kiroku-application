import { app } from 'electron';
import path from 'node:path';

/** アプリが使用するファイル・ディレクトリ名の定義（直書き禁止のためここへ集約）。 */
const NAMES = {
  databaseFile: 'kiroku.db',
  attachmentsDir: 'attachments',
  /** クリップボードから貼り付けた画像を一時的に置く場所（OS の temp 配下） */
  clipboardTempDir: 'kiroku-clipboard',
  backupsDir: 'backups',
  backupPrefix: 'kiroku-',
  backupDatabaseFile: 'kiroku.db',
  backupAttachmentsDir: 'attachments',
  backupMetadataFile: 'backup.json',
  restoreSafetyPrefix: 'before-restore-',
} as const;

export const FILE_NAMES = NAMES;

export const getUserDataDirectory = (): string => app.getPath('userData');

export const getDatabasePath = (): string =>
  path.join(getUserDataDirectory(), NAMES.databaseFile);

export const getAttachmentsDirectory = (): string =>
  path.join(getUserDataDirectory(), NAMES.attachmentsDir);

/** 既定のバックアップ先（設定で上書き可能） */
export const getDefaultBackupDirectory = (): string =>
  path.join(getUserDataDirectory(), NAMES.backupsDir);

/** Excel の既定保存先 */
export const getDefaultExportDirectory = (): string => app.getPath('documents');

/** 領収書の既定の取り込み元（設定で上書き可能） */
export const getDefaultImportDirectory = (): string => app.getPath('pictures');

/**
 * クリップボードから貼り付けた画像を一時的に置く場所。
 * 添付せずに閉じた分が残らないよう、起動時にまとめて削除する。
 */
export const getClipboardTempDirectory = (): string =>
  path.join(app.getPath('temp'), NAMES.clipboardTempDir);

/** 経費日付から添付の保存先サブディレクトリを決める（YYYY/MM） */
export const buildAttachmentSubDirectory = (expenseDate: string): string => {
  const [year, month] = expenseDate.split('-');
  return path.join(getAttachmentsDirectory(), year, month);
};

export const buildBackupDirectoryName = (timestamp: string): string =>
  `${NAMES.backupPrefix}${timestamp}`;

export const buildRestoreSafetyDirectoryName = (timestamp: string): string =>
  `${NAMES.restoreSafetyPrefix}${timestamp}`;

export const isBackupDirectoryName = (name: string): boolean =>
  name.startsWith(NAMES.backupPrefix) || name.startsWith(NAMES.restoreSafetyPrefix);
