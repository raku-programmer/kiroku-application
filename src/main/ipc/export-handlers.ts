import { registerHandler } from '@main/ipc/handler-utils';
import { exportExpensesToExcel } from '@main/services/excel-export-service';
import { normalizeExpenseFilter } from '@main/services/filter-validator';
import { IPC_CHANNELS } from '@shared/ipc-channels';

export const registerExportHandlers = (): void => {
  registerHandler(IPC_CHANNELS.EXPORT_EXCEL, (context, args) =>
    exportExpensesToExcel(context.window, normalizeExpenseFilter(args[0])),
  );
};
