import { Spinner, SPINNER_SIZES } from '@renderer/components/feedback/Spinner';
import { LABELS } from '@renderer/constants/labels';
import './LoadingOverlay.css';

export const OVERLAY_VARIANTS = {
  /** 画面全体（登録・更新・削除・出力・バックアップ） */
  GLOBAL: 'global',
  /** コンテンツ領域（画面遷移） */
  SCREEN: 'screen',
  /** テーブルなどの一部分（検索・期間切替） */
  SECTION: 'section',
} as const;

export type OverlayVariant = (typeof OVERLAY_VARIANTS)[keyof typeof OVERLAY_VARIANTS];

interface LoadingOverlayProps {
  visible: boolean;
  variant?: OverlayVariant;
  message?: string | null;
}

/**
 * 親要素に position: relative を持たせた上で使う（global 以外）。
 * visible が false のときは DOM に出さない。
 */
export const LoadingOverlay = ({
  visible,
  variant = OVERLAY_VARIANTS.SECTION,
  message,
}: LoadingOverlayProps): JSX.Element | null => {
  if (!visible) {
    return null;
  }

  const text = message ?? LABELS.common.loading;

  return (
    <div
      className={`loading-overlay loading-overlay--${variant}`}
      role="alert"
      aria-live="assertive"
      aria-busy="true"
    >
      <div className="loading-overlay__body">
        <Spinner size={SPINNER_SIZES.LARGE} />
        <span className="loading-overlay__message">{text}</span>
      </div>
    </div>
  );
};
