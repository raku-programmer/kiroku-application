import { app, shell } from 'electron';
import {
  registerHandler,
  requireNumber,
  requireString,
  requireStringArray,
} from '@main/ipc/handler-utils';
import { AppException } from '@main/errors';
import {
  createDraftFromClipboard,
  listImportCandidates,
  openAttachment,
  openAttachmentInWindow,
  pickAttachments,
  readAttachmentContent,
  resolveAttachmentDrafts,
} from '@main/services/attachment-service';
import { ERROR_CODES } from '@shared/constants/error-codes';
import { IPC_CHANNELS } from '@shared/ipc-channels';
import type { AttachmentSource } from '@shared/types/expense';

/**
 * プレビュー対象の指定を取り出す。
 * 保存済みなら添付 ID、保存前なら選択元のフルパスで指定される。
 */
const requireAttachmentSource = (value: unknown): AttachmentSource => {
  const source = value as { id?: unknown; sourcePath?: unknown } | null;
  if (source !== null && typeof source === 'object') {
    if (source.id != null) {
      return { id: requireNumber(source.id, '添付 ID') };
    }
    if (source.sourcePath != null) {
      return { sourcePath: requireString(source.sourcePath, 'ファイルパス') };
    }
  }
  throw new AppException(ERROR_CODES.VALIDATION_FAILED, '領収書の指定が不正です。');
};

export const registerAttachmentHandlers = (): void => {
  registerHandler(IPC_CHANNELS.ATTACHMENT_PICK, (context) => pickAttachments(context.window));

  registerHandler(IPC_CHANNELS.ATTACHMENT_RESOLVE_PATHS, (_context, args) =>
    resolveAttachmentDrafts(requireStringArray(args[0], 'ファイルパス')),
  );

  registerHandler(IPC_CHANNELS.ATTACHMENT_OPEN, async (_context, args) => {
    await openAttachment(requireNumber(args[0], '添付 ID'));
    return null;
  });

  registerHandler(IPC_CHANNELS.ATTACHMENT_READ, (_context, args) =>
    readAttachmentContent(requireAttachmentSource(args[0])),
  );

  registerHandler(IPC_CHANNELS.ATTACHMENT_OPEN_WINDOW, async (context, args) => {
    await openAttachmentInWindow(requireAttachmentSource(args[0]), context.window);
    return null;
  });

  registerHandler(IPC_CHANNELS.ATTACHMENT_FROM_CLIPBOARD, () => createDraftFromClipboard());

  registerHandler(IPC_CHANNELS.ATTACHMENT_LIST_IMPORT_CANDIDATES, () =>
    listImportCandidates(),
  );

  registerHandler(IPC_CHANNELS.SYSTEM_OPEN_PATH, async (_context, args) => {
    const targetPath = requireString(args[0], 'パス');
    const errorMessage = await shell.openPath(targetPath);
    if (errorMessage) {
      throw new AppException(ERROR_CODES.FILE_ERROR, errorMessage);
    }
    return null;
  });

  // 利用規約に同意しなかったときの終了。応答を返してから閉じる。
  registerHandler(IPC_CHANNELS.SYSTEM_QUIT, () => {
    setImmediate(() => app.quit());
    return null;
  });
};
