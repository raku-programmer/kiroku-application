import { useEffect, useState } from 'react';
import { api } from '@renderer/api/client';
import { LoadingOverlay, OVERLAY_VARIANTS } from '@renderer/components/feedback/LoadingOverlay';
import { CheckIcon } from '@renderer/components/icons/Icons';
import { ConfirmDialog } from '@renderer/components/modal/ConfirmDialog';
import { Button, BUTTON_VARIANTS } from '@renderer/components/ui/Button';
import { LABELS } from '@renderer/constants/labels';
import { LOADING_SCOPES } from '@renderer/constants/ui';
import { useAppData } from '@renderer/contexts/AppDataContext';
import { useAsyncAction } from '@renderer/hooks/useAsyncAction';
import { PresetEditor } from '@renderer/screens/settings/PresetEditor';
import {
  BackupSettingFields,
  DisplayDefaultFields,
  ExportSettingFields,
  type DirectorySettingKey,
} from '@renderer/screens/settings/SettingFields';
import { PRESET_KINDS, usePresetActions } from '@renderer/screens/settings/usePresetActions';
import type { AppSettings } from '@shared/types/settings';
import './SetupWizard.css';

/** セットアップの順序。ここに足せばステップが増える。 */
const SETUP_STEPS = [
  {
    id: 'presets',
    title: LABELS.setup.stepPresets,
    description: LABELS.setup.stepPresetsDescription,
  },
  {
    id: 'export',
    title: LABELS.setup.stepExport,
    description: LABELS.setup.stepExportDescription,
  },
  {
    id: 'backup',
    title: LABELS.setup.stepBackup,
    description: LABELS.setup.stepBackupDescription,
  },
] as const;

interface SetupWizardProps {
  /** セットアップを終えたとき。呼び出し側で案内ダイアログを出す */
  onCompleted: () => void;
}

export const SetupWizard = ({ onCompleted }: SetupWizardProps): JSX.Element => {
  const { settings, accountCategories, paymentMethods, applySettings } = useAppData();
  const settingAction = useAsyncAction();
  const presets = usePresetActions();

  const [stepIndex, setStepIndex] = useState(0);
  const [defaultBackupDirectory, setDefaultBackupDirectory] = useState('');

  useEffect(() => {
    let canceled = false;
    void api.settings.storageLocations().then((result) => {
      if (!canceled && result.ok) {
        setDefaultBackupDirectory(result.data.backupDirectory);
      }
    });
    return () => {
      canceled = true;
    };
  }, []);

  const patchSettings = (patch: Partial<AppSettings>): void => {
    void settingAction.run(() => api.settings.update(patch), {
      scope: LOADING_SCOPES.SECTION,
      onSuccess: applySettings,
    });
  };

  const chooseDirectory = async (key: DirectorySettingKey): Promise<void> => {
    const selected = await settingAction.run(
      () => api.settings.chooseDirectory(settings[key]),
      { scope: LOADING_SCOPES.SECTION },
    );
    if (selected) {
      patchSettings({ [key]: selected } as Partial<AppSettings>);
    }
  };

  const finish = async (): Promise<void> => {
    // 完了の知らせは案内ダイアログが担うのでトーストは出さない。
    // 全体オーバーレイもダイアログに被るため、この画面の中だけに留める。
    await settingAction.run(() => api.settings.update({ setupCompleted: true }), {
      scope: LOADING_SCOPES.SECTION,
      onSuccess: (updated) => {
        applySettings(updated);
        onCompleted();
      },
    });
  };

  const step = SETUP_STEPS[stepIndex];
  const isLastStep = stepIndex === SETUP_STEPS.length - 1;

  const renderStep = (): JSX.Element => {
    switch (step.id) {
      case 'export':
        return (
          <ExportSettingFields
            settings={settings}
            onPatch={patchSettings}
            onChooseDirectory={(key) => void chooseDirectory(key)}
          />
        );
      case 'backup':
        return (
          <BackupSettingFields
            settings={settings}
            onPatch={patchSettings}
            onChooseDirectory={(key) => void chooseDirectory(key)}
            defaultBackupDirectory={defaultBackupDirectory}
          />
        );
      case 'presets':
      default:
        return (
          <>
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

            <div className="setup__divider" />

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

            <div className="setup__divider" />

            <DisplayDefaultFields settings={settings} onPatch={patchSettings} />
          </>
        );
    }
  };

  return (
    <div className="setup">
      <header className="setup__header">
        <div className="setup__heading">
          <span className="setup__app">{LABELS.app.name}</span>
          <h1 className="setup__title">{LABELS.setup.title}</h1>
        </div>
        <p className="setup__description">{LABELS.setup.description}</p>
      </header>

      <ol className="setup__steps">
        {SETUP_STEPS.map((item, index) => {
          const state = index < stepIndex ? 'done' : index === stepIndex ? 'current' : 'todo';
          return (
            <li className={`setup__step setup__step--${state}`} key={item.id}>
              <span className="setup__step-mark">
                {state === 'done' ? <CheckIcon width={14} height={14} /> : index + 1}
              </span>
              <span className="setup__step-label">{item.title}</span>
            </li>
          );
        })}
      </ol>

      {/* 本文だけをスクロールさせ、見出しと操作ボタンは常に見えるようにする */}
      <div className="setup__main">
        <section className="setup__body">
          <h2 className="setup__step-title">{step.title}</h2>
          <p className="setup__step-description">{step.description}</p>
          <div className="setup__fields">{renderStep()}</div>
        </section>
        <LoadingOverlay
          visible={settingAction.isSpinning || presets.isSpinning}
          variant={OVERLAY_VARIANTS.SECTION}
        />
      </div>

      <footer className="setup__actions">
        <span className="setup__progress">
          {`${LABELS.setup.stepLabel} ${stepIndex + 1} / ${SETUP_STEPS.length}`}
        </span>
        <Button
          variant={BUTTON_VARIANTS.GHOST}
          disabled={stepIndex === 0}
          onClick={() => setStepIndex((current) => Math.max(current - 1, 0))}
        >
          {LABELS.common.previous}
        </Button>
        {isLastStep ? (
          <Button
            variant={BUTTON_VARIANTS.PRIMARY}
            onClick={() => void finish()}
            loading={settingAction.isBusy}
          >
            {LABELS.setup.finish}
          </Button>
        ) : (
          <Button
            variant={BUTTON_VARIANTS.PRIMARY}
            onClick={() =>
              setStepIndex((current) => Math.min(current + 1, SETUP_STEPS.length - 1))
            }
          >
            {LABELS.common.next}
          </Button>
        )}
      </footer>

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
    </div>
  );
};
