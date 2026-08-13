import { BrowserWindow, clipboard, dialog, nativeImage, shell } from 'electron';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import {
  buildAttachmentSubDirectory,
  getClipboardTempDirectory,
  getDefaultImportDirectory,
} from '@main/config/paths';
import { loadSettings } from '@main/db/repositories/setting-repository';
import {
  deleteAttachments,
  findAttachment,
  insertAttachment,
  listAttachmentsByExpense,
} from '@main/db/repositories/attachment-repository';
import { AppException, notFoundError, validationError } from '@main/errors';
import { showAttachmentWindow } from '@main/windows/attachment-window';
import { ERROR_CODES } from '@shared/constants/error-codes';
import {
  ALLOWED_ATTACHMENT_EXTENSIONS,
  ATTACHMENT_FILE_FILTERS,
  ATTACHMENT_MIME_TYPES,
  ATTACHMENT_PREVIEW_KINDS,
  CLIPBOARD_FILE_EXTENSION,
  CLIPBOARD_FILE_PREFIX,
  COMPRESSIBLE_IMAGE_EXTENSIONS,
  IMAGE_COMPRESSION_JPEG_QUALITY,
  IMAGE_COMPRESSION_MAX_EDGE_PIXELS,
  IMAGE_COMPRESSION_MIN_BYTE_SIZE,
  IMPORT_PICKER_MAX_FILES,
  IMPORT_THUMBNAIL_JPEG_QUALITY,
  IMPORT_THUMBNAIL_MAX_EDGE_PIXELS,
  MAX_ATTACHMENTS_PER_EXPENSE,
  MAX_ATTACHMENT_BYTE_SIZE,
  PDF_EXTENSION,
  PREVIEWABLE_IMAGE_EXTENSIONS,
  type AttachmentPreviewKind,
} from '@shared/constants/attachments';
import type {
  Attachment,
  AttachmentContent,
  AttachmentDraft,
  AttachmentSource,
  ImportCandidate,
} from '@shared/types/expense';
import { formatByteSize } from '@shared/utils/format';
import { toTimestampString } from '@shared/utils/period';

const getExtension = (filePath: string): string =>
  path.extname(filePath).replace('.', '').toLowerCase();

const resolveMimeType = (filePath: string): string | null =>
  ATTACHMENT_MIME_TYPES[getExtension(filePath)] ?? null;

/** ファイルパスから添付候補を作る。拡張子・サイズをここで検証する。 */
export const resolveAttachmentDrafts = async (
  filePaths: string[],
): Promise<AttachmentDraft[]> => {
  const drafts: AttachmentDraft[] = [];

  for (const filePath of filePaths) {
    const extension = getExtension(filePath);
    if (!ALLOWED_ATTACHMENT_EXTENSIONS.includes(extension)) {
      throw validationError(
        `対応していない形式のファイルです（${path.basename(filePath)}）。`,
      );
    }
    let stats: fs.Stats;
    try {
      stats = await fsp.stat(filePath);
    } catch {
      throw new AppException(
        ERROR_CODES.FILE_ERROR,
        `ファイルを読み取れませんでした（${path.basename(filePath)}）。`,
      );
    }
    if (stats.size > MAX_ATTACHMENT_BYTE_SIZE) {
      throw validationError(
        `ファイルサイズが上限（${formatByteSize(MAX_ATTACHMENT_BYTE_SIZE)}）を超えています` +
          `（${path.basename(filePath)}）。`,
      );
    }
    drafts.push({
      id: null,
      originalName: path.basename(filePath),
      sourcePath: filePath,
      byteSize: stats.size,
    });
  }

  return drafts;
};

/** ファイル選択ダイアログを開き、添付候補を返す。 */
export const pickAttachments = async (
  parentWindow: BrowserWindow | null,
): Promise<AttachmentDraft[]> => {
  const options: Electron.OpenDialogOptions = {
    title: '領収書ファイルを選択',
    properties: ['openFile', 'multiSelections'],
    filters: ATTACHMENT_FILE_FILTERS.map((filter) => ({ ...filter })),
  };
  const result = parentWindow
    ? await dialog.showOpenDialog(parentWindow, options)
    : await dialog.showOpenDialog(options);

  if (result.canceled) {
    return [];
  }
  return resolveAttachmentDrafts(result.filePaths);
};

