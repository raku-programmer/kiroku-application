/** main プロセスの各種設定値。 */

export const WINDOW_CONFIG = {
  defaultWidth: 1280,
  defaultHeight: 860,
  minWidth: 1024,
  minHeight: 640,
  backgroundColor: '#f4f7f3',
  title: 'Kiroku',
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
