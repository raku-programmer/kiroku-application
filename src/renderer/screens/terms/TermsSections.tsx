import { LABELS } from '@renderer/constants/labels';
import { TERMS_SECTIONS, TERMS_VERSION } from '@shared/constants/terms';
import './TermsGate.css';

/** 規約の本文。同意画面と、設定から読み返すダイアログで共用する。 */
export const TermsSections = (): JSX.Element => (
  <>
    <ol className="terms__sections">
      {TERMS_SECTIONS.map((section, index) => (
        <li className="terms__section" key={section.title}>
          <h3 className="terms__section-title">
            <span className="terms__section-number">{index + 1}</span>
            {section.title}
          </h3>
          <p className="terms__section-body">{section.body}</p>
        </li>
      ))}
    </ol>
    <p className="terms__version">{`${LABELS.terms.version} ${TERMS_VERSION}`}</p>
  </>
);
