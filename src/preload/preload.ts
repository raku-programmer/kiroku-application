import { contextBridge, ipcRenderer, webUtils } from 'electron';
import { BRIDGE_KEY, IPC_CHANNELS } from '@shared/ipc-channels';
import type { KirokuApi } from '@shared/types/api';

const invoke = <T>(channel: string, ...args: unknown[]): Promise<T> =>
  ipcRenderer.invoke(channel, ...args) as Promise<T>;

/**
 * renderer に公開する API。
 * ここに列挙したチャンネル以外へは一切アクセスできない。
 */
const api: KirokuApi = {
  expenses: {
    list: (filter) => invoke(IPC_CHANNELS.EXPENSE_LIST, filter),
    get: (id) => invoke(IPC_CHANNELS.EXPENSE_GET, id),
    create: (input) => invoke(IPC_CHANNELS.EXPENSE_CREATE, input),
    update: (id, input) => invoke(IPC_CHANNELS.EXPENSE_UPDATE, id, input),
    remove: (id) => invoke(IPC_CHANNELS.EXPENSE_DELETE, id),
    yearRange: () => invoke(IPC_CHANNELS.EXPENSE_YEAR_RANGE),
  },
  payees: {
    suggest: (query) => invoke(IPC_CHANNELS.PAYEE_SUGGEST, query),
    list: () => invoke(IPC_CHANNELS.PAYEE_LIST),
    descriptions: (payeeId) => invoke(IPC_CHANNELS.PAYEE_DESCRIPTIONS, payeeId),
  },
  presets: {
    list: () => invoke(IPC_CHANNELS.PRESET_LIST),
    createAccountCategory: (input) =>
      invoke(IPC_CHANNELS.PRESET_ACCOUNT_CATEGORY_CREATE, input),
    updateAccountCategory: (id, input) =>
      invoke(IPC_CHANNELS.PRESET_ACCOUNT_CATEGORY_UPDATE, id, input),
    deleteAccountCategory: (id) => invoke(IPC_CHANNELS.PRESET_ACCOUNT_CATEGORY_DELETE, id),
    reorderAccountCategories: (ids) =>
      invoke(IPC_CHANNELS.PRESET_ACCOUNT_CATEGORY_REORDER, ids),
    createPaymentMethod: (input) => invoke(IPC_CHANNELS.PRESET_PAYMENT_METHOD_CREATE, input),
    updatePaymentMethod: (id, input) =>
      invoke(IPC_CHANNELS.PRESET_PAYMENT_METHOD_UPDATE, id, input),
    deletePaymentMethod: (id) => invoke(IPC_CHANNELS.PRESET_PAYMENT_METHOD_DELETE, id),
    reorderPaymentMethods: (ids) => invoke(IPC_CHANNELS.PRESET_PAYMENT_METHOD_REORDER, ids),
  },
  settings: {
    get: () => invoke(IPC_CHANNELS.SETTING_GET),
    update: (patch) => invoke(IPC_CHANNELS.SETTING_UPDATE, patch),
    chooseDirectory: (current) => invoke(IPC_CHANNELS.SETTING_CHOOSE_DIRECTORY, current),
    storageLocations: () => invoke(IPC_CHANNELS.SETTING_STORAGE_LOCATIONS),
  },
  backup: {
    run: () => invoke(IPC_CHANNELS.BACKUP_RUN),
    list: () => invoke(IPC_CHANNELS.BACKUP_LIST),
    restore: (backupPath) => invoke(IPC_CHANNELS.BACKUP_RESTORE, backupPath),
    startupStatus: () => invoke(IPC_CHANNELS.BACKUP_STARTUP_STATUS),
  },
  data: {
    resetTransactions: () => invoke(IPC_CHANNELS.DATA_RESET_TRANSACTIONS),
  },
  exports: {
    excel: (filter) => invoke(IPC_CHANNELS.EXPORT_EXCEL, filter),
  },
  imports: {
    parseCsv: () => invoke(IPC_CHANNELS.IMPORT_CSV_PARSE),
    commitCsv: (items) => invoke(IPC_CHANNELS.IMPORT_CSV_COMMIT, items),
    downloadCsvTemplate: () => invoke(IPC_CHANNELS.IMPORT_CSV_TEMPLATE),
  },
  attachments: {
    pick: () => invoke(IPC_CHANNELS.ATTACHMENT_PICK),
    resolvePaths: (paths) => invoke(IPC_CHANNELS.ATTACHMENT_RESOLVE_PATHS, paths),
    open: (attachmentId) => invoke(IPC_CHANNELS.ATTACHMENT_OPEN, attachmentId),
    fromClipboard: () => invoke(IPC_CHANNELS.ATTACHMENT_FROM_CLIPBOARD),
    listImportCandidates: () => invoke(IPC_CHANNELS.ATTACHMENT_LIST_IMPORT_CANDIDATES),
    // ドロップされた File から実パスを得る（Electron 32 以降は File.path が使えない）
    getPathForFile: (file) => webUtils.getPathForFile(file),
  },
  system: {
    openPath: (targetPath) => invoke(IPC_CHANNELS.SYSTEM_OPEN_PATH, targetPath),
    quit: () => invoke(IPC_CHANNELS.SYSTEM_QUIT),
  },
};

contextBridge.exposeInMainWorld(BRIDGE_KEY, api);
