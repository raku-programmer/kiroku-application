import fsp from 'node:fs/promises';
import { getAttachmentsDirectory } from '@main/config/paths';
import { getDatabase } from '@main/db/connection';
import { createBackup } from '@main/services/backup-service';

/**
 * 初期化で消すもの・残すもの。
 *
 * 消す（トランザクションデータ）: 経費、領収書の添付、請求元の記憶
 * 残す（マスタデータ）: 勘定科目・支払方法のプリセット、各種設定
 *
 * 初期セットアップをやり直すと、プリセットと設定はウィザードで設定し直すことになる。
 * 一方で経費データが残っていると、消したつもりの内容が一覧に出てきてしまうため、
 * ここでまとめて削除する。
 */
export interface DataResetResult {
  /** 削除した経費の件数 */
  deletedExpenseCount: number;
  /** 削除前に取得した安全用バックアップの場所 */
  backupPath: string;
}

/**
 * トランザクションデータを削除する。
 *
 * 取り返しがつかない操作なので、必ず先に安全用バックアップを取る。
 * バックアップに失敗した場合は削除せずに中断する（createBackup が例外を投げる）。
 */
export const resetTransactionData = async (): Promise<DataResetResult> => {
  const backup = await createBackup({ safety: true, prune: false });

  const db = getDatabase();
  const deletedExpenseCount = db.transaction(() => {
    const countRow = db
      .prepare<[], { count: number }>('SELECT COUNT(*) AS count FROM expenses')
      .get();
    // attachments は expenses への外部キーが ON DELETE CASCADE なので併せて消える
    db.prepare('DELETE FROM expenses').run();
    db.prepare('DELETE FROM payees').run();
    return countRow?.count ?? 0;
  })();

  // 添付の実体も消す。DB だけ消すとファイルが孤児として残り続ける
  await fsp.rm(getAttachmentsDirectory(), { recursive: true, force: true });

  return { deletedExpenseCount, backupPath: backup.path };
};