/**
 * クリップボードの画像を添付候補にする。
 *
 * バッファのまま扱わず一時ファイルへ書き出すのは、以降の検証・圧縮・保存を
 * 既存のファイルパス前提の流れ（resolveAttachmentDrafts → copyToStorage）に
 * そのまま乗せるため。
 */
export const createDraftFromClipboard = async (): Promise<AttachmentDraft[]> => {
  const image = clipboard.readImage();
  if (image.isEmpty()) {
    throw validationError(
      'クリップボードに画像がありません。画像をコピーしてから実行してください。',
    );
  }

  const directory = getClipboardTempDirectory();
  await fsp.mkdir(directory, { recursive: true });
  const fileName = `${CLIPBOARD_FILE_PREFIX}${toTimestampString()}.${CLIPBOARD_FILE_EXTENSION}`;
  const filePath = path.join(directory, fileName);
  await fsp.writeFile(filePath, image.toPNG());

  return resolveAttachmentDrafts([filePath]);
};

/**
 * 貼り付け用の一時ファイルをまとめて捨てる。
 * 添付せずに閉じた分が溜まり続けないよう、起動時に呼ぶ。
 */
export const clearClipboardTempFiles = async (): Promise<void> => {
  await fsp
    .rm(getClipboardTempDirectory(), { recursive: true, force: true })
    .catch(() => undefined);
};

/** 設定で指定された取り込み元。未設定なら OS のピクチャフォルダ */
const resolveImportDirectory = (): string =>
  loadSettings().importDirectory ?? getDefaultImportDirectory();

/** 一覧に並べる小さな画像を作る。画像として読めない形式は null（PDF など） */
const buildThumbnail = (filePath: string): string | null => {
  const image = nativeImage.createFromPath(filePath);
  if (image.isEmpty()) {
    return null;
  }
  const { width, height } = image.getSize();
  const resized = image.resize(
    width >= height
      ? { width: IMPORT_THUMBNAIL_MAX_EDGE_PIXELS, quality: 'good' }
      : { height: IMPORT_THUMBNAIL_MAX_EDGE_PIXELS, quality: 'good' },
  );
  return nativeImage
    .createFromBuffer(resized.toJPEG(IMPORT_THUMBNAIL_JPEG_QUALITY))
    .toDataURL();
};

/**
 * 取り込みフォルダにあるファイルを新しい順に返す。
 * Bluetooth の受信先やクラウド同期先を指定しておけば、
 * スマホから送った画像をここから選んで添付できる。
 */
export const listImportCandidates = async (): Promise<ImportCandidate[]> => {
  const directory = resolveImportDirectory();
  let entries: fs.Dirent[];
  try {
    entries = await fsp.readdir(directory, { withFileTypes: true });
  } catch {
    // フォルダが無い・読めない場合は「0 件」として扱う（画面側で案内する）
    return [];
  }

  const files = entries.filter(
    (entry) => entry.isFile() && ALLOWED_ATTACHMENT_EXTENSIONS.includes(getExtension(entry.name)),
  );

  const stated = await Promise.all(
    files.map(async (entry) => {
      const filePath = path.join(directory, entry.name);
      try {
        const stats = await fsp.stat(filePath);
        return { filePath, fileName: entry.name, stats };
      } catch {
        return null;
      }
    }),
  );

  return stated
    .filter((item): item is NonNullable<typeof item> => item !== null)
    // 上限を超えるフォルダでもサムネイル生成が重くならないよう、先に絞ってから作る
    .sort((a, b) => b.stats.mtimeMs - a.stats.mtimeMs)
    .slice(0, IMPORT_PICKER_MAX_FILES)
    .map((item) => ({
      filePath: item.filePath,
      fileName: item.fileName,
      byteSize: item.stats.size,
      modifiedAt: item.stats.mtime.toISOString(),
      thumbnailDataUrl: buildThumbnail(item.filePath),
    }));
};

