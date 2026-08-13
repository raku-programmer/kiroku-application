import {
  RATE_FRACTION_DIGITS,
  TAX_RATE_OPTIONS,
  TAX_TREATMENTS,
  TAX_TREATMENT_OPTIONS,
  type TaxTreatment,
} from '@shared/constants/tax';
import { rateToPercent } from '@shared/utils/money';

/** 数値の表示ロケール */
export const NUMBER_LOCALE = 'ja-JP';

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB'] as const;
const BYTE_STEP = 1024;

/** 円記号付きの金額表記 */
export const formatYen = (value: number): string =>
  `¥${value.toLocaleString(NUMBER_LOCALE)}`;

/** 記号なしの金額表記 */
export const formatNumber = (value: number): string => value.toLocaleString(NUMBER_LOCALE);

/** ベーシスポイントをパーセント表記にする（末尾の不要な 0 は落とす） */
export const formatRate = (rate: number): string => {
  const percent = rateToPercent(rate);
  const fixed = percent.toFixed(RATE_FRACTION_DIGITS);
  const trimmed = fixed.replace(/\.?0+$/, '');
  return `${trimmed}%`;
};

export const formatTaxTreatment = (treatment: TaxTreatment): string =>
  TAX_TREATMENT_OPTIONS.find((option) => option.value === treatment)?.label ?? '';

export const formatTaxRate = (treatment: TaxTreatment, taxRate: number): string => {
  if (treatment === TAX_TREATMENTS.EXEMPT) {
    return '-';
  }
  return TAX_RATE_OPTIONS.find((option) => option.value === taxRate)?.label ?? formatRate(taxRate);
};

/** YYYY-MM-DD を YYYY/MM/DD にする */
export const formatDate = (dateString: string): string => dateString.replace(/-/g, '/');

/** ISO 文字列を「YYYY/MM/DD HH:mm」にする */
export const formatDateTime = (isoString: string): string => {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return isoString;
  }
  const pad = (value: number): string => String(value).padStart(2, '0');
  return (
    `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
};

export const formatByteSize = (bytes: number): string => {
  let value = bytes;
  let unitIndex = 0;
  while (value >= BYTE_STEP && unitIndex < BYTE_UNITS.length - 1) {
    value /= BYTE_STEP;
    unitIndex += 1;
  }
  const fractionDigits = unitIndex === 0 ? 0 : 1;
  return `${value.toFixed(fractionDigits)} ${BYTE_UNITS[unitIndex]}`;
};
