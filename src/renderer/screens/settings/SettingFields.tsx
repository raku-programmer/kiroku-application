import { useEffect, useState } from 'react';
import { FolderIcon } from '@renderer/components/icons/Icons';
import { Button, BUTTON_SIZES, BUTTON_VARIANTS } from '@renderer/components/ui/Button';
import { Field } from '@renderer/components/ui/Field';
import { LABELS } from '@renderer/constants/labels';
import {
  BACKUP_RETENTION_RANGE,
  EXPORT_FILENAME_PLACEHOLDERS,
} from '@shared/constants/setting-keys';
import {
  RATE_FRACTION_DIGITS,
  RATE_SCALE,
  TAX_RATE_OPTIONS,
  TAX_TREATMENT_OPTIONS,
} from '@shared/constants/tax';
import { PERIOD_MODES } from '@shared/types/expense';
import type { AppSettings } from '@shared/types/settings';
import { percentToRate, rateToPercent } from '@shared/utils/money';
import './SettingFields.css';

/**
 * 設定画面と初期セットアップで共有する入力部品。
 * 同じ設定項目を二箇所で書かないことで、片方だけ直し忘れるのを防ぐ。
 */

/** ディレクトリを持つ設定項目 */
export type DirectorySettingKey = 'backupDirectory' | 'exportDirectory' | 'importDirectory';

interface CommonProps {
  settings: AppSettings;
  onPatch: (patch: Partial<AppSettings>) => void;
}

interface DirectoryProps extends CommonProps {
  onChooseDirectory: (key: DirectorySettingKey) => void;
}

const FIELD_IDS = {
  retention: 'setting-retention',
  fileNameTemplate: 'setting-filename-template',
  taxTreatment: 'setting-tax-treatment',
  taxRate: 'setting-tax-rate',
  allocation: 'setting-allocation',
  periodMode: 'setting-period-mode',
} as const;

const formatPercent = (rate: number): string => {
  const percent = rateToPercent(rate);
  return Number.isInteger(percent) ? String(percent) : percent.toFixed(RATE_FRACTION_DIGITS);
};

/** 保存先の表示と選択。null のときは既定の場所を使う。 */
const DirectoryField = ({
  label,
  value,
  fallback,
  hint,
  onChoose,
  onClear,
}: {
  label: string;
  value: string | null;
  fallback: string;
  hint?: string;
  onChoose: () => void;
  onClear: () => void;
}): JSX.Element => (
  <Field label={label} hint={hint}>
    <span className="settings-path">{value ?? fallback}</span>
    <Button
      variant={BUTTON_VARIANTS.SECONDARY}
      size={BUTTON_SIZES.SMALL}
      icon={<FolderIcon width={16} height={16} />}
      onClick={onChoose}
    >
      {LABELS.common.select}
    </Button>
    {value !== null && (
      <Button variant={BUTTON_VARIANTS.GHOST} size={BUTTON_SIZES.SMALL} onClick={onClear}>
        {LABELS.settings.useDefault}
      </Button>
    )}
  </Field>
);

