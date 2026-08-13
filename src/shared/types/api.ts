import type {
  CsvImportCommitItem,
  CsvImportCommitResult,
  CsvImportPreview,
} from '@shared/types/csv-import';
import type {
  AttachmentContent,
  AttachmentDraft,
  AttachmentSource,
  Expense,
  ExpenseFilter,
  ExpenseInput,
  ExpenseListResult,
  ImportCandidate,
  PayeeSuggestion,
} from '@shared/types/expense';
import type {
  AccountCategory,
  AccountCategoryInput,
  PaymentMethod,
  PaymentMethodInput,
  PresetBundle,
} from '@shared/types/preset';
import type { Result } from '@shared/types/result';
import type {
  AppSettings,
  BackupEntry,
  StartupBackupStatus,
  StorageLocations,
} from '@shared/types/settings';

/** 経費が存在する年の範囲（一覧の年プルダウン生成に使う） */
export interface YearRange {
  oldest: number | null;
  newest: number | null;
}

/** Excel 出力の結果。キャンセル時は canceled = true */
export interface ExportResult {
  canceled: boolean;
  filePath: string | null;
  rowCount: number;
}

/** 初期化でトランザクションデータを削除した結果 */
export interface DataResetResult {
  deletedExpenseCount: number;
  /** 削除の直前に自動取得したバックアップの場所 */
  backupPath: string;
}

/** renderer に公開する API。preload の実装と 1 対 1 で対応する。 */
export interface KirokuApi {
  expenses: {
    list(filter: ExpenseFilter): Promise<Result<ExpenseListResult>>;
    get(id: number): Promise<Result<Expense>>;
    create(input: ExpenseInput): Promise<Result<Expense>>;
    update(id: number, input: ExpenseInput): Promise<Result<Expense>>;
    remove(id: number): Promise<Result<null>>;
    yearRange(): Promise<Result<YearRange>>;
  };
  payees: {
    suggest(query: string): Promise<Result<PayeeSuggestion[]>>;
    list(): Promise<Result<PayeeSuggestion[]>>;
    descriptions(payeeId: number): Promise<Result<string[]>>;
  };
  presets: {
    list(): Promise<Result<PresetBundle>>;
    createAccountCategory(input: AccountCategoryInput): Promise<Result<AccountCategory>>;
    updateAccountCategory(
      id: number,
      input: AccountCategoryInput,
    ): Promise<Result<AccountCategory>>;
    deleteAccountCategory(id: number): Promise<Result<null>>;
    reorderAccountCategories(ids: number[]): Promise<Result<AccountCategory[]>>;
    createPaymentMethod(input: PaymentMethodInput): Promise<Result<PaymentMethod>>;
    updatePaymentMethod(id: number, input: PaymentMethodInput): Promise<Result<PaymentMethod>>;
    deletePaymentMethod(id: number): Promise<Result<null>>;
    reorderPaymentMethods(ids: number[]): Promise<Result<PaymentMethod[]>>;
  };
  settings: {
    get(): Promise<Result<AppSettings>>;
    update(patch: Partial<AppSettings>): Promise<Result<AppSettings>>;
    chooseDirectory(current: string | null): Promise<Result<string | null>>;
    storageLocations(): Promise<Result<StorageLocations>>;
  };
  backup: {
    run(): Promise<Result<BackupEntry>>;
    list(): Promise<Result<BackupEntry[]>>;
    restore(backupPath: string): Promise<Result<null>>;
    startupStatus(): Promise<Result<StartupBackupStatus>>;
  };
  data: {
    /**
     * 経費・領収書・請求元の記憶を削除する（プリセットと設定は残す）。
     * 取り返しがつかないため、main 側で必ず直前にバックアップを取る。
     */
    resetTransactions(): Promise<Result<DataResetResult>>;
  };
  exports: {
    excel(filter: ExpenseFilter): Promise<Result<ExportResult>>;
  };
  imports: {
    /** ファイル選択ダイアログを開き、読み込んで検証した結果を返す。キャンセル時は null */
    parseCsv(): Promise<Result<CsvImportPreview | null>>;
    /** 検証に通った行だけを渡して一括登録する */
    commitCsv(items: CsvImportCommitItem[]): Promise<Result<CsvImportCommitResult>>;
    /** 記入例つきのテンプレート CSV を保存する。キャンセル時は canceled: true */
    downloadCsvTemplate(): Promise<Result<ExportResult>>;
  };
  attachments: {
    pick(): Promise<Result<AttachmentDraft[]>>;
    /** ドラッグ&ドロップで得たパスを添付候補に変換する */
    resolvePaths(paths: string[]): Promise<Result<AttachmentDraft[]>>;
    open(attachmentId: number): Promise<Result<null>>;
    /** プレビュー表示のために中身を読み出す（保存前のファイルも指定できる） */
    read(source: AttachmentSource): Promise<Result<AttachmentContent>>;
    /** 別ウィンドウで大きく表示する（画像・PDF のみ） */
    openInWindow(source: AttachmentSource): Promise<Result<null>>;
    /** クリップボードの画像を添付候補にする。画像が無ければエラー */
    fromClipboard(): Promise<Result<AttachmentDraft[]>>;
    /** 取り込みフォルダのファイルをサムネイル付きで新しい順に返す */
    listImportCandidates(): Promise<Result<ImportCandidate[]>>;
    /** ドロップされた File から実パスを得る（preload 側で同期的に解決） */
    getPathForFile(file: File): string;
  };
  system: {
    openPath(targetPath: string): Promise<Result<null>>;
    /** 利用規約に同意しなかった場合にアプリを終了する */
    quit(): Promise<Result<null>>;
  };
}
