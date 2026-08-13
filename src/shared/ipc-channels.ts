/**
 * IPC チャンネル名の唯一の定義元。
 * main / preload はここからのみ参照し、文字列を直接書かない。
 */
export const IPC_CHANNELS = {
  EXPENSE_LIST: 'expense:list',
  EXPENSE_GET: 'expense:get',
  EXPENSE_CREATE: 'expense:create',
  EXPENSE_UPDATE: 'expense:update',
  EXPENSE_DELETE: 'expense:delete',
  EXPENSE_YEAR_RANGE: 'expense:year-range',

  PAYEE_SUGGEST: 'payee:suggest',
  PAYEE_LIST: 'payee:list',
  PAYEE_DESCRIPTIONS: 'payee:descriptions',

  PRESET_LIST: 'preset:list',
  PRESET_ACCOUNT_CATEGORY_CREATE: 'preset:account-category:create',
  PRESET_ACCOUNT_CATEGORY_UPDATE: 'preset:account-category:update',
  PRESET_ACCOUNT_CATEGORY_DELETE: 'preset:account-category:delete',
  PRESET_ACCOUNT_CATEGORY_REORDER: 'preset:account-category:reorder',
  PRESET_PAYMENT_METHOD_CREATE: 'preset:payment-method:create',
  PRESET_PAYMENT_METHOD_UPDATE: 'preset:payment-method:update',
  PRESET_PAYMENT_METHOD_DELETE: 'preset:payment-method:delete',
  PRESET_PAYMENT_METHOD_REORDER: 'preset:payment-method:reorder',

  SETTING_GET: 'setting:get',
  SETTING_UPDATE: 'setting:update',
  SETTING_CHOOSE_DIRECTORY: 'setting:choose-directory',
  SETTING_STORAGE_LOCATIONS: 'setting:storage-locations',

  BACKUP_RUN: 'backup:run',
  BACKUP_LIST: 'backup:list',
  BACKUP_RESTORE: 'backup:restore',
  BACKUP_STARTUP_STATUS: 'backup:startup-status',

  /** 初期化：経費などのトランザクションデータを削除する */
  DATA_RESET_TRANSACTIONS: 'data:reset-transactions',

  EXPORT_EXCEL: 'export:excel',

  IMPORT_CSV_PARSE: 'import:csv:parse',
  IMPORT_CSV_COMMIT: 'import:csv:commit',
  IMPORT_CSV_TEMPLATE: 'import:csv:template',

  ATTACHMENT_PICK: 'attachment:pick',
  ATTACHMENT_RESOLVE_PATHS: 'attachment:resolve-paths',
  ATTACHMENT_OPEN: 'attachment:open',
  /** 経費照会のプレビューに出すため、添付ファイルの中身を読み出す */
  ATTACHMENT_READ: 'attachment:read',
  /** 添付ファイルを別ウィンドウで大きく表示する */
  ATTACHMENT_OPEN_WINDOW: 'attachment:open-window',
  /** クリップボードの画像を添付候補にする */
  ATTACHMENT_FROM_CLIPBOARD: 'attachment:from-clipboard',
  /** 取り込みフォルダにあるファイルを新しい順に返す */
  ATTACHMENT_LIST_IMPORT_CANDIDATES: 'attachment:list-import-candidates',

  SYSTEM_OPEN_PATH: 'system:open-path',
  SYSTEM_QUIT: 'system:quit',
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];

/** contextBridge で renderer に公開するグローバル名 */
export const BRIDGE_KEY = 'kiroku';
