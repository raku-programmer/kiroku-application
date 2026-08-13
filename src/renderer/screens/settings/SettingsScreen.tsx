import { useEffect, useState } from 'react';
import { api } from '@renderer/api/client';
import { LoadingOverlay, OVERLAY_VARIANTS } from '@renderer/components/feedback/LoadingOverlay';
import { FolderIcon, RestoreIcon } from '@renderer/components/icons/Icons';
import { ConfirmDialog } from '@renderer/components/modal/ConfirmDialog';
import { Button, BUTTON_SIZES, BUTTON_VARIANTS } from '@renderer/components/ui/Button';
import { Card } from '@renderer/components/ui/Card';
import { Field } from '@renderer/components/ui/Field';
import { LABELS } from '@renderer/constants/labels';
import { LOADING_SCOPES } from '@renderer/constants/ui';
import { useAppData } from '@renderer/contexts/AppDataContext';
import { TOAST_TONES, useToast } from '@renderer/contexts/ToastContext';
import { useAsyncAction } from '@renderer/hooks/useAsyncAction';
import { PresetEditor } from '@renderer/screens/settings/PresetEditor';
import {
  BackupSettingFields,
  DisplayDefaultFields,
  ExportSettingFields,
  ImportSettingFields,
  type DirectorySettingKey,
} from '@renderer/screens/settings/SettingFields';
import { PRESET_KINDS, usePresetActions } from '@renderer/screens/settings/usePresetActions';
import { TermsDialog } from '@renderer/screens/terms/TermsDialog';
import type {
  AppSettings,
  BackupEntry,
  StartupBackupStatus,
  StorageLocations,
} from '@shared/types/settings';
import { formatByteSize, formatDateTime } from '@shared/utils/format';
import './SettingsScreen.css';

interface SettingsScreenProps {
  onReady: () => void;
}