/**
 * 画像を縮小・再エンコードして小さくする。圧縮できない場合は null を返す。
 *
 * 形式（拡張子）は変えない。PNG を JPEG にすると透過が失われ、
 * 文字主体のスクリーンショットでは劣化が目立つため。
 * PDF・HEIC などは nativeImage が読めず isEmpty() になるので自然に対象外になる。
 */
const compressImage = (sourcePath: string, sourceSize: number): Buffer | null => {
  const extension = getExtension(sourcePath);
  if (!COMPRESSIBLE_IMAGE_EXTENSIONS.includes(extension)) {
    return null;
  }
  // 小さい画像は再エンコードしても得がない
  if (sourceSize < IMAGE_COMPRESSION_MIN_BYTE_SIZE) {
    return null;
  }

  const image = nativeImage.createFromPath(sourcePath);
  if (image.isEmpty()) {
    return null;
  }

  const { width, height } = image.getSize();
  const longestEdge = Math.max(width, height);
  // 長辺だけを指定すると、もう一方は縦横比を保って決まる
  const resized =
    longestEdge > IMAGE_COMPRESSION_MAX_EDGE_PIXELS
      ? image.resize(
          width >= height
            ? { width: IMAGE_COMPRESSION_MAX_EDGE_PIXELS, quality: 'good' }
            : { height: IMAGE_COMPRESSION_MAX_EDGE_PIXELS, quality: 'good' },
        )
      : image;

  const compressed =
    extension === 'png' ? resized.toPNG() : resized.toJPEG(IMAGE_COMPRESSION_JPEG_QUALITY);

  // 元より大きくなるなら意味がないので採用しない
  return compressed.length > 0 && compressed.length < sourceSize ? compressed : null;
};

interface StoredFile {
  storedPath: string;
  /** 実際に書き込んだサイズ。圧縮した場合は元より小さくなる */
  byteSize: number;
}

const copyToStorage = async (
  expenseDate: string,
  sourcePath: string,
  sourceSize: number,
): Promise<StoredFile> => {
  const directory = buildAttachmentSubDirectory(expenseDate);
  await fsp.mkdir(directory, { recursive: true });
  const extension = getExtension(sourcePath);
  const storedPath = path.join(directory, `${randomUUID()}.${extension}`);

  const compressed = compressImage(sourcePath, sourceSize);
  if (compressed) {
    await fsp.writeFile(storedPath, compressed);
    return { storedPath, byteSize: compressed.length };
  }

  await fsp.copyFile(sourcePath, storedPath);
  return { storedPath, byteSize: sourceSize };
};

const removeFileQuietly = async (filePath: string): Promise<void> => {
  try {
    await fsp.rm(filePath, { force: true });
  } catch {
    // 実体が既に無い場合は無視する
  }
};

/**
 * 経費に紐づく添付を drafts の内容に一致させる。
 * drafts に含まれない既存添付はレコードと実ファイルの両方を削除する。
 */
export const syncAttachments = async (
  expenseId: number,
  expenseDate: string,
  drafts: AttachmentDraft[],
): Promise<void> => {
  if (drafts.length > MAX_ATTACHMENTS_PER_EXPENSE) {
    throw validationError(
      `添付できるファイルは ${MAX_ATTACHMENTS_PER_EXPENSE} 件までです。`,
    );
  }

  const existing = listAttachmentsByExpense(expenseId);
  const keptIds = new Set(
    drafts.map((draft) => draft.id).filter((id): id is number => id != null),
  );
  const removed = existing.filter((attachment) => !keptIds.has(attachment.id));

  if (removed.length > 0) {
    deleteAttachments(removed.map((attachment) => attachment.id));
    await Promise.all(removed.map((attachment) => removeFileQuietly(attachment.storedPath)));
  }

  for (const draft of drafts) {
    if (draft.id != null || draft.sourcePath == null) {
      continue;
    }
    const stored = await copyToStorage(expenseDate, draft.sourcePath, draft.byteSize);
    insertAttachment({
      expenseId,
      originalName: draft.originalName,
      storedPath: stored.storedPath,
      mimeType: resolveMimeType(draft.sourcePath),
      // 圧縮した場合は縮んだあとのサイズを記録する
      byteSize: stored.byteSize,
    });
  }
};

