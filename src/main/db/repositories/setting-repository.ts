import { getDatabase } from '@main/db/connection';
import { nowIso } from '@main/utils/time';
import {
  DEFAULT_SETTINGS,
  SETTING_DEFINITIONS,
  SETTING_FIELDS,
} from '@shared/constants/setting-keys';
import type { AppSettings } from '@shared/types/settings';

interface SettingRow {
  key: string;
  value: string;
}

/** 保存済みの値をすべて読み、既定値とマージして AppSettings を返す。 */
export const loadSettings = (): AppSettings => {
  const rows = getDatabase()
    .prepare<[], SettingRow>(`SELECT key, value FROM settings`)
    .all();
  const stored = new Map(rows.map((row) => [row.key, row.value]));

  const settings = { ...DEFAULT_SETTINGS };
  for (const field of SETTING_FIELDS) {
    const raw = stored.get(SETTING_DEFINITIONS[field].key);
    if (raw === undefined) {
      continue;
    }
    try {
      (settings as Record<string, unknown>)[field] = JSON.parse(raw);
    } catch {
      // 壊れた値は既定値のままにする
    }
  }
  return settings;
};

/** 指定された項目だけを更新し、更新後の全設定を返す。 */
export const saveSettings = (patch: Partial<AppSettings>): AppSettings => {
  const db = getDatabase();
  const statement = db.prepare(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
  );
  const timestamp = nowIso();

  const apply = db.transaction((entries: Partial<AppSettings>) => {
    for (const field of SETTING_FIELDS) {
      if (!(field in entries)) {
        continue;
      }
      statement.run(
        SETTING_DEFINITIONS[field].key,
        JSON.stringify(entries[field]),
        timestamp,
      );
    }
  });
  apply(patch);

  return loadSettings();
};
