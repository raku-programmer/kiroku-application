/** ローディング表示・入力アシスト・一覧表示の挙動を決める設定値。 */

/** この時間内に処理が終わったらスピナーを出さない（ちらつき防止） */
export const SPINNER_DELAY_MS = 180;

/** スピナーを出したら最低この時間は表示する（点滅防止） */
export const SPINNER_MIN_DURATION_MS = 400;

/**
 * 画面遷移ローディングの最低表示時間。
 * 取得が速すぎると一瞬で消えて遷移したことが分からないため、必ずこの時間は表示する。
 */
export const SCREEN_TRANSITION_MIN_DURATION_MS = 320;

/** トーストの表示時間 */
export const TOAST_DURATION_MS = 4000;

/** 請求元サジェストの入力待ち時間 */
export const SUGGEST_DEBOUNCE_MS = 150;

/** キーワード検索の入力待ち時間 */
export const SEARCH_DEBOUNCE_MS = 300;

/** 経費一覧の 1 ページあたりの表示件数 */
export const EXPENSE_LIST_PAGE_SIZE = 10;

/** ページ番号の先頭（1 始まり） */
export const FIRST_PAGE = 1;

/** ローディングの表示範囲 */
export const LOADING_SCOPES = {
  /** 画面全体を覆う（登録・更新・削除・出力・バックアップ） */
  GLOBAL: 'global',
  /** コンテンツ領域のみ（画面遷移） */
  SCREEN: 'screen',
  /** 一覧テーブルのみ（検索・期間切替） */
  SECTION: 'section',
} as const;

export type LoadingScope = (typeof LOADING_SCOPES)[keyof typeof LOADING_SCOPES];
