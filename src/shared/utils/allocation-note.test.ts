import { describe, expect, it } from 'vitest';
import { ALLOCATION_DELEGATED_NOTE } from '@shared/constants/tax';
import {
  hasDelegatedNote,
  withDelegatedNote,
  withoutDelegatedNote,
} from '@shared/utils/allocation-note';

/**
 * 「按分なし」の状態は備考の定型文で表す。
 * 判定を誤ると、保存済みの経費を開き直したときにチェックが復元されない。
 */

describe('hasDelegatedNote', () => {
  it('定型文だけの備考を検出する', () => {
    expect(hasDelegatedNote(ALLOCATION_DELEGATED_NOTE)).toBe(true);
  });

  it('利用者の文章と併記されていても検出する', () => {
    expect(hasDelegatedNote(`打ち合わせ分\n${ALLOCATION_DELEGATED_NOTE}`)).toBe(true);
    expect(hasDelegatedNote(`${ALLOCATION_DELEGATED_NOTE}\n打ち合わせ分`)).toBe(true);
  });

  it('前後に空白があっても検出する', () => {
    expect(hasDelegatedNote(`  ${ALLOCATION_DELEGATED_NOTE}  `)).toBe(true);
  });

  it('定型文がなければ false', () => {
    expect(hasDelegatedNote('')).toBe(false);
    expect(hasDelegatedNote('按分は自分で計算する')).toBe(false);
  });

  it('同じ行に他の文字が混ざっている場合は検出しない', () => {
    expect(hasDelegatedNote(`備考：${ALLOCATION_DELEGATED_NOTE}`)).toBe(false);
  });
});

describe('withDelegatedNote', () => {
  it('空の備考には定型文だけを入れる', () => {
    expect(withDelegatedNote('')).toBe(ALLOCATION_DELEGATED_NOTE);
    expect(withDelegatedNote('   ')).toBe(ALLOCATION_DELEGATED_NOTE);
  });

  it('既存の文章の後ろに改行して足す', () => {
    expect(withDelegatedNote('打ち合わせ分')).toBe(
      `打ち合わせ分\n${ALLOCATION_DELEGATED_NOTE}`,
    );
  });

  it('二重に足さない', () => {
    const once = withDelegatedNote('打ち合わせ分');
    expect(withDelegatedNote(once)).toBe(once);
  });
});

describe('withoutDelegatedNote', () => {
  it('定型文だけの備考は空になる', () => {
    expect(withoutDelegatedNote(ALLOCATION_DELEGATED_NOTE)).toBe('');
  });

  it('利用者が書いた文章は残す', () => {
    expect(withoutDelegatedNote(`打ち合わせ分\n${ALLOCATION_DELEGATED_NOTE}`)).toBe(
      '打ち合わせ分',
    );
    expect(withoutDelegatedNote(`${ALLOCATION_DELEGATED_NOTE}\n打ち合わせ分`)).toBe(
      '打ち合わせ分',
    );
  });

  it('複数行の文章を保つ', () => {
    const note = `1行目\n${ALLOCATION_DELEGATED_NOTE}\n2行目`;
    expect(withoutDelegatedNote(note)).toBe('1行目\n2行目');
  });

  it('定型文がなければそのまま（前後の空白のみ除く）', () => {
    expect(withoutDelegatedNote('打ち合わせ分')).toBe('打ち合わせ分');
    expect(withoutDelegatedNote('')).toBe('');
  });
});

describe('付け外しの往復', () => {
  it('付けて外すと元の文章に戻る', () => {
    for (const note of ['', '打ち合わせ分', '1行目\n2行目']) {
      expect(withoutDelegatedNote(withDelegatedNote(note))).toBe(note.trim());
    }
  });
});