export const SettingsScreen = ({ onReady }: SettingsScreenProps): JSX.Element => {
  const { settings, accountCategories, paymentMethods, applySettings } = useAppData();
  const { showToast } = useToast();
  const settingAction = useAsyncAction();
  const backupAction = useAsyncAction();
  const presets = usePresetActions();

  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [locations, setLocations] = useState<StorageLocations | null>(null);
  const [startupStatus, setStartupStatus] = useState<StartupBackupStatus | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<BackupEntry | null>(null);
  const [confirmingSetupRestart, setConfirmingSetupRestart] = useState(false);
  const [termsVisible, setTermsVisible] = useState(false);

  const refreshBackupInfo = async (): Promise<void> => {
    const [backupList, storage] = await Promise.all([
      api.backup.list(),
      api.settings.storageLocations(),
    ]);
    if (backupList.ok) {
      setBackups(backupList.data);
    }
    if (storage.ok) {
      setLocations(storage.data);
    }
  };

  useEffect(() => {
    let canceled = false;
    const load = async (): Promise<void> => {
      const status = await api.backup.startupStatus();
      await refreshBackupInfo();
      if (!canceled) {
        if (status.ok) {
          setStartupStatus(status.data);
        }
        onReady();
      }
    };
    void load();
    return () => {
      canceled = true;
    };
  }, [onReady]);

  const patchSettings = (patch: Partial<AppSettings>): void => {
    void settingAction.run(() => api.settings.update(patch), {
      scope: LOADING_SCOPES.SECTION,
      successMessage: LABELS.settings.saved,
      onSuccess: applySettings,
    });
  };

  const chooseDirectory = async (key: DirectorySettingKey): Promise<void> => {
    const selected = await settingAction.run(
      () => api.settings.chooseDirectory(settings[key]),
      { scope: LOADING_SCOPES.SECTION },
    );
    if (!selected) {
      return;
    }
    const updated = await settingAction.run(
      () => api.settings.update({ [key]: selected } as Partial<AppSettings>),
      {
        scope: LOADING_SCOPES.SECTION,
        successMessage: LABELS.settings.saved,
        onSuccess: applySettings,
      },
    );
    if (updated) {
      await refreshBackupInfo();
    }
  };

  const runBackup = async (): Promise<void> => {
    const created = await backupAction.run(() => api.backup.run(), {
      scope: LOADING_SCOPES.GLOBAL,
      loadingMessage: LABELS.common.processing,
      successMessage: LABELS.settings.backupCreated,
    });
    if (created) {
      await refreshBackupInfo();
    }
  };

  const runRestore = async (): Promise<void> => {
    const target = restoreTarget;
    if (!target) {
      return;
    }
    setRestoreTarget(null);
    const restored = await backupAction.run(() => api.backup.restore(target.path), {
      scope: LOADING_SCOPES.GLOBAL,
      loadingMessage: LABELS.common.processing,
      successMessage: LABELS.settings.restored,
    });
    if (restored === null) {
      return;
    }
    // 復元後は設定もプリセットも中身が入れ替わるので読み直す
    await refreshBackupInfo();
    const reloadedSettings = await api.settings.get();
    if (reloadedSettings.ok) {
      applySettings(reloadedSettings.data);
    }
  };

  /**
   * 初期化：経費などのトランザクションデータを消してから、セットアップ画面へ戻す。
   * 削除に失敗したときは設定を書き換えない（消えていないのに初期化された状態にしないため）。
   */
  const restartSetup = async (): Promise<void> => {
    setConfirmingSetupRestart(false);

    const reset = await backupAction.run(() => api.data.resetTransactions(), {
      scope: LOADING_SCOPES.GLOBAL,
      loadingMessage: LABELS.common.processing,
    });
    if (!reset) {
      return;
    }

    showToast(
      TOAST_TONES.SUCCESS,
      LABELS.setup.restartDone
        .replace('{count}', String(reset.deletedExpenseCount))
        .replace('{backup}', reset.backupPath),
    );

    await refreshBackupInfo();
    patchSettings({ setupCompleted: false });
  };

  const openPath = (targetPath: string): void => {
    void settingAction.run(() => api.system.openPath(targetPath), {
      scope: LOADING_SCOPES.SECTION,
    });
  };

  return (
    <div className="screen">
      <Card title={LABELS.settings.sectionData} description={LABELS.settings.description} relative>
        {startupStatus?.executed && (
          <p
            className={`settings-status settings-status--${
              startupStatus.succeeded ? 'ok' : 'ng'
            }`}
          >
            {startupStatus.succeeded
              ? `${LABELS.settings.startupBackupSucceeded}（${
                  startupStatus.createdAt ? formatDateTime(startupStatus.createdAt) : ''
                }）`
              : `${LABELS.settings.startupBackupFailed} ${startupStatus.message ?? ''}`}
          </p>
        )}

        <BackupSettingFields
          settings={settings}
          onPatch={patchSettings}
          onChooseDirectory={(key) => void chooseDirectory(key)}
          defaultBackupDirectory={locations?.backupDirectory ?? ''}
        />

        <div className="settings-actions">
          <Button
            variant={BUTTON_VARIANTS.PRIMARY}
            onClick={() => void runBackup()}
            loading={backupAction.isBusy}
          >
            {LABELS.settings.backupRunNow}
          </Button>
        </div>

        <h3 className="settings-subtitle">{LABELS.settings.backupList}</h3>
        {backups.length === 0 ? (
          <p className="settings-empty">{LABELS.settings.backupEmpty}</p>
        ) : (
          <ul className="settings-backups">
            {backups.map((backup) => (
              <li className="settings-backups__item" key={backup.path}>
                <span className="settings-backups__name">{backup.name}</span>
                <span className="settings-backups__meta">
                  {formatDateTime(backup.createdAt)} / {formatByteSize(backup.byteSize)}
                  {backup.includesAttachments ? ` / ${LABELS.settings.attachmentsDirectory}` : ''}
                </span>
                <Button
                  variant={BUTTON_VARIANTS.GHOST}
                  size={BUTTON_SIZES.SMALL}
                  icon={<FolderIcon width={16} height={16} />}
                  onClick={() => openPath(backup.path)}
                  title={LABELS.settings.openFolder}
                  aria-label={LABELS.settings.openFolder}
                />
                <Button
                  variant={BUTTON_VARIANTS.SECONDARY}
                  size={BUTTON_SIZES.SMALL}
                  icon={<RestoreIcon width={16} height={16} />}
                  onClick={() => setRestoreTarget(backup)}
                >
                  {LABELS.settings.restore}
                </Button>
              </li>
            ))}
          </ul>
        )}

        {locations && (
          <>
            <h3 className="settings-subtitle">{LABELS.settings.storageLocations}</h3>
            <dl className="settings-locations">
              <div>
                <dt>{LABELS.settings.databasePath}</dt>
                <dd>
                  <span className="settings-path">{locations.databasePath}</span>
                </dd>
              </div>
              <div>
                <dt>{LABELS.settings.attachmentsDirectory}</dt>
                <dd>
                  <span className="settings-path">{locations.attachmentsDirectory}</span>
                  <Button
                    variant={BUTTON_VARIANTS.GHOST}
                    size={BUTTON_SIZES.SMALL}
                    icon={<FolderIcon width={16} height={16} />}
                    onClick={() => openPath(locations.attachmentsDirectory)}
                  >
                    {LABELS.settings.openFolder}
                  </Button>
                </dd>
              </div>
            </dl>
          </>
        )}

        <LoadingOverlay
          visible={settingAction.isSpinning || backupAction.isSpinning}
          variant={OVERLAY_VARIANTS.SECTION}
        />
      </Card>

      <Card title={LABELS.settings.sectionPresets} relative>
        <PresetEditor
          title={LABELS.settings.accountCategories}
          rows={accountCategories}
          withAllocationRate
          busy={presets.isBusy}
          pendingRowId={presets.pendingRowId}
          onCreate={(name) => presets.create(name, PRESET_KINDS.CATEGORY)}
          onUpdate={(row) => presets.update(row, PRESET_KINDS.CATEGORY)}
          onDelete={(row) => presets.requestDelete({ row, kind: PRESET_KINDS.CATEGORY })}
          onReorder={(ids) => presets.reorder(ids, PRESET_KINDS.CATEGORY)}
        />

        <div className="settings-divider" />

        <PresetEditor
          title={LABELS.settings.paymentMethods}
          rows={paymentMethods}
          busy={presets.isBusy}
          pendingRowId={presets.pendingRowId}
          onCreate={(name) => presets.create(name, PRESET_KINDS.METHOD)}
          onUpdate={(row) => presets.update(row, PRESET_KINDS.METHOD)}
          onDelete={(row) => presets.requestDelete({ row, kind: PRESET_KINDS.METHOD })}
          onReorder={(ids) => presets.reorder(ids, PRESET_KINDS.METHOD)}
        />

        <LoadingOverlay visible={presets.isSpinning} variant={OVERLAY_VARIANTS.SECTION} />
      </Card>

      <Card title={LABELS.settings.sectionExport} relative>
        <ExportSettingFields
          settings={settings}
          onPatch={patchSettings}
          onChooseDirectory={(key) => void chooseDirectory(key)}
        />
      </Card>

      <Card title={LABELS.settings.sectionImport} relative>
        <ImportSettingFields
          settings={settings}
          onPatch={patchSettings}
          onChooseDirectory={(key) => void chooseDirectory(key)}
          defaultImportDirectory={locations?.importDirectory ?? ''}
        />
      </Card>

      <Card title={LABELS.settings.sectionDisplay} relative>
        <DisplayDefaultFields settings={settings} onPatch={patchSettings} />

        <Field label={LABELS.settings.sideMenuState}>
          <span className="settings-readonly">
            {settings.sideMenuCollapsed
              ? LABELS.settings.sideMenuCollapsed
              : LABELS.settings.sideMenuExpanded}
          </span>
        </Field>

        <Field label={LABELS.terms.settingsLabel}>
          <span className="settings-readonly">
            {LABELS.terms.settingsAgreedAt.replace(
              '{version}',
              String(settings.agreedTermsVersion),
            )}
          </span>
        </Field>

        <div className="settings-actions">
          <Button variant={BUTTON_VARIANTS.SECONDARY} onClick={() => setTermsVisible(true)}>
            {LABELS.terms.review}
          </Button>
          <Button
            variant={BUTTON_VARIANTS.SECONDARY}
            onClick={() => setConfirmingSetupRestart(true)}
          >
            {LABELS.setup.restart}
          </Button>
        </div>
      </Card>

      <ConfirmDialog
        open={restoreTarget !== null}
        title={LABELS.settings.restoreConfirmTitle}
        body={LABELS.settings.restoreConfirmBody}
        confirmLabel={LABELS.settings.restore}
        danger
        busy={backupAction.isBusy}
        onConfirm={() => void runRestore()}
        onCancel={() => setRestoreTarget(null)}
      />

      <ConfirmDialog
        open={presets.deleteTarget !== null}
        title={LABELS.settings.presetDeleteConfirmTitle}
        body={LABELS.settings.presetDeleteConfirmBody}
        confirmLabel={LABELS.common.delete}
        danger
        busy={presets.isBusy}
        onConfirm={() => void presets.confirmDelete()}
        onCancel={presets.cancelDelete}
      />

      <TermsDialog open={termsVisible} onClose={() => setTermsVisible(false)} />

      <ConfirmDialog
        open={confirmingSetupRestart}
        title={LABELS.setup.restartConfirmTitle}
        body={LABELS.setup.restartConfirmBody}
        confirmLabel={LABELS.setup.restartConfirmLabel}
        danger
        busy={backupAction.isBusy}
        onConfirm={() => void restartSetup()}
        onCancel={() => setConfirmingSetupRestart(false)}
      />
    </div>
  );
};
