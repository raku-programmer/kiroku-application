import './Spinner.css';

export const SPINNER_SIZES = {
  SMALL: 'small',
  MEDIUM: 'medium',
  LARGE: 'large',
} as const;

export type SpinnerSize = (typeof SPINNER_SIZES)[keyof typeof SPINNER_SIZES];

interface SpinnerProps {
  size?: SpinnerSize;
  /** ボタン内など、暗い背景の上で使う場合 */
  inverse?: boolean;
}

export const Spinner = ({
  size = SPINNER_SIZES.MEDIUM,
  inverse = false,
}: SpinnerProps): JSX.Element => (
  <span
    className={`spinner spinner--${size}${inverse ? ' spinner--inverse' : ''}`}
    role="status"
    aria-hidden="true"
  />
);
