import { useEffect, useRef, useState, type DragEvent } from 'react';
import { api } from '@renderer/api/client';
import { Button, BUTTON_SIZES, BUTTON_VARIANTS } from '@renderer/components/ui/Button';
import {
  ClipboardIcon,
  CloseIcon,
  FolderIcon,
  PaperclipIcon,
  PlusIcon,
} from '@renderer/components/icons/Icons';
import { LABELS } from '@renderer/constants/labels';
import { useAsyncAction } from '@renderer/hooks/useAsyncAction';
import { AttachmentViewer } from '@renderer/screens/expense-entry/AttachmentViewer';
import { ImportPickerDialog } from '@renderer/screens/expense-entry/ImportPickerDialog';
import type { AttachmentDraft } from '@shared/types/expense';
import { formatByteSize } from '@shared/utils/format';
import './AttachmentField.css';

interface AttachmentFieldProps {
  attachments: AttachmentDraft[];
  disabled: boolean;
  onChange: (attachments: AttachmentDraft[]) => void;
}

export const AttachmentField = ({
  attachments,
  disabled,
  onChange,
}: AttachmentFieldProps): JSX.Element => {
  const { run, isBusy } = useAsyncAction();
  const [dragging, setDragging] = useState(false);
  const [importPickerOpen, setImportPickerOpen] = useState(false);

  /**
   * 追加処理は document のイベントからも呼ぶ。
   * リスナーを張り直さずに済むよう、最新の一覧と onChange は ref で持つ。
   */
  const latest = useRef({ attachments, onChange, disabled });
  latest.current = { attachments, onChange, disabled };

  const append = (added: AttachmentDraft[]): void => {
    if (added.length > 0) {
      const { attachments: current, onChange: notify } = latest.current;
      notify([...current, ...added]);
    }
  };

  const handlePick = async (): Promise<void> => {
    const picked = await run(() => api.attachments.pick());
    if (picked) {
      append(picked);
    }
  };

  const handlePasteFromClipboard = async (): Promise<void> => {
    const pasted = await run(() => api.attachments.fromClipboard());
    if (pasted) {
      append(pasted);
    }
  };

  /**
   * Ctrl+V で貼り付けられるようにする。
   * クリップボードに画像があるときだけ横取りし、
   * 備考欄などへの文字の貼り付けは邪魔しない。
   */
  useEffect(() => {
    const handlePaste = (event: ClipboardEvent): void => {
      if (latest.current.disabled) {
        return;
      }
      const hasImage = Array.from(event.clipboardData?.items ?? []).some((item) =>
        item.type.startsWith('image/'),
      );
      if (!hasImage) {
        return;
      }
      event.preventDefault();
      void handlePasteFromClipboard();
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
    // ref 経由で最新値を見るため、張り直しは不要
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDrop = async (event: DragEvent<HTMLDivElement>): Promise<void> => {
    event.preventDefault();
    setDragging(false);
    if (disabled) {
      return;
    }
    const paths = Array.from(event.dataTransfer.files).map((file) =>
      api.attachments.getPathForFile(file),
    );
    if (paths.length === 0) {
      return;
    }
    const resolved = await run(() => api.attachments.resolvePaths(paths));
    if (resolved) {
      append(resolved);
    }
  };

  const handleOpen = async (attachment: AttachmentDraft): Promise<void> => {
    if (attachment.id == null) {
      return;
    }
    await run(() => api.attachments.open(attachment.id as number));
  };

  const handleRemove = (index: number): void => {
    onChange(attachments.filter((_, position) => position !== index));
  };

  return (
    <div className="attachment-field">
      <div
        className={`attachment-field__dropzone${
          dragging ? ' attachment-field__dropzone--dragging' : ''
        }`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => void handleDrop(event)}
      >
        <div className="attachment-field__actions">
          <Button
            variant={BUTTON_VARIANTS.SECONDARY}
            size={BUTTON_SIZES.SMALL}
            icon={<PlusIcon width={16} height={16} />}
            onClick={() => void handlePick()}
            disabled={disabled}
            loading={isBusy}
          >
            {LABELS.entry.attachmentAdd}
          </Button>
          <Button
            variant={BUTTON_VARIANTS.SECONDARY}
            size={BUTTON_SIZES.SMALL}
            icon={<ClipboardIcon width={16} height={16} />}
            onClick={() => void handlePasteFromClipboard()}
            disabled={disabled || isBusy}
          >
            {LABELS.entry.attachmentPaste}
          </Button>
          <Button
            variant={BUTTON_VARIANTS.SECONDARY}
            size={BUTTON_SIZES.SMALL}
            icon={<FolderIcon width={16} height={16} />}
            onClick={() => setImportPickerOpen(true)}
            disabled={disabled || isBusy}
          >
            {LABELS.entry.attachmentFromFolder}
          </Button>
        </div>
        <p className="attachment-field__hint">{LABELS.entry.attachmentDropHint}</p>

        {attachments.length > 0 && (
          <ul className="attachment-field__list">
            {attachments.map((attachment, index) => (
              <li className="attachment-field__item" key={`${attachment.id ?? 'new'}-${index}`}>
                <PaperclipIcon width={16} height={16} />
                {attachment.id != null ? (
                  <button
                    type="button"
                    className="attachment-field__name attachment-field__name--link"
                    onClick={() => void handleOpen(attachment)}
                    title={LABELS.common.open}
                  >
                    {attachment.originalName}
                  </button>
                ) : (
                  <span className="attachment-field__name">{attachment.originalName}</span>
                )}
                <span className="attachment-field__size">
                  {formatByteSize(attachment.byteSize)}
                </span>
                <button
                  type="button"
                  className="attachment-field__remove"
                  onClick={() => handleRemove(index)}
                  disabled={disabled}
                  aria-label={LABELS.entry.attachmentRemove}
                  title={LABELS.entry.attachmentRemove}
                >
                  <CloseIcon width={14} height={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 添付したファイルの中身は、一覧のすぐ下でそのまま確認できるようにする */}
      <AttachmentViewer attachments={attachments} />

      <ImportPickerDialog
        open={importPickerOpen}
        onClose={() => setImportPickerOpen(false)}
        onSelected={append}
      />
    </div>
  );
};
