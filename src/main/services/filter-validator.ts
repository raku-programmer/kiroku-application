import { validationError } from '@main/errors';
import { PERIOD_MODES, type ExpenseFilter, type Period } from '@shared/types/expense';
import { FIRST_MONTH, LAST_MONTH } from '@shared/utils/period';

/** 年として受け付ける範囲 */
const YEAR_RANGE = { min: 1900, max: 2999 } as const;

const normalizePeriod = (value: unknown): Period => {
  const raw = (value ?? {}) as Partial<Period>;
  const mode = raw.mode === PERIOD_MODES.YEAR ? PERIOD_MODES.YEAR : PERIOD_MODES.MONTH;

  if (
    typeof raw.year !== 'number' ||
    !Number.isInteger(raw.year) ||
    raw.year < YEAR_RANGE.min ||
    raw.year > YEAR_RANGE.max
  ) {
    throw validationError('対象年の指定が不正です。');
  }

  if (mode === PERIOD_MODES.YEAR) {
    return { mode, year: raw.year, month: null };
  }

  if (
    typeof raw.month !== 'number' ||
    !Number.isInteger(raw.month) ||
    raw.month < FIRST_MONTH ||
    raw.month > LAST_MONTH
  ) {
    throw validationError('対象月の指定が不正です。');
  }
  return { mode, year: raw.year, month: raw.month };
};

const normalizeId = (value: unknown, label: string): number | null => {
  if (value == null) {
    return null;
  }
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw validationError(`${label}の指定が不正です。`);
  }
  return value;
};

/** 指定なし（null）を許す真偽値の絞り込み */
const normalizeFlag = (value: unknown, label: string): boolean | null => {
  if (value == null) {
    return null;
  }
  if (typeof value !== 'boolean') {
    throw validationError(`${label}の指定が不正です。`);
  }
  return value;
};

/** renderer から受け取った絞り込み条件を検証・正規化する。 */
export const normalizeExpenseFilter = (value: unknown): ExpenseFilter => {
  const raw = (value ?? {}) as Partial<ExpenseFilter>;
  return {
    period: normalizePeriod(raw.period),
    accountCategoryId: normalizeId(raw.accountCategoryId, '勘定科目'),
    payeeId: normalizeId(raw.payeeId, '請求元'),
    keyword: typeof raw.keyword === 'string' ? raw.keyword : '',
    hasAttachment: normalizeFlag(raw.hasAttachment, '領収書の添付'),
  };
};
