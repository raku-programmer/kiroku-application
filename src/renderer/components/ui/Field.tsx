import type { ReactNode } from 'react';
import { LABELS } from '@renderer/constants/labels';
import './Field.css';

interface FieldProps {
  /** ラベルと入力を紐づける id */
  htmlFor?: string;
  label: string;
  required?: boolean;
  /** 入力アシストで自動補完された項目であることを示す */
  assisted?: boolean;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
}

export const Field = ({
  htmlFor,
  label,
  required = false,
  assisted = false,
  hint,
  error,
  children,
}: FieldProps): JSX.Element => (
  <div className={`field${error ? ' field--error' : ''}`}>
    <div className="field__header">
      <label className="field__label" htmlFor={htmlFor}>
        {label}
      </label>
      {required && <span className="field__badge field__badge--required">{LABELS.common.required}</span>}
      {assisted && (
        <span className="field__badge field__badge--assisted">{LABELS.entry.assistBadge}</span>
      )}
    </div>
    <div className="field__control">{children}</div>
    {hint != null && !error && <p className="field__hint">{hint}</p>}
    {error && (
      <p className="field__error" role="alert">
        {error}
      </p>
    )}
  </div>
);
