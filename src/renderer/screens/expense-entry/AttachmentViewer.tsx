import { useEffect, useRef, useState } from 'react';
import { api } from '@renderer/api/client';
import { LoadingOverlay, OVERLAY_VARIANTS } from '@renderer/components/feedback/LoadingOverlay';
import { ChevronLeftIcon, ChevronRightIcon } from '@renderer/components/icons/Icons';
import { Button, BUTTON_SIZES, BUTTON_VARIANTS } from '@renderer/components/ui/Button';
import { LABELS } from '@renderer/constants/labels';
import { LOADING_SCOPES } from '@renderer/constants/ui';
import { useAsyncAction } from '@renderer/hooks/useAsyncAction';
import { ATTACHMENT_PREVIEW_KINDS } from '@shared/constants/attachments';
import type {
  AttachmentContent,
  AttachmentDraft,
  AttachmentSource,
} from '@shared/types/expense';
import { formatByteSize } from '@shared/utils/format';
import './AttachmentViewer.css';

interface AttachmentViewerProps {
  /** 添付欄が持っている一覧。保存前に追加した分もそのまま表示できる */
  attachments: AttachmentDraft[];
}

/** 表示中のファイル。中身は Blob URL にしてから img / iframe に渡す */
interface Preview {
  kind: AttachmentContent['kind'];
  /** 表示できない形式のときは null */
  url: string | null;
}

/**
 * PDF ビューアの操作部分を隠し、1 ページ目全体が収まるようにする指定。
 * ここは中身の確認だけができればよく、拡大は別ウィンドウに任せる。
 */
const PDF_VIEWER_OPTIONS = '#toolbar=0&navpanes=0&scrollbar=0&view=Fit';

/** 保存済みなら添付 ID、保存前なら選択元のパスで指す */
const toSource = (attachment: AttachmentDraft): AttachmentSource =>
  attachment.id != null ? { id: attachment.id } : { sourcePath: attachment.sourcePath ?? '' };

/** 同じファイルを指しているかの判定に使う。読み直しの要否をこれで決める */
const toKey = (attachment: AttachmentDraft): string =>
  attachment.id != null ? `id:${attachment.id}` : `path:${attachment.sourcePath ?? ''}`;

/**
 * IPC で受け取った中身を表示できる形にする。
 * Blob の入力型は共有バッファを含まない Uint8Array に限定されているため、ここで合わせる。
 */
const toObjectUrl = (bytes: Uint8Array, mimeType: string | null): string =>
  URL.createObjectURL(
    new Blob([bytes as BlobPart], mimeType ? { type: mimeType } : undefined),
  );

/**
 * 添付した領収書を 1 枚ずつ見るプレビュー。添付一覧のすぐ下に出す。
 * 画像・PDF の中身を確認できることが目的なので、送りボタンで手動で切り替える
 * 形にしている（自動再生はしない）。クリックすると別ウィンドウで大きく表示する。
 */
