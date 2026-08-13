import { BrowserWindow, dialog } from 'electron';
import {
  getAttachmentsDirectory,
  getDatabasePath,
  getDefaultImportDirectory,
} from '@main/config/paths';
import { loadSettings, saveSettings } from '@main/db/repositories/setting-repository';
import { validationError } from '@main/errors';
import { resolveBackupDirectory } from '@main/services/backup-service';
import {
  BACKUP_RETENTION_RANGE,
  SETTING_FIELDS,
} from '@shared/constants/setting-keys';
import {
  RATE_SCALE,
  TAX_RATE_OPTIONS,
  TAX_TREATMENT_OPTIONS,
} from '@shared/constants/tax';
import { PERIOD_MODES } from '@shared/types/expense';
import type { AppSettings, StorageLocations } from '@shared/types/settings';

type Validator = (value: unknown) => unknown;

const asBoolean =
  (label: string): Validator =>
  (value) => {
    if (typeof value !== 'boolean') {
      throw validationError(`${label}の指定が不正です。`);
    }
    return value;
  };

const asNullableString =
  (label: string): Validator =>
  (value) => {
    if (value == null) {
      return null;
    }
    if (typeof value !== 'string') {
      throw validationError(`${label}の指定が不正です。`);
    }
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  };

const asNonEmptyString =
  (label: string): Validator =>
  (value) => {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw validationError(`${label}を入力してください。`);
    }
    return value.trim();
  };

const asIntegerInRange =
  (label: string, min: number, max: number): Validator =>
  (value) => {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
      throw validationError(`${label}は ${min}〜${max} の範囲で指定してください。`);
    }
    return value;
  };

const asNonNegativeInteger =
  (label: string): Validator =>
  (value) => {
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
      throw validationError(`${label}の指定が不正です。`);
    }
    return value;
  };

const asEnum =
  (label: string, allowed: readonly unknown[]): Validator =>
  (value) => {
    if (!allowed.includes(value)) {
      throw validationError(`${label}の指定が不正です。`);
    }
    return value;
  };

/** 設定項目ごとの検証。SETTING_FIELDS と 1 対 1 で対応させる。 */
const VALIDATORS: Record<keyof AppSettings, Validator> = {
  agreedTermsVersion: asNonNegativeInteger('利用規約の同意状況'),
  setupCompleted: asBoolean('初期セットアップの完了状態'),
  backupEnabledOnStartup: asBoolean('起動時バックアップ'),
  backupDirectory: asNullableString('バックアップ先'),
  backupRetentionCount: asIntegerInRange(
    '保持世代数',
    BACKUP_RETENTION_RANGE.min,
    BACKUP_RETENTION_RANGE.max,
  ),
  backupIncludeAttachments: asBoolean('添付ファイルを含める設定'),
  exportDirectory: asNullableString('Excel の保存先'),
  importDirectory: asNullableString('領収書の取り込み元フォルダ'),
  exportFileNameTemplate: asNonEmptyString('ファイル名テンプレート'),
  defaultTaxTreatment: asEnum(
    '既定の税区分',
    TAX_TREATMENT_OPTIONS.map((option) => option.value),
  ),
  defaultTaxRate: asEnum(
    '既定の税率',
    TAX_RATE_OPTIONS.map((option) => option.value),
  ),
  defaultAllocationRate: asIntegerInRange('既定の按分率', 0, RATE_SCALE),
  sideMenuCollapsed: asBoolean('サイドメニューの状態'),
  defaultPeriodMode: asEnum('既定の期間モード', Object.values(PERIOD_MODES)),
};

export const getSettings = (): AppSettings => loadSettings();

/** 受け取った項目だけを検証して保存する。 */
export const updateSettings = (patch: unknown): AppSettings => {
  const raw = (patch ?? {}) as Record<string, unknown>;
  const validated: Partial<AppSettings> = {};

  for (const field of SETTING_FIELDS) {
    if (!(field in raw)) {
      continue;
    }
    (validated as Record<string, unknown>)[field] = VALIDATORS[field](raw[field]);
  }

  return saveSettings(validated);
};

/** ディレクトリ選択ダイアログ。キャンセル時は null を返す。 */
export const chooseDirectory = async (
  parentWindow: BrowserWindow | null,
  currentPath: string | null,
): Promise<string | null> => {
  const options: Electron.OpenDialogOptions = {
    title: 'フォルダを選択',
    properties: ['openDirectory', 'createDirectory'],
    defaultPath: currentPath ?? undefined,
  };
  const result = parentWindow
    ? await dialog.showOpenDialog(parentWindow, options)
    : await dialog.showOpenDialog(options);

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
};

export const getStorageLocations = (): StorageLocations => ({
  databasePath: getDatabasePath(),
  attachmentsDirectory: getAttachmentsDirectory(),
  backupDirectory: resolveBackupDirectory(),
  importDirectory: loadSettings().importDirectory ?? getDefaultImportDirectory(),
});
