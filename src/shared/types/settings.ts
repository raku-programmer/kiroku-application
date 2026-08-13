import type { TaxTreatment } from '@shared/constants/tax';
import type { PeriodMode } from '@shared/types/expense';

/** アプリ設定。永続化は key-value だが、アプリ内ではこの型で扱う。 */
export interface AppSettings {
  /**
   * 同意済みの利用規約のバージョン。
   * TERMS_VERSION より小さい間はアプリを使わせない（0 = 未同意）。
   */
  agreedTermsVersion: number;
  /** 初期セットアップを完了したか。false なら起動時にセットアップ画面を出す */
  setupCompleted: boolean;
  /** 起動時に自動バックアップを行う */
  backupEnabledOnStartup: boolean;
  /** バックアップ先。null なら既定ディレクトリ（userData 配下） */
  backupDirectory: string | null;
  /** 保持する世代数。超過分は古い順に削除 */
  backupRetentionCount: number;
  /** バックアップに添付ファイルを含める */
  backupIncludeAttachments: boolean;
  /** Excel の既定保存先。null なら OS の書類フォルダ */
  exportDirectory: string | null;
  /**
   * 領収書の取り込み元フォルダ。null なら OS のピクチャフォルダ。
   * Bluetooth の受信先やクラウド同期先を指定しておくと、
   * スマホから送った画像をそのまま添付できる。
   */
  importDirectory: string | null;
  /** Excel のファイル名テンプレート */
  exportFileNameTemplate: string;
  /** 経費入力の既定税区分 */
  defaultTaxTreatment: TaxTreatment;
  /** 経費入力の既定税率（ベーシスポイント） */
  defaultTaxRate: number;
  /** 経費入力の既定按分率（ベーシスポイント） */
  defaultAllocationRate: number;
  /** サイドメニューを折りたたんでいるか */
  sideMenuCollapsed: boolean;
  /** 経費一覧の既定期間モード */
  defaultPeriodMode: PeriodMode;
}

/** バックアップ世代の情報 */
export interface BackupEntry {
  /** バックアップフォルダのフルパス */
  path: string;
  /** 表示名（フォルダ名） */
  name: string;
  createdAt: string;
  byteSize: number;
  includesAttachments: boolean;
}

/** 起動時バックアップの実行結果 */
export interface StartupBackupStatus {
  executed: boolean;
  succeeded: boolean;
  createdAt: string | null;
  message: string | null;
}

/** データ領域の場所（設定画面での表示用） */
export interface StorageLocations {
  databasePath: string;
  attachmentsDirectory: string;
  backupDirectory: string;
  /** 領収書の取り込み元（未設定なら既定のフォルダ） */
  importDirectory: string;
}
