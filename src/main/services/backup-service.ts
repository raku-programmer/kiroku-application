import { app } from 'electron';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import {
  FILE_NAMES,
  buildBackupDirectoryName,
  buildRestoreSafetyDirectoryName,
  getAttachmentsDirectory,
  getDatabasePath,
  getDefaultBackupDirectory,
  isBackupDirectoryName,
} from '@main/config/paths';
import { closeDatabase, getDatabase, openDatabase } from '@main/db/connection';
import { loadSettings } from '@main/db/repositories/setting-repository';
import { AppException } from '@main/errors';
import { getLatestSchemaVersion } from '@main/db/migrations';
import { ERROR_CODES } from '@shared/constants/error-codes';
import { BACKUP_RETENTION_RANGE } from '@shared/constants/setting-keys';
import type { BackupEntry, StartupBackupStatus } from '@shared/types/settings';
import { toTimestampString } from '@shared/utils/period';

interface BackupMetadata {
  createdAt: string;
  includesAttachments: boolean;
  appVersion: string;
  schemaVersion: number;
}

let startupStatus: StartupBackupStatus = {
  executed: false,
  succeeded: false,
  createdAt: null,
  message: null,
};

export const getStartupBackupStatus = (): StartupBackupStatus => startupStatus;

/** 設定に応じたバックアップ先ディレクトリ */
export const resolveBackupDirectory = (): string =>
  loadSettings().backupDirectory ?? getDefaultBackupDirectory();

const directorySize = async (directory: string): Promise<number> => {
  let total = 0;
  const entries = await fsp.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      total += await directorySize(entryPath);
    } else if (entry.isFile()) {
      total += (await fsp.stat(entryPath)).size;
    }
  }
  return total;
};

const readMetadata = async (backupPath: string): Promise<BackupMetadata | null> => {
  try {
    const raw = await fsp.readFile(
      path.join(backupPath, FILE_NAMES.backupMetadataFile),
      'utf-8',
    );
    return JSON.parse(raw) as BackupMetadata;
  } catch {
    return null;
  }
};

const toBackupEntry = async (
  backupDirectory: string,
  name: string,
): Promise<BackupEntry> => {
  const backupPath = path.join(backupDirectory, name);
  const metadata = await readMetadata(backupPath);
  const stats = await fsp.stat(backupPath);
  return {
    path: backupPath,
    name,
    createdAt: metadata?.createdAt ?? stats.birthtime.toISOString(),
    byteSize: await directorySize(backupPath),
    includesAttachments:
      metadata?.includesAttachments ??
      fs.existsSync(path.join(backupPath, FILE_NAMES.backupAttachmentsDir)),
  };
};

