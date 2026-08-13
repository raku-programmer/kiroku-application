import {
  EntryIcon,
  ListIcon,
  SettingsIcon,
  type IconComponent,
} from '@renderer/components/icons/Icons';
import { LABELS } from '@renderer/constants/labels';

export const SCREEN_IDS = {
  ENTRY: 'entry',
  LIST: 'list',
  /** 一覧から開く照会画面。サイドメニューには並べない */
  DETAIL: 'detail',
  SETTINGS: 'settings',
} as const;

export type ScreenId = (typeof SCREEN_IDS)[keyof typeof SCREEN_IDS];

export interface NavigationItem {
  id: ScreenId;
  label: string;
  icon: IconComponent;
}

/** サイドメニューの項目定義。ここに追加すればメニューに反映される。 */
export const NAVIGATION_ITEMS: readonly NavigationItem[] = [
  { id: SCREEN_IDS.ENTRY, label: LABELS.nav.entry, icon: EntryIcon },
  { id: SCREEN_IDS.LIST, label: LABELS.nav.list, icon: ListIcon },
  { id: SCREEN_IDS.SETTINGS, label: LABELS.nav.settings, icon: SettingsIcon },
];

/** ヘッダに出す画面見出し。メニューに並べない画面もここで名前を持つ。 */
export const SCREEN_TITLES: Record<ScreenId, string> = {
  [SCREEN_IDS.ENTRY]: LABELS.nav.entry,
  [SCREEN_IDS.LIST]: LABELS.nav.list,
  [SCREEN_IDS.DETAIL]: LABELS.nav.detail,
  [SCREEN_IDS.SETTINGS]: LABELS.nav.settings,
};

/**
 * 表示中の画面に対して、サイドメニューで選択状態にする項目。
 * 照会画面は一覧から開くため「経費一覧」を選択したままにする。
 */
export const MENU_HIGHLIGHT: Record<ScreenId, ScreenId> = {
  [SCREEN_IDS.ENTRY]: SCREEN_IDS.ENTRY,
  [SCREEN_IDS.LIST]: SCREEN_IDS.LIST,
  [SCREEN_IDS.DETAIL]: SCREEN_IDS.LIST,
  [SCREEN_IDS.SETTINGS]: SCREEN_IDS.SETTINGS,
};

/**
 * この画面へ移動したら、経費一覧の絞り込みとページを初期化する。
 * 照会画面（DETAIL）は一覧の続きなので含めない（戻ったときに元の条件へ復帰させる）。
 */
export const SCREENS_RESETTING_LIST_STATE: readonly ScreenId[] = [
  SCREEN_IDS.ENTRY,
  SCREEN_IDS.SETTINGS,
];

export const DEFAULT_SCREEN_ID: ScreenId = SCREEN_IDS.ENTRY;
