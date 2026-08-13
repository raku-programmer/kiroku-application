import type { Migration } from '@main/db/migrations/types';
import { ALLOCATION_DELEGATED_NOTE } from '@shared/constants/tax';

/**
 * 「按分なし（税理士に依頼）」を専用の列で持つようにする。
 *
 * これまでは備考に定型文が入っているかどうかで判定していたため、
 * 利用者が備考を書き換えるとチェックが外れてしまっていた。
 * 状態そのものを列に持たせ、備考の文言とは切り離す。
 *
 * 既存の行は、これまでの判定方法（備考に定型文を含むか）でフラグを立て直す。
 */
export const migration003AllocationDelegated: Migration = {
  version: 3,
  name: 'allocation-delegated',
  up: (db) => {
    db.exec(
      `ALTER TABLE expenses ADD COLUMN allocation_delegated INTEGER NOT NULL DEFAULT 0`,
    );

    // 文言は shared の定数を唯一の出所にする（ここで直書きしない）
    db.prepare(
      `UPDATE expenses SET allocation_delegated = 1 WHERE instr(note, ?) > 0`,
    ).run(ALLOCATION_DELEGATED_NOTE);
  },
};