/** バックアップ世代を新しい順に返す。 */
export const listBackups = async (): Promise<BackupEntry[]> => {
  const backupDirectory = resolveBackupDirectory();
  if (!fs.existsSync(backupDirectory)) {
    return [];
  }
  const entries = await fsp.readdir(backupDirectory, { withFileTypes: true });
  const targets = entries.filter(
    (entry) => entry.isDirectory() && isBackupDirectoryName(entry.name),
  );
  const backups = await Promise.all(
    targets.map((entry) => toBackupEntry(backupDirectory, entry.name)),
  );
  return backups.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

/** 保持世代数を超えた古いバックアップを削除する。 */
const pruneBackups = async (retentionCount: number): Promise<void> => {
  const limit = Math.min(
    Math.max(retentionCount, BACKUP_RETENTION_RANGE.min),
    BACKUP_RETENTION_RANGE.max,
  );
  const backups = await listBackups();
  const obsolete = backups.slice(limit);
  await Promise.all(
    obsolete.map((backup) => fsp.rm(backup.path, { recursive: true, force: true })),
  );
};

interface CreateBackupOptions {
  /** 復元前の安全用バックアップかどうか */
  safety?: boolean;
  /** 保持世代数の整理を行うか */
  prune?: boolean;
}

/** データベース（と設定に応じて添付）をバックアップする。 */
export const createBackup = async (
  options: CreateBackupOptions = {},
): Promise<BackupEntry> => {
  const settings = loadSettings();
  const backupDirectory = resolveBackupDirectory();
  const timestamp = toTimestampString();
  const directoryName = options.safety
    ? buildRestoreSafetyDirectoryName(timestamp)
    : buildBackupDirectoryName(timestamp);
  const destination = path.join(backupDirectory, directoryName);

  try {
    await fsp.mkdir(destination, { recursive: true });

    // SQLite のオンラインバックアップ API を使い、WAL の内容も含めて整合性を保つ
    await getDatabase().backup(path.join(destination, FILE_NAMES.backupDatabaseFile));

    const includesAttachments =
      settings.backupIncludeAttachments && fs.existsSync(getAttachmentsDirectory());
    if (includesAttachments) {
      await fsp.cp(
        getAttachmentsDirectory(),
        path.join(destination, FILE_NAMES.backupAttachmentsDir),
        { recursive: true },
      );
    }

    const metadata: BackupMetadata = {
      createdAt: new Date().toISOString(),
      includesAttachments,
      appVersion: app.getVersion(),
      schemaVersion: getLatestSchemaVersion(),
    };
    await fsp.writeFile(
      path.join(destination, FILE_NAMES.backupMetadataFile),
      JSON.stringify(metadata, null, 2),
      'utf-8',
    );
  } catch (error) {
    await fsp.rm(destination, { recursive: true, force: true }).catch(() => undefined);
    throw new AppException(
      ERROR_CODES.BACKUP_FAILED,
      `バックアップに失敗しました。${(error as Error).message}`,
    );
  }

  if (options.prune !== false) {
    await pruneBackups(settings.backupRetentionCount);
  }

  return toBackupEntry(backupDirectory, directoryName);
};

/** 起動時バックアップ。失敗してもアプリの起動は継続する。 */
export const runStartupBackupIfEnabled = async (): Promise<void> => {
  const settings = loadSettings();
  if (!settings.backupEnabledOnStartup) {
    startupStatus = {
      executed: false,
      succeeded: false,
      createdAt: null,
      message: null,
    };
    return;
  }

  try {
    const backup = await createBackup();
    startupStatus = {
      executed: true,
      succeeded: true,
      createdAt: backup.createdAt,
      message: null,
    };
  } catch (error) {
    startupStatus = {
      executed: true,
      succeeded: false,
      createdAt: null,
      message: (error as Error).message,
    };
  }
};

/**
 * バックアップから復元する。
 * 復元前に現在の状態を安全用バックアップとして退避してから差し替える。
 */
export const restoreBackup = async (backupPath: string): Promise<void> => {
  const sourceDatabase = path.join(backupPath, FILE_NAMES.backupDatabaseFile);
  if (!fs.existsSync(sourceDatabase)) {
    throw new AppException(
      ERROR_CODES.RESTORE_FAILED,
      '選択したバックアップにデータベースが含まれていません。',
    );
  }

  await createBackup({ safety: true, prune: false });

  const sourceAttachments = path.join(backupPath, FILE_NAMES.backupAttachmentsDir);
  const databasePath = getDatabasePath();

  try {
    closeDatabase();

    // WAL / SHM が残っていると復元後の内容が上書きされるため削除する
    await Promise.all(
      ['-wal', '-shm'].map((suffix) =>
        fsp.rm(`${databasePath}${suffix}`, { force: true }),
      ),
    );
    await fsp.copyFile(sourceDatabase, databasePath);

    if (fs.existsSync(sourceAttachments)) {
      const attachmentsDirectory = getAttachmentsDirectory();
      await fsp.rm(attachmentsDirectory, { recursive: true, force: true });
      await fsp.cp(sourceAttachments, attachmentsDirectory, { recursive: true });
    }
  } catch (error) {
    throw new AppException(
      ERROR_CODES.RESTORE_FAILED,
      `復元に失敗しました。${(error as Error).message}`,
    );
  } finally {
    // 失敗時も接続を復旧させる
    openDatabase();
  }
};