export const AttachmentViewer = ({
  attachments,
}: AttachmentViewerProps): JSX.Element | null => {
  const { run, isSpinning } = useAsyncAction();

  const [index, setIndex] = useState(0);
  const [preview, setPreview] = useState<Preview | null>(null);
  /** 読み込めたが描画できなかった場合（壊れたファイルなど） */
  const [renderFailed, setRenderFailed] = useState(false);
  /** 直前の枚数。増えたときに追加した 1 枚へ送るために持つ */
  const previousCount = useRef(attachments.length);

  // 添付を外して枚数が減ったときに、範囲外を指したままにしない
  const position = Math.min(index, Math.max(attachments.length - 1, 0));
  const current = attachments[position] ?? null;
  const sourceKey = current ? toKey(current) : null;

  // 追加した直後は、その 1 枚をそのまま確認できるようにする
  useEffect(() => {
    if (attachments.length > previousCount.current) {
      setIndex(attachments.length - 1);
    }
    previousCount.current = attachments.length;
  }, [attachments.length]);

  useEffect(() => {
    if (current == null) {
      setPreview(null);
      return undefined;
    }

    let canceled = false;
    let objectUrl: string | null = null;

    // 表示中のものを先に外す（切り替え前の画像が残って見えないように）
    setPreview(null);
    setRenderFailed(false);

    void run(() => api.attachments.read(toSource(current)), {
      scope: LOADING_SCOPES.SECTION,
    }).then((content) => {
      if (!content || canceled) {
        return;
      }
      objectUrl = content.bytes ? toObjectUrl(content.bytes, content.mimeType) : null;
      setPreview({ kind: content.kind, url: objectUrl });
    });

    return () => {
      canceled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
    // 表示対象が変わったときだけ読み直す（run は毎描画で作り直されるため除く）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceKey]);

  // 添付が 1 つも無いときは、添付欄の下に何も足さない
  if (current == null) {
    return null;
  }

  const canZoom = preview?.url != null && !renderFailed;

  const handleZoom = (): void => {
    void api.attachments.openInWindow(toSource(current));
  };

  const handleOpenExternal = (): void => {
    if (current.id != null) {
      void api.attachments.open(current.id);
      return;
    }
    // 保存前のファイルは実体がまだ選択元にあるので、そちらを開く
    if (current.sourcePath) {
      void api.system.openPath(current.sourcePath);
    }
  };

  return (
    <div className="attachment-viewer">
      <div className="attachment-viewer__stage">
        {canZoom ? (
          <button
            type="button"
            className="attachment-viewer__zoom"
            onClick={handleZoom}
            title={LABELS.entry.attachmentPreviewZoom}
          >
            {preview?.kind === ATTACHMENT_PREVIEW_KINDS.PDF ? (
              // クリックを拡大表示に使うため、PDF ビューア自体には触らせない
              <iframe
                className="attachment-viewer__pdf"
                src={`${preview.url ?? ''}${PDF_VIEWER_OPTIONS}`}
                title={current.originalName}
                tabIndex={-1}
              />
            ) : (
              <img
                className="attachment-viewer__image"
                src={preview?.url ?? ''}
                alt={current.originalName}
                onError={() => setRenderFailed(true)}
              />
            )}
          </button>
        ) : (
          preview !== null && (
            <div className="attachment-viewer__fallback">
              <p>
                {renderFailed
                  ? LABELS.entry.attachmentPreviewFailed
                  : LABELS.entry.attachmentPreviewUnsupported}
              </p>
              <Button
                variant={BUTTON_VARIANTS.SECONDARY}
                size={BUTTON_SIZES.SMALL}
                onClick={handleOpenExternal}
              >
                {LABELS.entry.attachmentOpenExternal}
              </Button>
            </div>
          )
        )}

        <LoadingOverlay visible={isSpinning} variant={OVERLAY_VARIANTS.SECTION} />
      </div>

      {/* 1 枚だけのときは送りボタンを出さない */}
      {attachments.length > 1 && (
        <div className="attachment-viewer__bar">
          <Button
            variant={BUTTON_VARIANTS.GHOST}
            size={BUTTON_SIZES.SMALL}
            icon={<ChevronLeftIcon width={16} height={16} />}
            onClick={() => setIndex(position - 1)}
            disabled={position === 0}
            aria-label={LABELS.entry.attachmentPreviewPrevious}
            title={LABELS.entry.attachmentPreviewPrevious}
          />
          <span className="attachment-viewer__position">
            {LABELS.entry.attachmentPreviewPosition
              .replace('{current}', String(position + 1))
              .replace('{total}', String(attachments.length))}
          </span>
          <Button
            variant={BUTTON_VARIANTS.GHOST}
            size={BUTTON_SIZES.SMALL}
            icon={<ChevronRightIcon width={16} height={16} />}
            onClick={() => setIndex(position + 1)}
            disabled={position >= attachments.length - 1}
            aria-label={LABELS.entry.attachmentPreviewNext}
            title={LABELS.entry.attachmentPreviewNext}
          />
        </div>
      )}

      <p className="attachment-viewer__name" title={current.originalName}>
        <span className="attachment-viewer__file">{current.originalName}</span>
        <span className="attachment-viewer__size">{formatByteSize(current.byteSize)}</span>
      </p>

      {canZoom && (
        <p className="attachment-viewer__hint">{LABELS.entry.attachmentPreviewZoom}</p>
      )}
    </div>
  );
};
