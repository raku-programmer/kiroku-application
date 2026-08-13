import type { ReactNode } from 'react';
import './Card.css';

interface CardProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
  /** ローディングオーバーレイを重ねられるようにする */
  relative?: boolean;
  children: ReactNode;
}

export const Card = ({
  title,
  description,
  actions,
  relative = false,
  children,
}: CardProps): JSX.Element => (
  <section className={`card${relative ? ' card--relative' : ''}`}>
    {(title || actions) && (
      <header className="card__header">
        <div className="card__heading">
          {title && <h2 className="card__title">{title}</h2>}
          {description && <p className="card__description">{description}</p>}
        </div>
        {actions && <div className="card__actions">{actions}</div>}
      </header>
    )}
    <div className="card__body">{children}</div>
  </section>
);
