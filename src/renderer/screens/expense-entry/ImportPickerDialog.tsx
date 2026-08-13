import { useEffect, useState } from 'react';
import { api } from '@renderer/api/client';
import { LoadingOverlay, OVERLAY_VARIANTS } from '@renderer/components/feedback/LoadingOverlay';
import { FolderIcon, RestoreIcon } from '@renderer/components/icons/Icons';
import { Button, BUTTON_SIZES, BUTTON_VARIANTS } from '@renderer/components/ui/Button';
import { LABELS } from '@renderer/constants/labels';
import { LOADING_SCOPES } from '@renderer/constants/ui';
import { useAppData } from '@renderer/contexts/AppDataContext';
import { useAsyncAction } from '@renderer/hooks/useAsyncAction';
import { IMPORT_PICKER_MAX_FILES } from '@shared/constants/attachments';
import type { AttachmentDraft, ImportCandidate } from '@shared/types/expense';
import { formatByteSize, formatDateTime } from '@shared/utils/format';
import './ImportPickerDialog.css';

interface ImportPickerDialogProps {
  open: boolean;
  onClose: () => void;
  onSelected: (drafts: AttachmentDraft[]) => void;
}

/**
 * 取り込みフォルダに置かれた画像から添付を選ぶダイアログ。
 * スマホから Bluetooth・クラウド同期などで送った画像の受け皿になる。
 * ファイル名だけでは目的の 1 枚を選べないため、サムネイルを並べる。
 */
export const ImportPickerDialog = ({
  open,
  onClose,
  onSelected,
}: ImportPickerDialogProps): JSX.Element | null => {
  const { settings } = useAppData();
  const listAction = useAsyncAction();
  const attachAction = useAsyncAction();

  const [candidates, setCandidates] = useState<ImportCandidate[]>([]);
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  /** 一度でも読み込んだか。未読込と 0 件を区別して案内を出し分ける */
  const [loaded, setLoaded] = useState(false);

  const load = async (): Promise<void> => {
    const result = await listAction.run(() => api.attachments.listImportCandidates(), {
      scope: LOADING_SCOPES.SECTION,
    });
    if (result) {
      setCandidates(result);
    }
    setLoaded(true);
  };

  useEffect(() => {
    if (!open) {
      return;
    }
    setSelectedPaths([]);
    setLoaded(false);
    void load();
    // 開いたときだけ読み込む
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) {
    return null;
  }

  const toggle = (filePath: string): void => {
    setSelectedPaths((current) =>
      current.includes(filePath)
        ? current.filter((item) => item !== filePath)
        : [...current, filePath],
    );
  };

  const handleAttach = async (): Promise<void> => {
    if (selectedPaths.length === 0) {
      return;
    }
    const drafts = await attachAction.run(
      () => api.attachments.resolvePaths(selectedPaths),
      { scope: LOADING_SCOPES.SECTION },
    );
    if (drafts) {
      onSelected(drafts);
      onClose();
    }
  };

  const isBusy = listAction.isBusy || attachAction.isBusy;

  return (
    <div className="import-picker__backdrop" role="presentation">
      <div className="import-picker" role="dialog" aria-modal="true">
        <header className="import-picker__header">
          <h2 className="import-picker__title">{LABELS.importPicker.title}</h2>
          <p className="import-picker__description">{LABELS.importPicker.description}</p>
          <div className="import-picker__folder">
            <span className="settings-path">
              {settings.importDirectory ?? LABELS.settings.useDefault}
            </span>
            <Button
              variant={BUTTON_VARIANTS.GHOST}
              size={BUTTON_SIZES.SMALL}
              icon={<FolderIcon width={16} height={16} />}
              onClick={() => {
                if (settings.importDirectory) {
                  void api.system.openPath(settings.importDirectory);
                }
              }}
              disabled={!settings.importDirectory}
            >
              {LABELS.importPicker.openFolder}
            </Button>
            <Button
              variant={BUTTON_VARIANTS.GHOST}
              size={BUTTON_SIZES.SMALL}
              icon={<RestoreIcon width={16} height={16} />}
              onClick={() => void load()}
              loading={listAction.isBusy}
            >
              {LABELS.importPicker.reload}
            </Button>
          </div>
        </header>

        <div className="import-picker__body">
          {loaded && candidates.length === 0 && (
            <p className="import-picker__empty">
              {settings.importDirectory
                ? LABELS.importPicker.empty
                : LABELS.importPicker.notConfigured}
            </p>
          )}

          {candidates.length > 0 && (
            <>
              <ul className="import-picker__grid">
                {candidates.map((candidate) => {
                  const selected = selectedPaths.includes(candidate.filePath);
                  return (
                    <li key={candidate.filePath}>
                      <button
                        type="button"
                        className={`import-picker__item${
                          selected ? ' import-picker__item--selected' : ''
                        }`}
                        onClick={() => toggle(candidate.filePath)}
                        aria-pressed={selected}
                        title={candidate.fileName}
                      >
                        <span className="import-picker__thumb">
                          {candidate.thumbnailDataUrl ? (
                            <img src={candidate.thumbnailDataUrl} alt="" />
                          ) : (
                            <span className="import-picker__no-thumb">
                              {LABELS.importPicker.noThumbnail}
                            </span>
                          )}
                        </span>
                        <span className="import-picker__name">{candidate.fileName}</span>
                        <span className="import-picker__meta">
                          {formatDateTime(candidate.modifiedAt)} /{' '}
                          {formatByteSize(candidate.byteSize)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <p className="import-picker__note">
                {LABELS.importPicker.limitNote.replace(
                  '{max}',
                  String(IMPORT_PICKER_MAX_FILES),
                )}
              </p>
            </>
          )}

          <LoadingOverlay visible={listAction.isSpinning} variant={OVERLAY_VARIANTS.SECTION} />
        </div>

        <footer className="import-picker__actions">
          <span className="import-picker__selected">
            {LABELS.importPicker.selectedCount.replace(
              '{count}',
              String(selectedPaths.length),
            )}
          </span>
          <Button variant={BUTTON_VARIANTS.GHOST} onClick={onClose} disabled={isBusy}>
            {LABELS.common.cancel}
          </Button>
          <Button
            variant={BUTTON_VARIANTS.PRIMARY}
            onClick={() => void handleAttach()}
            loading={attachAction.isBusy}
            disabled={selectedPaths.length === 0 || isBusy}
          >
            {LABELS.importPicker.attach}
          </Button>
        </footer>
      </div>
    </div>
  );
};
