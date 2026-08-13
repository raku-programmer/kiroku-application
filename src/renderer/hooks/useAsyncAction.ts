import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, toAppError } from '@renderer/api/client';
import { LABELS } from '@renderer/constants/labels';
import {
  LOADING_SCOPES,
  SPINNER_DELAY_MS,
  SPINNER_MIN_DURATION_MS,
  type LoadingScope,
} from '@renderer/constants/ui';
import { useLoading } from '@renderer/contexts/LoadingContext';
import { TOAST_TONES, useToast } from '@renderer/contexts/ToastContext';
import type { Result } from '@shared/types/result';

export interface RunOptions<T> {
  /** ローディングの表示範囲。既定はセクション（部分表示） */
  scope?: LoadingScope;
  /** 全体オーバーレイに出すメッセージ */
  loadingMessage?: string;
  /** 成功時に出すトースト。省略時は出さない */
  successMessage?: string;
  /** 失敗時にトーストを出すか（フォームで項目エラーを表示する場合は false） */
  showErrorToast?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: ApiError) => void;
}

interface AsyncActionState {
  /** 実行中（ボタンの二重押下防止に使う） */
  isBusy: boolean;
  /** 遅延・最低表示時間を考慮した表示フラグ */
  isSpinning: boolean;
}

/**
 * 「実行中フラグの管理 → 処理 → 成否のトースト」を共通化するフック。
 * 各画面はこの run 経由で IPC を呼び、個別に try/catch と isLoading を書かない。
 */
export const useAsyncAction = (): AsyncActionState & {
  run: <T>(task: () => Promise<Result<T>>, options?: RunOptions<T>) => Promise<T | null>;
} => {
  const { beginGlobal, endGlobal } = useLoading();
  const { showToast } = useToast();
  const [state, setState] = useState<AsyncActionState>({ isBusy: false, isSpinning: false });

  const delayTimer = useRef<number | null>(null);
  const shownAt = useRef<number | null>(null);
  const globalBegun = useRef(false);
  const mounted = useRef(true);

  // StrictMode では「setup → cleanup → setup」と二重に走るため、
  // setup 側で必ず true に戻す。ここを省くとマウント済みでも false のままになり、
  // 処理完了後に isBusy が解除されずボタンが押せなくなる。
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (delayTimer.current !== null) {
        window.clearTimeout(delayTimer.current);
        delayTimer.current = null;
      }
      if (globalBegun.current) {
        endGlobal();
        globalBegun.current = false;
      }
    };
  }, [endGlobal]);

  const startSpinner = useCallback(
    (scope: LoadingScope, message: string) => {
      delayTimer.current = window.setTimeout(() => {
        delayTimer.current = null;
        if (!mounted.current) {
          return;
        }
        shownAt.current = Date.now();
        if (scope === LOADING_SCOPES.GLOBAL) {
          globalBegun.current = true;
          beginGlobal(message);
        }
        setState((current) => ({ ...current, isSpinning: true }));
      }, SPINNER_DELAY_MS);
    },
    [beginGlobal],
  );

  const stopSpinner = useCallback(async () => {
    if (delayTimer.current !== null) {
      // 表示前に完了した場合はスピナーを出さない
      window.clearTimeout(delayTimer.current);
      delayTimer.current = null;
    } else if (shownAt.current !== null) {
      const elapsed = Date.now() - shownAt.current;
      const remaining = SPINNER_MIN_DURATION_MS - elapsed;
      if (remaining > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, remaining));
      }
    }
    shownAt.current = null;

    if (globalBegun.current) {
      globalBegun.current = false;
      endGlobal();
    }
    if (mounted.current) {
      setState({ isBusy: false, isSpinning: false });
    }
  }, [endGlobal]);

  const run = useCallback(
    async <T>(
      task: () => Promise<Result<T>>,
      options: RunOptions<T> = {},
    ): Promise<T | null> => {
      const scope = options.scope ?? LOADING_SCOPES.SECTION;
      const showErrorToast = options.showErrorToast ?? true;

      setState({ isBusy: true, isSpinning: false });
      startSpinner(scope, options.loadingMessage ?? LABELS.common.processing);

      try {
        const result = await task();
        if (!result.ok) {
          throw new ApiError(result.error);
        }
        if (options.successMessage) {
          showToast(TOAST_TONES.SUCCESS, options.successMessage);
        }
        options.onSuccess?.(result.data);
        return result.data;
      } catch (error) {
        const appError = toAppError(error);
        if (showErrorToast) {
          showToast(TOAST_TONES.ERROR, appError.message || LABELS.errors.generic);
        }
        options.onError?.(
          error instanceof ApiError ? error : new ApiError(appError),
        );
        return null;
      } finally {
        await stopSpinner();
      }
    },
    [showToast, startSpinner, stopSpinner],
  );

  return { ...state, run };
};
