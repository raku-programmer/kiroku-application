import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Spinner, SPINNER_SIZES } from '@renderer/components/feedback/Spinner';
import './Button.css';

export const BUTTON_VARIANTS = {
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
  GHOST: 'ghost',
  DANGER: 'danger',
} as const;

export type ButtonVariant = (typeof BUTTON_VARIANTS)[keyof typeof BUTTON_VARIANTS];

export const BUTTON_SIZES = {
  SMALL: 'small',
  MEDIUM: 'medium',
} as const;

export type ButtonSize = (typeof BUTTON_SIZES)[keyof typeof BUTTON_SIZES];

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** 処理中。スピナーを出しつつ二重押下を防ぐ */
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = ({
  variant = BUTTON_VARIANTS.SECONDARY,
  size = BUTTON_SIZES.MEDIUM,
  loading = false,
  icon,
  children,
  disabled,
  className,
  type = 'button',
  ...rest
}: ButtonProps): JSX.Element => (
  <button
    {...rest}
    type={type}
    className={`button button--${variant} button--${size}${className ? ` ${className}` : ''}`}
    disabled={disabled || loading}
    aria-busy={loading}
  >
    {loading ? (
      <Spinner
        size={SPINNER_SIZES.SMALL}
        inverse={variant === BUTTON_VARIANTS.PRIMARY || variant === BUTTON_VARIANTS.DANGER}
      />
    ) : (
      icon
    )}
    {children != null && <span className="button__label">{children}</span>}
  </button>
);
