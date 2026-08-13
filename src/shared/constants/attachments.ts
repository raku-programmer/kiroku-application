/** 領収書添付に関する定数 */

export interface FileTypeFilter {
  name: string;
  extensions: string[];
}

/** 添付として選択できる拡張子（小文字・ドットなし） */
export const ALLOWED_ATTACHMENT_EXTENSIONS: readonly string[] = [
  'pdf',
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'heic',
];

export const ATTACHMENT_FILE_FILTERS: readonly FileTypeFilter[] = [
  { name: '領収書ファイル', extensions: [...ALLOWED_ATTACHMENT_EXTENSIONS] },
  { name: 'すべてのファイル', extensions: ['*'] },
];

/**
 * 画面にそのまま表示できる画像の拡張子（小文字・ドットなし）。
 * HEIC は Chromium が描画できないため含めない（既定のアプリで開いてもらう）。
 */
export const PREVIEWABLE_IMAGE_EXTENSIONS: readonly string[] = [
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
];

/** PDF の拡張子。プレビューは Chromium 内蔵のビューアに任せる */
export const PDF_EXTENSION = 'pdf';

/** 経費照会のプレビューでの出し方 */
export const ATTACHMENT_PREVIEW_KINDS = {
  /** img 要素で表示する */
  IMAGE: 'image',
  /** iframe に読み込んで内蔵ビューアで表示する */
  PDF: 'pdf',
  /** 画面には出せない形式（HEIC など） */
  UNSUPPORTED: 'unsupported',
} as const;

export type AttachmentPreviewKind =
  (typeof ATTACHMENT_PREVIEW_KINDS)[keyof typeof ATTACHMENT_PREVIEW_KINDS];

/** 拡張子（小文字・ドットなし）から MIME タイプを引く */
export const ATTACHMENT_MIME_TYPES: Readonly<Record<string, string>> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  heic: 'image/heic',
};

/** 1 ファイルあたりの上限サイズ（バイト） */
export const MAX_ATTACHMENT_BYTE_SIZE = 20 * 1024 * 1024;

/**
 * 保存時に圧縮を試みる画像形式（小文字・ドットなし）。
 * PDF・HEIC などは Electron の nativeImage が読めないため対象外。
 * PDF の圧縮には別途ライブラリが要るので、現状はそのまま保存する。
 */
export const COMPRESSIBLE_IMAGE_EXTENSIONS: readonly string[] = ['jpg', 'jpeg', 'png'];

/**
 * 圧縮後の長辺の上限（ピクセル）。
 * 領収書は文字が読めれば足りるので、これを超える写真は縮小する。
 */
export const IMAGE_COMPRESSION_MAX_EDGE_PIXELS = 2000;

/** JPEG で再エンコードするときの品質（0-100） */
export const IMAGE_COMPRESSION_JPEG_QUALITY = 80;

/**
 * このサイズ以下のファイルは圧縮を試みない。
 * 小さい画像は再エンコードしても縮まらず、かえって劣化するだけになる。
 */
export const IMAGE_COMPRESSION_MIN_BYTE_SIZE = 300 * 1024;

/** 取り込みフォルダの一覧に出す最大件数（新しい順） */
export const IMPORT_PICKER_MAX_FILES = 40;

/** 一覧に並べるサムネイルの長辺（ピクセル） */
export const IMPORT_THUMBNAIL_MAX_EDGE_PIXELS = 200;

/** サムネイルの JPEG 品質。一覧の見分けがつけば十分なので低めにする */
export const IMPORT_THUMBNAIL_JPEG_QUALITY = 60;

/** クリップボードから作った一時ファイルの名前の先頭 */
export const CLIPBOARD_FILE_PREFIX = 'clipboard-';

/** クリップボードから貼り付けた画像の保存形式 */
export const CLIPBOARD_FILE_EXTENSION = 'png';

/** 1 件の経費に添付できる最大数 */
export const MAX_ATTACHMENTS_PER_EXPENSE = 10;
