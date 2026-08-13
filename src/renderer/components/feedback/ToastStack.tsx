import { CloseIcon } from '@renderer/components/icons/Icons';
import { LABELS } from '@renderer/constants/labels';
import { useToast } from '@renderer/contexts/ToastContext';
import './ToastStack.css';

export const ToastStack = (): JSX.Element | null => {
  const { toasts, dismissToast } = useToast();

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="toast-stack" role="region" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast--${toast.tone}`}>
          <span className="toast__message">{toast.message}</span>
          <button
            type="button"
            className="toast__close"
            onClick={() => dismissToast(toast.id)}
            aria-label={LABELS.common.close}
          >
            <CloseIcon width={16} height={16} />
          </button>
        </div>
      ))}
    </div>
  );
};
