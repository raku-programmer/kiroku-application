import { BrowserWindow, Menu, app } from 'electron';
import started from 'electron-squirrel-startup';
import { SHOW_APPLICATION_MENU } from '@main/config/app-config';
import { closeDatabase, openDatabase } from '@main/db/connection';
import { registerIpcHandlers } from '@main/ipc';
import { clearClipboardTempFiles } from '@main/services/attachment-service';
import { runStartupBackupIfEnabled } from '@main/services/backup-service';
import { seedPresetsIfEmpty } from '@main/services/seed-service';
import { createMainWindow } from '@main/windows/main-window';

// Windows のインストーラーがショートカットを作成／削除する間は起動しない
if (started) {
  app.quit();
}

const bootstrap = async (): Promise<void> => {
  if (!SHOW_APPLICATION_MENU) {
    // ウィンドウを作る前に消しておく（あとから消すと一瞬表示されてしまう）
    Menu.setApplicationMenu(null);
  }

  // DB を開く → マイグレーション → 初期プリセット投入 → 起動時バックアップ の順に実行する
  openDatabase();
  seedPresetsIfEmpty();
  registerIpcHandlers();

  // バックアップが失敗してもアプリの起動は継続する（結果は設定画面で確認できる）
  await runStartupBackupIfEnabled();

  // 前回、貼り付けたが添付しなかった画像の残りを捨てる
  await clearClipboardTempFiles();

  createMainWindow();
};

app.on('ready', () => {
  void bootstrap();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

app.on('will-quit', () => {
  closeDatabase();
});
