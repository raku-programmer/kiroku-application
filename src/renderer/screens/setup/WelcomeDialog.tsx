import { useEffect } from 'react';
import { CheckIcon } from '@renderer/components/icons/Icons';
import { Button, BUTTON_VARIANTS } from '@renderer/components/ui/Button';
import { LABELS } from '@renderer/constants/labels';
import { NAVIGATION_ITEMS, type ScreenId } from '@renderer/constants/navigation';
import './WelcomeDialog.css';

interface WelcomeDialogProps {
  open: boolean;
  onClose: () => void;
}

const TITLE_ELEMENT_ID = 'welcome-dialog-title';

type GuideKey = keyof typeof LABELS.setup.welcomeGuides;

/** サイドメニューの画面に対応する説明文（対応がなければ出さない） */
const guideFor = (screenId: ScreenId): string | undefined =>
  screenId in LABELS.setup.welcomeGuides
    ? LABELS.setup.welcomeGuides[screenId as GuideKey]
    : undefined;

/** 初期セットアップを終えた直後に出す案内。 */
export const WelcomeDialog = ({ open, onClose }: WelcomeDialogProps): JSX.Element | null => {
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
    <div className="welcome__backdrop" role="presentation">
      <div
        className="welcome"
        role="dialog"
        aria-modal="true"
        aria-labelledby={TITLE_ELEMENT_ID}
      >
        <div className="welcome__mark" aria-hidden="true">
          <CheckIcon width={30} height={30} />
        </div>

        <h2 className="welcome__title" id={TITLE_ELEMENT_ID}>
          {LABELS.setup.welcomeTitle}
        </h2>
        <p className="welcome__message">{LABELS.setup.welcomeMessage}</p>

        <ul className="welcome__guides">
          {NAVIGATION_ITEMS.map((item) => {
            const guide = guideFor(item.id);
            if (!guide) {
              return null;
            }
            const Icon = item.icon;
            return (
              <li className="welcome__guide" key={item.id}>
                <span className="welcome__guide-icon">
                  <Icon width={18} height={18} />
                </span>
                <span className="welcome__guide-body">
                  <span className="welcome__guide-name">{item.label}</span>
                  <span className="welcome__guide-text">{guide}</span>
                </span>
              </li>
            );
          })}
        </ul>

        <div className="welcome__actions">
          <Button variant={BUTTON_VARIANTS.PRIMARY} onClick={onClose} autoFocus>
            {LABELS.setup.welcomeStart}
          </Button>
        </div>
      </div>
    </div>
  );
};
