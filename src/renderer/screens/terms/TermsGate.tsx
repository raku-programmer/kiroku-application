import { useState } from 'react';
import { api } from '@renderer/api/client';
import { LoadingOverlay, OVERLAY_VARIANTS } from '@renderer/components/feedback/LoadingOverlay';
import { Button, BUTTON_VARIANTS } from '@renderer/components/ui/Button';
import { LABELS } from '@renderer/constants/labels';
import { LOADING_SCOPES } from '@renderer/constants/ui';
import { useAppData } from '@renderer/contexts/AppDataContext';
import { useAsyncAction } from '@renderer/hooks/useAsyncAction';
import { TermsSections } from '@renderer/screens/terms/TermsSections';
import { TERMS_VERSION } from '@shared/constants/terms';
import './TermsGate.css';

const AGREE_CHECKBOX_ID = 'terms-agree';

/**
 * 利用規約への同意を得るまで、アプリの他の画面を出さないための入口。
 * 規約を改定したときは TERMS_VERSION を上げると再同意を求められる。
 */
export const TermsGate = (): JSX.Element => {
  const { settings, applySettings } = useAppData();
  const action = useAsyncAction();
  const [agreed, setAgreed] = useState(false);

  /** 0 より大きければ過去に同意しており、今回は改定による再同意 */
  const isReconsent = settings.agreedTermsVersion > 0;

  const accept = async (): Promise<void> => {
    await action.run(() => api.settings.update({ agreedTermsVersion: TERMS_VERSION }), {
      scope: LOADING_SCOPES.SECTION,
      onSuccess: applySettings,
    });
  };

  const decline = (): void => {
    void action.run(() => api.system.quit(), {
      scope: LOADING_SCOPES.GLOBAL,
      loadingMessage: LABELS.common.processing,
    });
  };

  return (
    <div className="terms">
      <header className="terms__header">
        <div className="terms__heading">
          <span className="terms__app">{LABELS.app.name}</span>
          <h1 className="terms__title">{LABELS.terms.title}</h1>
        </div>
        <p className="terms__lead">
          {isReconsent ? LABELS.terms.updatedNotice : LABELS.terms.lead}
        </p>
      </header>

      <div className="terms__main">
        <div className="terms__body">
          <TermsSections />
        </div>
        <LoadingOverlay visible={action.isSpinning} variant={OVERLAY_VARIANTS.SECTION} />
      </div>

      <footer className="terms__actions">
        <label className="terms__agree" htmlFor={AGREE_CHECKBOX_ID}>
          <input
            id={AGREE_CHECKBOX_ID}
            type="checkbox"
            checked={agreed}
            onChange={(event) => setAgreed(event.target.checked)}
          />
          <span>{LABELS.terms.agree}</span>
        </label>

        <Button variant={BUTTON_VARIANTS.GHOST} onClick={decline}>
          {LABELS.terms.decline}
        </Button>
        <Button
          variant={BUTTON_VARIANTS.PRIMARY}
          disabled={!agreed}
          loading={action.isBusy}
          onClick={() => void accept()}
        >
          {LABELS.terms.accept}
        </Button>
      </footer>
    </div>
  );
};
