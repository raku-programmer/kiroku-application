import { useState } from 'react';
import { api } from '@renderer/api/client';
import { LoadingOverlay, OVERLAY_VARIANTS } from '@renderer/components/feedback/LoadingOverlay';
import { CheckIcon, DownloadIcon, UploadIcon } from '@renderer/components/icons/Icons';
import { Button, BUTTON_SIZES, BUTTON_VARIANTS } from '@renderer/components/ui/Button';
import { LABELS } from '@renderer/constants/labels';
import { LOADING_SCOPES } from '@renderer/constants/ui';
import { TOAST_TONES, useToast } from '@renderer/contexts/ToastContext';
import { useAsyncAction } from '@renderer/hooks/useAsyncAction';
import { UNCATEGORIZED_LABEL } from '@shared/constants/presets';
import type { CsvImportCommitItem, CsvImportPreview } from '@shared/types/csv-import';
import { formatDate, formatRate, formatTaxRate, formatTaxTreatment, formatYen } from '@shared/utils/format';
import './CsvImportDialog.css';

interface CsvImportDialogProps {
  open: boolean;
  onClose: () => void;
  /** 取り込みが 1 件でも成功したときに一覧を再取得させる */
  onImported: () => void;
}

/**
 * 経費一覧の「CSVから取り込み」ダイアログ。
 * ファイル選択 → 内容の確認（プレビュー） → 取り込み確定、の3段階で進める。
 */
