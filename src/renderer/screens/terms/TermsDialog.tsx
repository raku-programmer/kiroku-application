import { useEffect } from 'react';
import { Button, BUTTON_VARIANTS } from '@renderer/components/ui/Button';
import { LABELS } from '@renderer/constants/labels';
import { TermsSections } from '@renderer/screens/terms/TermsSections';
import './TermsDialog.css';

interface TermsDialogProps {
  open: boolean;
  onClose: () => void;
}

const TITLE_ELEMENT_ID = 'terms-dialog-title';

/** 同意済みの規約を設定画面から読み返すためのダイアログ。 */
export const TermsDialog = ({ open, onClose }: TermsDialogProps): JSX.Element | null => {
  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="terms-dialog__backdrop" role="presentation">
      <div
        className="terms-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={TITLE_ELEMENT_ID}
      >
        <h2 className="terms-dialog__title" id={TITLE_ELEMENT_ID}>
          {LABELS.terms.title}
        </h2>
        <div className="terms-dialog__body">
          <TermsSections />
        </div>
        <div className="terms-dialog__actions">
          <Button variant={BUTTON_VARIANTS.PRIMARY} onClick={onClose} autoFocus>
            {LABELS.common.close}
          </Button>
        </div>
      </div>
    </div>
  );
};
