import { PERIOD_MODES, type Period } from '@shared/types/expense';

/** 日付文字列の書式（DB 保存・比較に使用） */
export const DATE_FORMAT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const MONTHS_IN_YEAR = 12;
export const FIRST_MONTH = 1;
export const LAST_MONTH = MONTHS_IN_YEAR;

const pad = (value: number, length: number): string => String(value).padStart(length, '0');

/** Date を YYYY-MM-DD に変換する（ローカルタイム基準） */
export const toDateString = (date: Date): string =>
  `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1, 2)}-${pad(date.getDate(), 2)}`;

export const todayString = (): string => toDateString(new Date());

export const isValidDateString = (value: string): boolean => {
  if (!DATE_FORMAT_PATTERN.test(value)) {
    return false;
  }
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
  );
};

export const getYear = (dateString: string): number => Number(dateString.slice(0, 4));

export const getMonth = (dateString: string): number => Number(dateString.slice(5, 7));

/** 期間を [開始日, 終了日] の閉区間（YYYY-MM-DD）に変換する */
export const toDateRange = (period: Period): { start: string; end: string } => {
  if (period.mode === PERIOD_MODES.MONTH && period.month != null) {
    const lastDay = new Date(period.year, period.month, 0).getDate();
    return {
      start: `${pad(period.year, 4)}-${pad(period.month, 2)}-01`,
      end: `${pad(period.year, 4)}-${pad(period.month, 2)}-${pad(lastDay, 2)}`,
    };
  }
  return {
    start: `${pad(period.year, 4)}-01-01`,
    end: `${pad(period.year, 4)}-12-31`,
  };
};

/** 画面表示用の期間ラベル（例：2026年 / 2026年8月） */
export const formatPeriodLabel = (period: Period): string =>
  period.mode === PERIOD_MODES.MONTH && period.month != null
    ? `${period.year}年${period.month}月`
    : `${period.year}年`;

/** ファイル名やシート名に使う期間表現（例：2026 / 2026-08） */
export const formatPeriodSlug = (period: Period): string =>
  period.mode === PERIOD_MODES.MONTH && period.month != null
    ? `${pad(period.year, 4)}-${pad(period.month, 2)}`
    : `${pad(period.year, 4)}`;

/** 現在日付から既定の期間を作る */
export const createCurrentPeriod = (mode: Period['mode']): Period => {
  const now = new Date();
  return {
    mode,
    year: now.getFullYear(),
    month: mode === PERIOD_MODES.MONTH ? now.getMonth() + 1 : null,
  };
};

/** 選択肢に出す年の一覧（データの最古〜最新年と当年を含む降順） */
export const buildYearOptions = (
  oldestYear: number | null,
  newestYear: number | null,
): number[] => {
  const currentYear = new Date().getFullYear();
  const from = Math.min(oldestYear ?? currentYear, currentYear);
  const to = Math.max(newestYear ?? currentYear, currentYear);
  const years: number[] = [];
  for (let year = to; year >= from; year -= 1) {
    years.push(year);
  }
  return years;
};

export const MONTH_OPTIONS: readonly number[] = Array.from(
  { length: MONTHS_IN_YEAR },
  (_, index) => index + 1,
);

/** バックアップフォルダ名などに使うタイムスタンプ（YYYYMMDD-HHmmss） */
export const toTimestampString = (date: Date = new Date()): string =>
  `${pad(date.getFullYear(), 4)}${pad(date.getMonth() + 1, 2)}${pad(date.getDate(), 2)}` +
  `-${pad(date.getHours(), 2)}${pad(date.getMinutes(), 2)}${pad(date.getSeconds(), 2)}`;
