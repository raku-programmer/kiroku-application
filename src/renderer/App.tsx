import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@renderer/api/client';
import { ToastStack } from '@renderer/components/feedback/ToastStack';
import { AppLayout } from '@renderer/components/layout/AppLayout';
import {
  DEFAULT_SCREEN_ID,
  SCREENS_RESETTING_LIST_STATE,
  SCREEN_IDS,
  type ScreenId,
} from '@renderer/constants/navigation';
import {
  SCREEN_TRANSITION_MIN_DURATION_MS,
  SPINNER_DELAY_MS,
} from '@renderer/constants/ui';
import { useAppData } from '@renderer/contexts/AppDataContext';
import { ExpenseDetailScreen } from '@renderer/screens/expense-detail/ExpenseDetailScreen';
import { ExpenseEntryScreen } from '@renderer/screens/expense-entry/ExpenseEntryScreen';
import { ExpenseListScreen } from '@renderer/screens/expense-list/ExpenseListScreen';
import { SettingsScreen } from '@renderer/screens/settings/SettingsScreen';
import { SetupWizard } from '@renderer/screens/setup/SetupWizard';
import { WelcomeDialog } from '@renderer/screens/setup/WelcomeDialog';
import { TermsGate } from '@renderer/screens/terms/TermsGate';
import { TERMS_VERSION } from '@shared/constants/terms';
import type { ExpenseFilter } from '@shared/types/expense';

/** 経費入力画面をどの状態で開くか */
export const ENTRY_MODES = {
  CREATE: 'create',
  EDIT: 'edit',
  DUPLICATE: 'duplicate',
} as const;

export type EntryMode = (typeof ENTRY_MODES)[keyof typeof ENTRY_MODES];

/** 画面遷移時に渡す対象。入力画面はモード、照会画面は対象 ID を使う。 */
export interface NavigateTarget {
  mode?: EntryMode;
  expenseId?: number | null;
  /**
   * 遷移ローディングをすぐには出さない。
   * 前後の領収書のように同じ画面で対象だけ差し替える移動では、
   * 毎回ローディングを挟むとかえって待たされて見えるため、
   * 読み込みに時間がかかったときだけ出す。
   */
  quiet?: boolean;
}

export type NavigateFn = (screenId: ScreenId, target?: NavigateTarget) => void;

export interface EntryTarget {
  mode: EntryMode;
  expenseId: number | null;
  /** 同じ対象を続けて開き直すときに再マウントさせるためのキー */
  key: number;
}

/** 経費一覧の表示状態。照会画面から戻ったときだけ復元する。 */
export interface ExpenseListState {
  filter: ExpenseFilter;
  page: number;
}

const INITIAL_TARGET: EntryTarget = { mode: ENTRY_MODES.CREATE, expenseId: null, key: 0 };

