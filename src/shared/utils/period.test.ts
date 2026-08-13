import { describe, expect, it } from 'vitest';
import { PERIOD_MODES } from '@shared/types/expense';
import {
  buildYearOptions,
  formatPeriodLabel,
  formatPeriodSlug,
  getMonth,
  getYear,
  isValidDateString,
  toDateRange,
  toDateString,
  toTimestampString,
} from '@shared/utils/period';

/**
 * 期間の境界を誤ると、月末や年末の経費が集計から漏れる。
 * 「取りこぼしがない」ことを重点的に確認する。
 */

const monthPeriod = (year: number, month: number) => ({
  mode: PERIOD_MODES.MONTH,
  year,
  month,
});

const yearPeriod = (year: number) => ({
  mode: PERIOD_MODES.YEAR,
  year,
  month: null,
});

describe('toDateRange', () => {
  it('年指定は 1/1 から 12/31 までになる', () => {
    expect(toDateRange(yearPeriod(2026))).toEqual({
      start: '2026-01-01',
      end: '2026-12-31',
    });
  });

  it('月指定はその月の末日までになる', () => {
    expect(toDateRange(monthPeriod(2026, 8))).toEqual({
      start: '2026-08-01',
      end: '2026-08-31',
    });
  });

  it('30 日で終わる月を正しく扱う', () => {
    expect(toDateRange(monthPeriod(2026, 4)).end).toBe('2026-04-30');
    expect(toDateRange(monthPeriod(2026, 11)).end).toBe('2026-11-30');
  });

  it('平年の 2 月は 28 日まで', () => {
    expect(toDateRange(monthPeriod(2026, 2)).end).toBe('2026-02-28');
  });

  it('閏年の 2 月は 29 日まで', () => {
    expect(toDateRange(monthPeriod(2024, 2)).end).toBe('2024-02-29');
  });

  it('100 年単位の閏年判定を誤らない（1900 年は平年、2000 年は閏年）', () => {
    expect(toDateRange(monthPeriod(1900, 2)).end).toBe('1900-02-28');
    expect(toDateRange(monthPeriod(2000, 2)).end).toBe('2000-02-29');
  });

  it('1 月と 12 月で年をまたがない', () => {
    expect(toDateRange(monthPeriod(2026, 1))).toEqual({
      start: '2026-01-01',
      end: '2026-01-31',
    });
    expect(toDateRange(monthPeriod(2026, 12))).toEqual({
      start: '2026-12-01',
      end: '2026-12-31',
    });
  });

  it('月モードでも month が未指定なら年の範囲にする', () => {
    expect(toDateRange({ mode: PERIOD_MODES.MONTH, year: 2026, month: null })).toEqual({
      start: '2026-01-01',
      end: '2026-12-31',
    });
  });
});

describe('isValidDateString', () => {
  it('実在する日付を受け入れる', () => {
    expect(isValidDateString('2026-08-12')).toBe(true);
    expect(isValidDateString('2024-02-29')).toBe(true);
  });

  it('実在しない日付をはじく', () => {
    expect(isValidDateString('2026-02-30')).toBe(false);
    expect(isValidDateString('2026-13-01')).toBe(false);
    expect(isValidDateString('2026-04-31')).toBe(false);
    expect(isValidDateString('2026-02-29')).toBe(false);
  });

  it('書式が違うものをはじく', () => {
    expect(isValidDateString('2026/08/12')).toBe(false);
    expect(isValidDateString('2026-8-12')).toBe(false);
    expect(isValidDateString('20260812')).toBe(false);
    expect(isValidDateString('')).toBe(false);
    expect(isValidDateString('abc')).toBe(false);
  });
});

describe('日付文字列の分解', () => {
  it('年と月を取り出せる', () => {
    expect(getYear('2026-08-12')).toBe(2026);
    expect(getMonth('2026-08-12')).toBe(8);
    expect(getMonth('2026-12-01')).toBe(12);
  });

  it('Date を YYYY-MM-DD に変換する（ゼロ埋めあり）', () => {
    expect(toDateString(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(toDateString(new Date(2026, 11, 31))).toBe('2026-12-31');
  });
});

describe('期間の表記', () => {
  it('画面表示用のラベルを作る', () => {
    expect(formatPeriodLabel(yearPeriod(2026))).toBe('2026年');
    expect(formatPeriodLabel(monthPeriod(2026, 8))).toBe('2026年8月');
  });

  it('ファイル名用のスラッグはゼロ埋めする', () => {
    expect(formatPeriodSlug(yearPeriod(2026))).toBe('2026');
    expect(formatPeriodSlug(monthPeriod(2026, 8))).toBe('2026-08');
    expect(formatPeriodSlug(monthPeriod(2026, 12))).toBe('2026-12');
  });
});

describe('buildYearOptions', () => {
  const currentYear = new Date().getFullYear();

  it('データがなければ当年だけを返す', () => {
    expect(buildYearOptions(null, null)).toEqual([currentYear]);
  });

  it('過去のデータがあれば当年までを降順で埋める', () => {
    const years = buildYearOptions(currentYear - 2, currentYear);
    expect(years).toEqual([currentYear, currentYear - 1, currentYear - 2]);
  });

  it('当年より未来の日付があってもその年を含める', () => {
    const years = buildYearOptions(currentYear, currentYear + 1);
    expect(years[0]).toBe(currentYear + 1);
    expect(years).toContain(currentYear);
  });

  it('必ず当年を含む', () => {
    expect(buildYearOptions(currentYear - 5, currentYear - 3)).toContain(currentYear);
  });
});

describe('toTimestampString', () => {
  it('バックアップ名に使う形式（YYYYMMDD-HHmmss）で返す', () => {
    expect(toTimestampString(new Date(2026, 7, 12, 9, 5, 3))).toBe('20260812-090503');
  });
});
