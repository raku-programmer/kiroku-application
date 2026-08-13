/** main プロセスの各種設定値。 */

export const WINDOW_CONFIG = {
  defaultWidth: 1280,
  defaultHeight: 860,
  minWidth: 1024,
  minHeight: 640,
  backgroundColor: '#f4f7f3',
  title: 'Kiroku',
} as const;

/**
 * 領収書を大きく表示する別ウィンドウ。
 * 画像・PDF をそのまま読み込み、Chromium 内蔵のビューアに表示させる。
 */
export const ATTACHMENT_WINDOW_CONFIG = {
  defaultWidth: 960,
  defaultHeight: 880,
  minWidth: 480,
  minHeight: 400,
  /** 画像・PDF の周囲に出る余白の色（内蔵ビューアの背景に合わせた暗色） */
  backgroundColor: '#282d2a',
  /** タイトルバーに出す文字。後ろにファイル名が付く */
  titlePrefix: '領収書：',
} as const;

/** アプリ名。ファイル名テンプレートなどで使用する。 */
export const APP_NAME = 'Kiroku';

/**
 * Electron 既定のアプリケーションメニュー（File / Edit / View …）を表示するか。
 * 画面移動はサイドメニューで完結するため既定では出さない。
 */
export const SHOW_APPLICATION_MENU = false;

/** 開発時のみ DevTools を開く */
export const OPEN_DEVTOOLS_IN_DEVELOPMENT = true;

/**
 * 開発時にウィンドウへ設定するアイコン（ビルド出力 .vite/build からの相対パス）。
 * 配布版は実行ファイルにアイコンが埋め込まれるため指定しない。
 */
export const DEV_WINDOW_ICON_PATH = '../../assets/icon.png';

/** 請求元サジェストの最大件数 */
export const PAYEE_SUGGEST_LIMIT = 8;

/** 内容サジェストの最大件数 */
export const DESCRIPTION_SUGGEST_LIMIT = 8;