export const App = (): JSX.Element => {
  const { initialized, settings, applySettings } = useAppData();
  const [currentScreenId, setCurrentScreenId] = useState<ScreenId>(DEFAULT_SCREEN_ID);
  const [screenLoading, setScreenLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [screenTarget, setScreenTarget] = useState<EntryTarget>(INITIAL_TARGET);
  const [targetSequence, setTargetSequence] = useState(1);
  /** 初期セットアップを終えた直後だけ出す案内 */
  const [welcomeVisible, setWelcomeVisible] = useState(false);

  /** ローディングを出し始めた時刻。最低表示時間の判定に使う */
  const shownAt = useRef<number | null>(Date.now());
  /** 最低表示時間ぶん残すためのタイマー */
  const readyTimer = useRef<number | null>(null);
  /** 「遅いときだけ出す」遷移で、表示を待つためのタイマー */
  const delayTimer = useRef<number | null>(null);
  /**
   * 経費一覧の絞り込みとページ。照会画面へ出ている間だけ預かる。
   * ここでは描画に使わないので state ではなく ref に置き、
   * 一覧を操作するたびにアプリ全体が再レンダーされるのを避ける。
   */
  const expenseListState = useRef<ExpenseListState | null>(null);

  // 設定に保存されたサイドメニューの開閉状態を復元する
  useEffect(() => {
    if (initialized) {
      setCollapsed(settings.sideMenuCollapsed);
    }
  }, [initialized, settings.sideMenuCollapsed]);

  const clearTransitionTimers = useCallback(() => {
    if (readyTimer.current !== null) {
      window.clearTimeout(readyTimer.current);
      readyTimer.current = null;
    }
    if (delayTimer.current !== null) {
      window.clearTimeout(delayTimer.current);
      delayTimer.current = null;
    }
  }, []);

  useEffect(() => () => clearTransitionTimers(), [clearTransitionTimers]);

  const handleToggleMenu = useCallback(() => {
    setCollapsed((current) => {
      const next = !current;
      // 保存は非同期で行い、操作の応答は待たせない
      void api.settings.update({ sideMenuCollapsed: next }).then((result) => {
        if (result.ok) {
          applySettings(result.data);
        }
      });
      return next;
    });
  }, [applySettings]);

  const handleExpenseListStateChange = useCallback((state: ExpenseListState) => {
    expenseListState.current = state;
  }, []);

  const beginTransition = useCallback(
    (quiet: boolean) => {
      clearTransitionTimers();

      if (!quiet) {
        shownAt.current = Date.now();
        setScreenLoading(true);
        return;
      }

      // 待たされていると感じる時間を超えたときだけローディングに切り替える
      shownAt.current = null;
      setScreenLoading(false);
      delayTimer.current = window.setTimeout(() => {
        delayTimer.current = null;
        shownAt.current = Date.now();
        setScreenLoading(true);
      }, SPINNER_DELAY_MS);
    },
    [clearTransitionTimers],
  );

  /**
   * 遷移先の初期データが揃ったときに呼ばれる。
   * 取得が速いと一瞬で消えて遷移したことが伝わらないため、最低表示時間だけは残す。
   * まだ出していない（＝待たせていない）場合は、そのまま出さずに終える。
   */
  const handleScreenReady = useCallback(() => {
    const notShownYet = delayTimer.current !== null;
    const startedAt = shownAt.current;
    clearTransitionTimers();

    if (notShownYet || startedAt === null) {
      setScreenLoading(false);
      return;
    }

    const remaining = SCREEN_TRANSITION_MIN_DURATION_MS - (Date.now() - startedAt);
    if (remaining <= 0) {
      setScreenLoading(false);
      return;
    }
    readyTimer.current = window.setTimeout(() => {
      readyTimer.current = null;
      setScreenLoading(false);
    }, remaining);
  }, [clearTransitionTimers]);

  const navigate = useCallback<NavigateFn>(
    (screenId, target) => {
      if (screenId === currentScreenId && !target) {
        return;
      }
      // 入力・設定へ移ったら一覧の絞り込みは持ち越さない
      if (SCREENS_RESETTING_LIST_STATE.includes(screenId)) {
        expenseListState.current = null;
      }
      if (target) {
        setScreenTarget({
          mode: target.mode ?? ENTRY_MODES.CREATE,
          expenseId: target.expenseId ?? null,
          key: targetSequence,
        });
        setTargetSequence((current) => current + 1);
      }
      beginTransition(target?.quiet ?? false);
      setCurrentScreenId(screenId);
    },
    [currentScreenId, targetSequence, beginTransition],
  );

  const renderScreen = (): JSX.Element => {
    switch (currentScreenId) {
      case SCREEN_IDS.LIST:
        return (
          <ExpenseListScreen
            initialState={expenseListState.current}
            onStateChange={handleExpenseListStateChange}
            onReady={handleScreenReady}
            onNavigate={navigate}
          />
        );
      case SCREEN_IDS.DETAIL:
        return (
          // 前後の領収書へ移る間も表示を保てるよう、ここでは作り直さない
          // （対象 ID の変化を照会画面側が拾って読み直す）
          <ExpenseDetailScreen
            expenseId={screenTarget.expenseId}
            listState={expenseListState.current}
            onListStateChange={handleExpenseListStateChange}
            onReady={handleScreenReady}
            onNavigate={navigate}
          />
        );
      case SCREEN_IDS.SETTINGS:
        return <SettingsScreen onReady={handleScreenReady} />;
      case SCREEN_IDS.ENTRY:
      default:
        return (
          <ExpenseEntryScreen
            key={screenTarget.key}
            target={screenTarget}
            onReady={handleScreenReady}
            onNavigate={navigate}
          />
        );
    }
  };

  // 利用規約に同意するまでは他の画面を出さない
  if (initialized && settings.agreedTermsVersion < TERMS_VERSION) {
    return (
      <>
        <TermsGate />
        <ToastStack />
      </>
    );
  }

  // 初回起動時は通常画面の代わりに初期セットアップを表示する
  if (initialized && !settings.setupCompleted) {
    return (
      <>
        <SetupWizard onCompleted={() => setWelcomeVisible(true)} />
        <ToastStack />
      </>
    );
  }

  return (
    <>
      <AppLayout
        currentScreenId={currentScreenId}
        collapsed={collapsed}
        screenLoading={screenLoading || !initialized}
        onSelectScreen={(screenId) =>
          navigate(
            screenId,
            screenId === SCREEN_IDS.ENTRY
              ? { mode: ENTRY_MODES.CREATE, expenseId: null }
              : undefined,
          )
        }
        onToggleMenu={handleToggleMenu}
      >
        {initialized && renderScreen()}
      </AppLayout>
      <WelcomeDialog open={welcomeVisible} onClose={() => setWelcomeVisible(false)} />
      <ToastStack />
    </>
  );
};
