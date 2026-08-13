import { validationError } from '@main/errors';
import { RATE_SCALE } from '@shared/constants/tax';
import type { AccountCategoryInput, PaymentMethodInput } from '@shared/types/preset';

/** プリセット名の最大長 */
export const MAX_PRESET_NAME_LENGTH = 40;

const normalizeName = (value: unknown, label: string): string => {
  const name = typeof value === 'string' ? value.trim() : '';
  if (name.length === 0) {
    throw validationError(`${label}を入力してください。`, { name: `${label}を入力してください。` });
  }
  if (name.length > MAX_PRESET_NAME_LENGTH) {
    const message = `${label}は ${MAX_PRESET_NAME_LENGTH} 文字以内で入力してください。`;
    throw validationError(message, { name: message });
  }
  return name;
};

const normalizeAllocationRate = (value: unknown): number | null => {
  if (value == null) {
    return null;
  }
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > RATE_SCALE) {
    const message = '既定の按分率は 0〜100% の範囲で入力してください。';
    throw validationError(message, { defaultAllocationRate: message });
  }
  return value;
};

export const validateAccountCategoryInput = (value: unknown): AccountCategoryInput => {
  const raw = (value ?? {}) as Partial<AccountCategoryInput>;
  return {
    name: normalizeName(raw.name, '勘定科目名'),
    defaultAllocationRate: normalizeAllocationRate(raw.defaultAllocationRate),
    isActive: raw.isActive !== false,
  };
};

export const validatePaymentMethodInput = (value: unknown): PaymentMethodInput => {
  const raw = (value ?? {}) as Partial<PaymentMethodInput>;
  return {
    name: normalizeName(raw.name, '支払方法名'),
    isActive: raw.isActive !== false,
  };
};
