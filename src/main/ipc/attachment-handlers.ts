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
  pickAttachments,
  resolveAttachmentDrafts,
} from '@main/services/attachment-service';
import { ERROR_CODES } from '@shared/constants/error-codes';
import { IPC_CHANNELS } from '@shared/ipc-channels';

export const registerAttachmentHandlers = (): void => {
  registerHandler(IPC_CHANNELS.ATTACHMENT_PICK, (context) => pickAttachments(context.window));

  registerHandler(IPC_CHANNELS.ATTACHMENT_RESOLVE_PATHS, (_context, args) =>
    resolveAttachmentDrafts(requireStringArray(args[0], 'ファイルパス')),
  );

  registerHandler(IPC_CHANNELS.ATTACHMENT_OPEN, async (_context, args) => {
    await openAttachment(requireNumber(args[0], '添付 ID'));
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
