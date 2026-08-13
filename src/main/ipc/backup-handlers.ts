import { registerHandler, requireString } from '@main/ipc/handler-utils';
import {
  createBackup,
  getStartupBackupStatus,
  listBackups,
  restoreBackup,
} from '@main/services/backup-service';
import { resetTransactionData } from '@main/services/data-reset-service';
import { IPC_CHANNELS } from '@shared/ipc-channels';

export const registerBackupHandlers = (): void => {
  registerHandler(IPC_CHANNELS.BACKUP_RUN, () => createBackup());

  registerHandler(IPC_CHANNELS.BACKUP_LIST, () => listBackups());

  registerHandler(IPC_CHANNELS.BACKUP_RESTORE, async (_context, args) => {
    await restoreBackup(requireString(args[0], 'バックアップの場所'));
    return null;
  });

  registerHandler(IPC_CHANNELS.BACKUP_STARTUP_STATUS, () => getStartupBackupStatus());

  registerHandler(IPC_CHANNELS.DATA_RESET_TRANSACTIONS, () => resetTransactionData());
};