/** 入力の初期値（税区分・税率・按分率）と一覧の既定期間 */
export const DisplayDefaultFields = ({ settings, onPatch }: CommonProps): JSX.Element => {
  const [allocationText, setAllocationText] = useState(() =>
    formatPercent(settings.defaultAllocationRate),
  );

  useEffect(() => {
    setAllocationText(formatPercent(settings.defaultAllocationRate));
  }, [settings.defaultAllocationRate]);

  return (
    <div className="settings-grid">
      <Field label={LABELS.settings.defaultTaxTreatment} htmlFor={FIELD_IDS.taxTreatment}>
        <select
          id={FIELD_IDS.taxTreatment}
          className="select"
          value={settings.defaultTaxTreatment}
          onChange={(event) =>
            onPatch({
              defaultTaxTreatment: event.target.value as AppSettings['defaultTaxTreatment'],
            })
          }
        >
          {TAX_TREATMENT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label={LABELS.settings.defaultTaxRate} htmlFor={FIELD_IDS.taxRate}>
        <select
          id={FIELD_IDS.taxRate}
          className="select"
          value={settings.defaultTaxRate}
          onChange={(event) => onPatch({ defaultTaxRate: Number(event.target.value) })}
        >
          {TAX_RATE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label={LABELS.settings.defaultAllocationRate} htmlFor={FIELD_IDS.allocation}>
        <input
          id={FIELD_IDS.allocation}
          type="text"
          inputMode="decimal"
          className="input input--numeric"
          value={allocationText}
          onChange={(event) => setAllocationText(event.target.value)}
          onBlur={() => {
            const parsed = Number(allocationText);
            if (!Number.isFinite(parsed)) {
              setAllocationText(formatPercent(settings.defaultAllocationRate));
              return;
            }
            const rate = Math.min(Math.max(percentToRate(parsed), 0), RATE_SCALE);
            if (rate !== settings.defaultAllocationRate) {
              onPatch({ defaultAllocationRate: rate });
            }
          }}
        />
        <span className="input-suffix">%</span>
      </Field>

      <Field label={LABELS.settings.defaultPeriodMode} htmlFor={FIELD_IDS.periodMode}>
        <select
          id={FIELD_IDS.periodMode}
          className="select"
          value={settings.defaultPeriodMode}
          onChange={(event) =>
            onPatch({
              defaultPeriodMode: event.target.value as AppSettings['defaultPeriodMode'],
            })
          }
        >
          <option value={PERIOD_MODES.MONTH}>{LABELS.list.modeMonth}</option>
          <option value={PERIOD_MODES.YEAR}>{LABELS.list.modeYear}</option>
        </select>
      </Field>
    </div>
  );
};

/** Excel 出力の保存先とファイル名 */
export const ExportSettingFields = ({
  settings,
  onPatch,
  onChooseDirectory,
}: DirectoryProps): JSX.Element => (
  <>
    <DirectoryField
      label={LABELS.settings.exportDirectory}
      value={settings.exportDirectory}
      fallback={LABELS.settings.useDefault}
      onChoose={() => onChooseDirectory('exportDirectory')}
      onClear={() => onPatch({ exportDirectory: null })}
    />

    <Field
      label={LABELS.settings.exportFileNameTemplate}
      htmlFor={FIELD_IDS.fileNameTemplate}
      hint={`${LABELS.settings.exportTemplateHint}${Object.values(
        EXPORT_FILENAME_PLACEHOLDERS,
      ).join(' ')}`}
    >
      <input
        id={FIELD_IDS.fileNameTemplate}
        type="text"
        className="input"
        defaultValue={settings.exportFileNameTemplate}
        onBlur={(event) => {
          const value = event.target.value.trim();
          if (value.length > 0 && value !== settings.exportFileNameTemplate) {
            onPatch({ exportFileNameTemplate: value });
          }
        }}
      />
    </Field>
  </>
);

/** 領収書の取り込み元フォルダ */
export const ImportSettingFields = ({
  settings,
  onPatch,
  onChooseDirectory,
  defaultImportDirectory,
}: DirectoryProps & { defaultImportDirectory: string }): JSX.Element => (
  <DirectoryField
    label={LABELS.settings.importDirectory}
    value={settings.importDirectory}
    fallback={defaultImportDirectory}
    hint={LABELS.settings.importDirectoryHint}
    onChoose={() => onChooseDirectory('importDirectory')}
    onClear={() => onPatch({ importDirectory: null })}
  />
);

/** バックアップの取得方法と保存先 */
export const BackupSettingFields = ({
  settings,
  onPatch,
  onChooseDirectory,
  defaultBackupDirectory,
}: DirectoryProps & { defaultBackupDirectory: string }): JSX.Element => (
  <>
    <div className="settings-grid">
      <Field label={LABELS.settings.backupEnabledOnStartup}>
        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={settings.backupEnabledOnStartup}
            onChange={(event) => onPatch({ backupEnabledOnStartup: event.target.checked })}
          />
          <span>
            {settings.backupEnabledOnStartup ? LABELS.common.enabled : LABELS.common.disabled}
          </span>
        </label>
      </Field>

      <Field label={LABELS.settings.backupIncludeAttachments}>
        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={settings.backupIncludeAttachments}
            onChange={(event) => onPatch({ backupIncludeAttachments: event.target.checked })}
          />
          <span>
            {settings.backupIncludeAttachments ? LABELS.common.enabled : LABELS.common.disabled}
          </span>
        </label>
      </Field>

      <Field label={LABELS.settings.backupRetentionCount} htmlFor={FIELD_IDS.retention}>
        <input
          id={FIELD_IDS.retention}
          type="number"
          className="input input--numeric"
          min={BACKUP_RETENTION_RANGE.min}
          max={BACKUP_RETENTION_RANGE.max}
          value={settings.backupRetentionCount}
          onChange={(event) => {
            const value = Number(event.target.value);
            if (
              Number.isInteger(value) &&
              value >= BACKUP_RETENTION_RANGE.min &&
              value <= BACKUP_RETENTION_RANGE.max
            ) {
              onPatch({ backupRetentionCount: value });
            }
          }}
        />
      </Field>
    </div>

    <DirectoryField
      label={LABELS.settings.backupDirectory}
      value={settings.backupDirectory}
      fallback={defaultBackupDirectory}
      onChoose={() => onChooseDirectory('backupDirectory')}
      onClear={() => onPatch({ backupDirectory: null })}
    />
  </>
);
