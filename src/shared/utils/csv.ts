/**
 * 最小限の CSV パーサ（RFC4180 相当）。
 * ダブルクォートで囲んだ値の中のカンマ・改行・エスケープされた `""` を扱える。
 * 文字コードの判定・ファイル読み込みは main 側（csv-import-service.ts）の責務で、
 * ここは「デコード済みの文字列 → 行×列の配列」だけを担う（renderer からも使えるように）。
 */

const CR = '\r';
const LF = '\n';
const COMMA = ',';
const QUOTE = '"';

/** テキスト全体を行×列の文字列配列に変換する。 */
export const parseCsvRows = (text: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let index = 0;
  const length = text.length;

  const pushField = (): void => {
    row.push(field);
    field = '';
  };
  const pushRow = (): void => {
    pushField();
    rows.push(row);
    row = [];
  };

  while (index < length) {
    const char = text[index];

    if (inQuotes) {
      if (char === QUOTE) {
        if (text[index + 1] === QUOTE) {
          field += QUOTE;
          index += 2;
          continue;
        }
        inQuotes = false;
        index += 1;
        continue;
      }
      field += char;
      index += 1;
      continue;
    }

    if (char === QUOTE) {
      inQuotes = true;
      index += 1;
      continue;
    }
    if (char === COMMA) {
      pushField();
      index += 1;
      continue;
    }
    if (char === CR) {
      // CRLF・CR いずれも 1 つの改行として扱う
      pushRow();
      index += text[index + 1] === LF ? 2 : 1;
      continue;
    }
    if (char === LF) {
      pushRow();
      index += 1;
      continue;
    }
    field += char;
    index += 1;
  }

  // 末尾に改行がない最終行も取りこぼさない（空文字だけの行は除く）
  if (field.length > 0 || row.length > 0) {
    pushRow();
  }

  return rows;
};

/** UTF-8 BOM（Excel が UTF-8 CSV に付ける先頭 3 バイト相当の 1 文字）を取り除く。 */
export const BOM_CHAR = '﻿';

export const stripBom = (text: string): string =>
  text.startsWith(BOM_CHAR) ? text.slice(1) : text;

/** 完全に空の行（空文字のみの 1 列、または全列が空文字）を判定する。 */
export const isBlankCsvRow = (row: string[]): boolean =>
  row.every((cell) => cell.trim().length === 0);

/** row[index] の値をトリムして返す。存在しない列は空文字。 */
export const cellAt = (row: string[], index: number): string => (row[index] ?? '').trim();
