import { BrowserWindow } from 'electron';
import { ATTACHMENT_WINDOW_CONFIG } from '@main/config/app-config';

/**
 * 開いている拡大表示ウィンドウ。
 * 前後の領収書をたどるたびに増えると閉じる手間のほうが大きくなるため、
 * 1 枚だけ持ち回し、2 回目以降は中身を差し替える。
 */
let previewWindow: BrowserWindow | null = null;

const isAlive = (window: BrowserWindow | null): window is BrowserWindow =>
  window !== null && !window.isDestroyed();

/** 手前に出す（最小化されていれば戻す） */
const bringToFront = (window: BrowserWindow): void => {
  if (window.isMinimized()) {
    window.restore();
  }
  window.focus();
};

const createWindow = (parent: BrowserWindow | null): BrowserWindow => {
  const window = new BrowserWindow({
    width: ATTACHMENT_WINDOW_CONFIG.defaultWidth,
    height: ATTACHMENT_WINDOW_CONFIG.defaultHeight,
    minWidth: ATTACHMENT_WINDOW_CONFIG.minWidth,
    minHeight: ATTACHMENT_WINDOW_CONFIG.minHeight,
    backgroundColor: ATTACHMENT_WINDOW_CONFIG.backgroundColor,
    // 本体の裏に回り込まないよう子ウィンドウにする（操作は止めないのでモーダルにはしない）
    parent: parent ?? undefined,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      // ファイルを表示するだけなので preload は渡さない（IPC の口を作らない）
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // PDF を Chromium 内蔵ビューアで表示するために必要
      plugins: true,
    },
  });

  // ファイルを読み込むとタイトルがパスなどに置き換わるため、こちらで決めた文言を残す
  window.on('page-title-updated', (event) => event.preventDefault());
  window.once('ready-to-show', () => window.show());
  window.on('closed', () => {
    previewWindow = null;
  });

  // このアプリは外部と通信しない。PDF 内のリンクなどで外へ出ていかないよう塞ぐ
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event) => event.preventDefault());

  return window;
};

/** 添付ファイルを別ウィンドウで大きく表示する。 */
export const showAttachmentWindow = (
  filePath: string,
  fileName: string,
  parent: BrowserWindow | null,
): void => {
  const title = `${ATTACHMENT_WINDOW_CONFIG.titlePrefix}${fileName}`;

  if (isAlive(previewWindow)) {
    previewWindow.setTitle(title);
    void previewWindow.loadFile(filePath);
    bringToFront(previewWindow);
    return;
  }

  // 新しく作る場合は ready-to-show で表示され、そのとき前面に出る
  const window = createWindow(parent);
  window.setTitle(title);
  void window.loadFile(filePath);
  previewWindow = window;
};