export const CsvImportDialog = ({ open, onClose, onImported }: CsvImportDialogProps): JSX.Element | null => {
  const { showToast } = useToast();
  const parseAction = useAsyncAction();
  const commitAction = useAsyncAction();
  const templateAction = useAsyncAction();

  const [preview, setPreview] = useState<CsvImportPreview | null>(null);

  const reset = (): void => {
    setPreview(null);
  };

  const handleClose = (): void => {
    reset();
    onClose();
  };

  const handleSelectFile = async (): Promise<void> => {
    const result = await parseAction.run(() => api.imports.parseCsv(), {
      scope: LOADING_SCOPES.SECTION,
      loadingMessage: LABELS.csvImport.parsing,
    });
    if (result === null) {
      // ファイル選択のキャンセルは静かに戻る（結果がそもそも取れていない場合含む）
      return;
    }
    setPreview(result);
  };

  const handleDownloadTemplate = async (): Promise<void> => {
    const result = await templateAction.run(() => api.imports.downloadCsvTemplate(), {
      scope: LOADING_SCOPES.SECTION,
    });
    if (!result) {
      return;
    }
    showToast(
      result.canceled ? TOAST_TONES.INFO : TOAST_TONES.SUCCESS,
      result.canceled
        ? LABELS.csvImport.templateDownloadCanceled
        : `${LABELS.csvImport.templateDownloaded}（${result.filePath}）`,
    );
  };

  const handleImport = async (): Promise<void> => {
    if (!preview) {
      return;
    }
    const items: CsvImportCommitItem[] = preview.rows
      .filter((row) => row.status === 'ok' && row.input)
      .map((row) => ({ rowNumber: row.rowNumber, input: row.input! }));

    if (items.length === 0) {
      showToast(TOAST_TONES.ERROR, LABELS.csvImport.noImportableRows);
      return;
    }

    const result = await commitAction.run(() => api.imports.commitCsv(items), {
      scope: LOADING_SCOPES.GLOBAL,
      loadingMessage: LABELS.csvImport.importing,
    });
    if (!result) {
      return;
    }

    const message =
      result.failedCount > 0
        ? LABELS.csvImport.committedWithFailures
            .replace('{imported}', String(result.importedCount))
            .replace('{failed}', String(result.failedCount))
        : LABELS.csvImport.committed.replace('{imported}', String(result.importedCount));
    showToast(result.failedCount > 0 ? TOAST_TONES.INFO : TOAST_TONES.SUCCESS, message);

    if (result.importedCount > 0) {
      onImported();
    }
    handleClose();
  };

  if (!open) {
    return null;
  }

  const isBusy = parseAction.isBusy || commitAction.isBusy || templateAction.isBusy;

  return (
    <div className="csv-import__backdrop" role="presentation">
      <div className="csv-import" role="dialog" aria-modal="true">
        <header className="csv-import__header">
          <h2 className="csv-import__title">{LABELS.csvImport.title}</h2>
          <p className="csv-import__description">{LABELS.csvImport.description}</p>
        </header>

        <div className="csv-import__body">
          {!preview && (
            <div className="csv-import__intro">
              <Button
                variant={BUTTON_VARIANTS.SECONDARY}
                icon={<DownloadIcon width={18} height={18} />}
                onClick={() => void handleDownloadTemplate()}
                loading={templateAction.isBusy}
                disabled={isBusy && !templateAction.isBusy}
              >
                {LABELS.csvImport.downloadTemplate}
              </Button>
              <Button
                variant={BUTTON_VARIANTS.PRIMARY}
                icon={<UploadIcon width={18} height={18} />}
                onClick={() => void handleSelectFile()}
                loading={parseAction.isBusy}
                disabled={isBusy && !parseAction.isBusy}
              >
                {LABELS.csvImport.selectFile}
              </Button>
            </div>
          )}

          {preview && (
            <>
              <div className="csv-import__summary">
                <span className="csv-import__file-name">
                  {LABELS.csvImport.fileName}：{preview.fileName}
                </span>
                <span className="csv-import__stat csv-import__stat--ok">
                  <CheckIcon width={14} height={14} />
                  {`${LABELS.csvImport.okCount} ${preview.okCount}${LABELS.csvImport.unitRows}`}
                </span>
                {preview.errorCount > 0 && (
                  <span className="csv-import__stat csv-import__stat--error">
                    {`${LABELS.csvImport.errorCount} ${preview.errorCount}${LABELS.csvImport.unitRows}`}
                  </span>
                )}
              </div>

              <div className="csv-import__table-wrapper">
                <table className="csv-import__table">
                  <thead>
                    <tr>
                      <th>{LABELS.csvImport.columns.row}</th>
                      <th>{LABELS.csvImport.columns.date}</th>
                      <th>{LABELS.csvImport.columns.category}</th>
                      <th>{LABELS.csvImport.columns.payee}</th>
                      <th className="numeric">{LABELS.csvImport.columns.amount}</th>
                      <th>{LABELS.csvImport.columns.tax}</th>
                      <th className="numeric">{LABELS.csvImport.columns.allocation}</th>
                      <th>{LABELS.csvImport.columns.description}</th>
                      <th>{LABELS.csvImport.columns.error}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row) => (
                      <tr
                        key={row.rowNumber}
                        className={row.status === 'error' ? 'csv-import__row--error' : undefined}
                      >
                        <td className="numeric">{row.rowNumber}</td>
                        {row.status === 'ok' && row.input ? (
                          <>
                            <td>{formatDate(row.input.expenseDate)}</td>
                            <td>{row.raw.accountCategoryName || UNCATEGORIZED_LABEL}</td>
                            <td>{row.raw.payeeName}</td>
                            <td className="numeric">{formatYen(row.input.amount)}</td>
                            <td>
                              {formatTaxTreatment(row.input.taxTreatment)} /{' '}
                              {formatTaxRate(row.input.taxTreatment, row.input.taxRate)}
                            </td>
                            <td className="numeric">{formatRate(row.input.allocationRate)}</td>
                            <td className="csv-import__cell--wide">{row.input.description}</td>
                            <td>-</td>
                          </>
                        ) : (
                          <>
                            <td>{row.raw.expenseDate}</td>
                            <td>{row.raw.accountCategoryName}</td>
                            <td>{row.raw.payeeName}</td>
                            <td className="numeric">{row.raw.amount}</td>
                            <td>
                              {row.raw.taxTreatmentLabel} {row.raw.taxRateLabel}
                            </td>
                            <td className="numeric">{row.raw.allocationRateLabel}</td>
                            <td className="csv-import__cell--wide">{row.raw.description}</td>
                            <td className="csv-import__errors">{row.errors.join(' / ')}</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <LoadingOverlay visible={parseAction.isSpinning} variant={OVERLAY_VARIANTS.SECTION} />
        </div>

        <footer className="csv-import__actions">
          {preview && (
            <Button
              variant={BUTTON_VARIANTS.GHOST}
              size={BUTTON_SIZES.SMALL}
              onClick={() => reset()}
              disabled={isBusy}
            >
              {LABELS.csvImport.selectFile}
            </Button>
          )}
          <div className="csv-import__actions-spacer" />
          <Button variant={BUTTON_VARIANTS.GHOST} onClick={handleClose} disabled={isBusy}>
            {LABELS.common.cancel}
          </Button>
          {preview && (
            <Button
              variant={BUTTON_VARIANTS.PRIMARY}
              onClick={() => void handleImport()}
              loading={commitAction.isBusy}
              disabled={preview.okCount === 0 || isBusy}
            >
              {`${LABELS.csvImport.import}（${preview.okCount}${LABELS.csvImport.unitRows}）`}
            </Button>
          )}
        </footer>
      </div>
    </div>
  );
};
