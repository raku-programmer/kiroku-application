import { ALLOCATION_DELEGATED_NOTE } from '@shared/constants/tax';

/**
 * 「按分なし（税理士に依頼）」を備考へ書き添えるためのユーティリティ。
 *
 * 状態そのものは expenses.allocation_delegated 列が持つ。
 * ここで扱う定型文は、Excel に出力したときに税理士がそのまま読めるようにするための
 * 「表示」であって、判定の根拠ではない。利用者が備考から文言を消しても状態は変わらない。
 */

const NOTE_LINE_SEPARATOR = '\n';

export const hasDelegatedNote = (note: string): boolean =>
  note.split(NOTE_LINE_SEPARATOR).some((line) => line.trim() === ALLOCATION_DELEGATED_NOTE);

/** 既に入っている場合は二重に足さない。 */
export const withDelegatedNote = (note: string): string => {
  if (hasDelegatedNote(note)) {
    return note;
  }
  const trimmed = note.trim();
  return trimmed.length === 0
    ? ALLOCATION_DELEGATED_NOTE
    : `${trimmed}${NOTE_LINE_SEPARATOR}${ALLOCATION_DELEGATED_NOTE}`;
};

/** 定型文の行だけを取り除く。利用者が書いた文章は残す。 */
export const withoutDelegatedNote = (note: string): string =>
  note
    .split(NOTE_LINE_SEPARATOR)
    .filter((line) => line.trim() !== ALLOCATION_DELEGATED_NOTE)
    .join(NOTE_LINE_SEPARATOR)
    .trim();
