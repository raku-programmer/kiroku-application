import { describe, expect, it } from 'vitest';
import { cellAt, isBlankCsvRow, parseCsvRows, stripBom } from '@shared/utils/csv';

describe('parseCsvRows', () => {
  it('カンマ区切りの単純な行を分解する', () => {
    expect(parseCsvRows('a,b,c\n1,2,3\n')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });

  it('CRLF・LF どちらの改行も扱える', () => {
    expect(parseCsvRows('a,b\r\n1,2\r\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
    expect(parseCsvRows('a,b\n1,2\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('末尾に改行がない最終行も取りこぼさない', () => {
    expect(parseCsvRows('a,b\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('ダブルクォートで囲んだ値の中のカンマを 1 つのフィールドとして扱う', () => {
    expect(parseCsvRows('"a,b",c\n')).toEqual([['a,b', 'c']]);
  });

  it('ダブルクォートで囲んだ値の中の改行を 1 つのフィールドとして扱う', () => {
    expect(parseCsvRows('"line1\nline2",b\n')).toEqual([['line1\nline2', 'b']]);
  });

  it('二重引用符のエスケープ（""）を 1 文字の " として扱う', () => {
    expect(parseCsvRows('"say ""hi""",b\n')).toEqual([['say "hi"', 'b']]);
  });

  it('空フィールドを空文字として保持する', () => {
    expect(parseCsvRows('a,,c\n')).toEqual([['a', '', 'c']]);
  });

  it('空文字列は空の配列を返す', () => {
    expect(parseCsvRows('')).toEqual([]);
  });

  it('列数が異なる行をそのまま返す（呼び出し側で検証する）', () => {
    expect(parseCsvRows('a,b,c\n1,2\n')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2'],
    ]);
  });
});

describe('stripBom', () => {
  it('先頭の BOM 文字を取り除く', () => {
    expect(stripBom('﻿a,b')).toBe('a,b');
  });

  it('BOM が無ければそのまま返す', () => {
    expect(stripBom('a,b')).toBe('a,b');
  });
});

describe('isBlankCsvRow', () => {
  it('全列が空文字（または空白のみ）なら true', () => {
    expect(isBlankCsvRow([])).toBe(true);
    expect(isBlankCsvRow([''])).toBe(true);
    expect(isBlankCsvRow(['', '  ', ''])).toBe(true);
  });

  it('1 列でも値があれば false', () => {
    expect(isBlankCsvRow(['', 'x', ''])).toBe(false);
  });
});

describe('cellAt', () => {
  it('前後の空白を取り除いた値を返す', () => {
    expect(cellAt([' a ', 'b'], 0)).toBe('a');
  });

  it('存在しない列は空文字を返す', () => {
    expect(cellAt(['a'], 5)).toBe('');
  });
});
