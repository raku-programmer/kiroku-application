import { registerAttachmentHandlers } from '@main/ipc/attachment-handlers';
import { registerBackupHandlers } from '@main/ipc/backup-handlers';
import { registerExpenseHandlers } from '@main/ipc/expense-handlers';
import { registerExportHandlers } from '@main/ipc/export-handlers';
import { registerImportHandlers } from '@main/ipc/import-handlers';
import { registerPresetHandlers } from '@main/ipc/preset-handlers';
import { registerSettingHandlers } from '@main/ipc/setting-handlers';

/** すべての IPC ハンドラを登録する。 */
export const registerIpcHandlers = (): void => {
  registerExpenseHandlers();
  registerPresetHandlers();
  registerSettingHandlers();
  registerBackupHandlers();
  registerExportHandlers();
  registerImportHandlers();
  registerAttachmentHandlers();
};
