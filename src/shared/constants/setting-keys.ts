import {
  DEFAULT_ALLOCATION_RATE,
  DEFAULT_TAX_RATE,
  DEFAULT_TAX_TREATMENT,
} from '@shared/constants/tax';
import { PERIOD_MODES } from '@shared/types/expense';
import type { AppSettings } from '@shared/types/settings';

/** Excel ファイル名テンプレートで使えるプレースホルダ */
export const EXPORT_FILENAME_PLACEHOLDERS = {
  /** 2026 / 2026-08 のような期間表現 */
  PERIOD: '{period}',
  /** 出力時点の日付 YYYYMMDD */
  TODAY: '{today}',
  /** アプリ名 */
  APP: '{app}',
} as const;

export const DEFAULT_EXPORT_FILENAME_TEMPLATE = `{app}_経費明細_{period}`;

/** バックアップ保持世代数の許容範囲 */
export const BACKUP_RETENTION_RANGE = { min: 1, max: 100 } as const;

export const DEFAULT_BACKUP_RETENTION_COUNT = 10;

interface SettingDefinition<K extends keyof AppSettings> {
  /** settings テーブルに保存するキー */
  key: string;
  defaultValue: AppSettings[K];
}

/**
 * 設定項目の唯一の定義元。
 * 保存キーと既定値をここだけで管理し、各所でキー文字列を直接書かない。
 */
export const SETTING_DEFINITIONS: { [K in keyof AppSettings]: SettingDefinition<K> } = {
  agreedTermsVersion: { key: 'terms.agreedVersion', defaultValue: 0 },
  setupCompleted: { key: 'setup.completed', defaultValue: false },
  backupEnabledOnStartup: { key: 'backup.enabledOnStartup', defaultValue: true },
  backupDirectory: { key: 'backup.directory', defaultValue: null },
  backupRetentionCount: {
    key: 'backup.retentionCount',
    defaultValue: DEFAULT_BACKUP_RETENTION_COUNT,
  },
  backupIncludeAttachments: { key: 'backup.includeAttachments', defaultValue: true },
  exportDirectory: { key: 'export.directory', defaultValue: null },
  importDirectory: { key: 'import.directory', defaultValue: null },
  exportFileNameTemplate: {
    key: 'export.fileNameTemplate',
    defaultValue: DEFAULT_EXPORT_FILENAME_TEMPLATE,
  },
  defaultTaxTreatment: { key: 'defaults.taxTreatment', defaultValue: DEFAULT_TAX_TREATMENT },
  defaultTaxRate: { key: 'defaults.taxRate', defaultValue: DEFAULT_TAX_RATE },
  defaultAllocationRate: {
    key: 'defaults.allocationRate',
    defaultValue: DEFAULT_ALLOCATION_RATE,
  },
  sideMenuCollapsed: { key: 'ui.sideMenuCollapsed', defaultValue: false },
  defaultPeriodMode: { key: 'ui.defaultPeriodMode', defaultValue: PERIOD_MODES.MONTH },
};

export const SETTING_FIELDS = Object.keys(SETTING_DEFINITIONS) as (keyof AppSettings)[];

export const DEFAULT_SETTINGS: AppSettings = SETTING_FIELDS.reduce((acc, field) => {
  // 型の対応関係は SETTING_DEFINITIONS で担保されている
  (acc as unknown as Record<string, unknown>)[field] = SETTING_DEFINITIONS[field].defaultValue;
  return acc;
}, {} as AppSettings);
