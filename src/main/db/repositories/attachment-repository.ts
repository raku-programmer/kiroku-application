import { getDatabase } from '@main/db/connection';
import { nowIso } from '@main/utils/time';
import type { Attachment } from '@shared/types/expense';

interface AttachmentRow {
  id: number;
  expense_id: number;
  original_name: string;
  stored_path: string;
  mime_type: string | null;
  byte_size: number;
  created_at: string;
}

const SELECT_COLUMNS = `id, expense_id, original_name, stored_path, mime_type, byte_size, created_at`;

const toAttachment = (row: AttachmentRow): Attachment => ({
  id: row.id,
  expenseId: row.expense_id,
  originalName: row.original_name,
  storedPath: row.stored_path,
  mimeType: row.mime_type,
  byteSize: row.byte_size,
  createdAt: row.created_at,
});

export const listAttachmentsByExpense = (expenseId: number): Attachment[] =>
  getDatabase()
    .prepare<[number], AttachmentRow>(
      `SELECT ${SELECT_COLUMNS} FROM attachments WHERE expense_id = ? ORDER BY id ASC`,
    )
    .all(expenseId)
    .map(toAttachment);

/** 一覧表示用にまとめて取得する（N+1 回避） */
export const listAttachmentsByExpenses = (
  expenseIds: number[],
): Map<number, Attachment[]> => {
  const grouped = new Map<number, Attachment[]>();
  if (expenseIds.length === 0) {
    return grouped;
  }
  const placeholders = expenseIds.map(() => '?').join(', ');
  const rows = getDatabase()
    .prepare<number[], AttachmentRow>(
      `SELECT ${SELECT_COLUMNS} FROM attachments
        WHERE expense_id IN (${placeholders})
        ORDER BY expense_id ASC, id ASC`,
    )
    .all(...expenseIds);

  for (const row of rows) {
    const attachment = toAttachment(row);
    const list = grouped.get(attachment.expenseId);
    if (list) {
      list.push(attachment);
    } else {
      grouped.set(attachment.expenseId, [attachment]);
    }
  }
  return grouped;
};

export const findAttachment = (id: number): Attachment | null => {
  const row = getDatabase()
    .prepare<[number], AttachmentRow>(`SELECT ${SELECT_COLUMNS} FROM attachments WHERE id = ?`)
    .get(id);
  return row ? toAttachment(row) : null;
};

export interface AttachmentInsert {
  expenseId: number;
  originalName: string;
  storedPath: string;
  mimeType: string | null;
  byteSize: number;
}

export const insertAttachment = (input: AttachmentInsert): number => {
  const result = getDatabase()
    .prepare(
      `INSERT INTO attachments
        (expense_id, original_name, stored_path, mime_type, byte_size, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.expenseId,
      input.originalName,
      input.storedPath,
      input.mimeType,
      input.byteSize,
      nowIso(),
    );
  return Number(result.lastInsertRowid);
};

export const deleteAttachments = (ids: number[]): void => {
  if (ids.length === 0) {
    return;
  }
  const placeholders = ids.map(() => '?').join(', ');
  getDatabase()
    .prepare(`DELETE FROM attachments WHERE id IN (${placeholders})`)
    .run(...ids);
};
