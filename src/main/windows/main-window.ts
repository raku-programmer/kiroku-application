import { BrowserWindow } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import {
  DEV_WINDOW_ICON_PATH,
  OPEN_DEVTOOLS_IN_DEVELOPMENT,
  WINDOW_CONFIG,
} from '@main/config/app-config';

/** ビルド後のプリロードスクリプト名（forge.config.ts のエントリ名と一致させる） */
const PRELOAD_FILE_NAME = 'preload.js';

/**
 * 開発時のウィンドウアイコン。
 * 配布版は実行ファイル側のアイコンが使われるので指定しない。
 */
const resolveDevelopmentIcon = (): string | undefined => {
  if (!MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    return undefined;
  }
  const iconPath = path.join(__dirname, DEV_WINDOW_ICON_PATH);
  return fs.existsSync(iconPath) ? iconPath : undefined;
};

export const createMainWindow = (): BrowserWindow => {
  const window = new BrowserWindow({
    width: WINDOW_CONFIG.defaultWidth,
    height: WINDOW_CONFIG.defaultHeight,
    minWidth: WINDOW_CONFIG.minWidth,
    minHeight: WINDOW_CONFIG.minHeight,
    backgroundColor: WINDOW_CONFIG.backgroundColor,
    title: WINDOW_CONFIG.title,
    icon: resolveDevelopmentIcon(),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, PRELOAD_FILE_NAME),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // 経費照会のプレビューで PDF を表示するために必要（Chromium 内蔵ビューア）
      plugins: true,
    },
  });

  window.once('ready-to-show', () => {
    window.show();
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    void window.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    if (OPEN_DEVTOOLS_IN_DEVELOPMENT) {
      window.webContents.openDevTools({ mode: 'detach' });
    }
  } else {
    void window.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  return window;
};