/** 経費削除時に、実ファイルも削除する（レコードは CASCADE で消える）。 */
export const removeAttachmentFiles = async (attachments: Attachment[]): Promise<void> => {
  await Promise.all(attachments.map((attachment) => removeFileQuietly(attachment.storedPath)));
};

/** 添付を 1 件取り出す。レコードと実体の両方が揃っていなければエラーにする。 */
const requireStoredAttachment = (attachmentId: number): Attachment => {
  const attachment = findAttachment(attachmentId);
  if (!attachment) {
    throw notFoundError('添付ファイルが見つかりません。');
  }
  if (!fs.existsSync(attachment.storedPath)) {
    throw new AppException(
      ERROR_CODES.FILE_ERROR,
      'ファイルの実体が見つかりません。移動または削除された可能性があります。',
    );
  }
  return attachment;
};

/** 画面での出し方を拡張子から決める。 */
const resolvePreviewKind = (filePath: string): AttachmentPreviewKind => {
  const extension = getExtension(filePath);
  if (extension === PDF_EXTENSION) {
    return ATTACHMENT_PREVIEW_KINDS.PDF;
  }
  return PREVIEWABLE_IMAGE_EXTENSIONS.includes(extension)
    ? ATTACHMENT_PREVIEW_KINDS.IMAGE
    : ATTACHMENT_PREVIEW_KINDS.UNSUPPORTED;
};

/**
 * プレビューする実ファイルを決める。
 * 保存済みの添付は保存先を、まだ保存していない添付は選択元をそのまま見る。
 * 選択元を見る場合も、添付するときと同じ条件（拡張子・サイズ）で受け付ける。
 */
const resolvePreviewTarget = async (
  source: AttachmentSource,
): Promise<{ filePath: string; fileName: string }> => {
  if ('id' in source) {
    const attachment = requireStoredAttachment(source.id);
    return { filePath: attachment.storedPath, fileName: attachment.originalName };
  }
  const [draft] = await resolveAttachmentDrafts([source.sourcePath]);
  return { filePath: source.sourcePath, fileName: draft.originalName };
};

/**
 * 添付欄のプレビュー用にファイルを読み出す。
 * 画面に出せない形式（HEIC など）は中身を読まず、種別だけ返して案内に切り替えさせる。
 */
export const readAttachmentContent = async (
  source: AttachmentSource,
): Promise<AttachmentContent> => {
  const { filePath } = await resolvePreviewTarget(source);
  const kind = resolvePreviewKind(filePath);

  return {
    mimeType: resolveMimeType(filePath),
    kind,
    bytes:
      kind === ATTACHMENT_PREVIEW_KINDS.UNSUPPORTED ? null : await fsp.readFile(filePath),
  };
};

/** 添付ファイルを別ウィンドウで大きく表示する。 */
export const openAttachmentInWindow = async (
  source: AttachmentSource,
  parentWindow: BrowserWindow | null,
): Promise<void> => {
  const { filePath, fileName } = await resolvePreviewTarget(source);
  if (resolvePreviewKind(filePath) === ATTACHMENT_PREVIEW_KINDS.UNSUPPORTED) {
    throw validationError('この形式は画面に表示できません。既定のアプリで開いてください。');
  }
  showAttachmentWindow(filePath, fileName, parentWindow);
};

/** 添付ファイルを既定のアプリで開く。 */
export const openAttachment = async (attachmentId: number): Promise<void> => {
  const attachment = requireStoredAttachment(attachmentId);
  const errorMessage = await shell.openPath(attachment.storedPath);
  if (errorMessage) {
    throw new AppException(ERROR_CODES.FILE_ERROR, errorMessage);
  }
};
