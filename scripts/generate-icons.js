/**
 * ロゴマークから配布用のアイコン画像を作る。
 *
 *   npm run icons
 *
 * 図案の原典は src/renderer/assets/logo-mark.svg（サイドメニューと共用）。
 * アプリアイコンには「キロク」の文字を足したいので、ここで組み合わせる。
 * Chromium に SVG を描画させて PNG を取り出し、Windows 用に ICO へ詰め直す。
 * 外部の画像変換ライブラリを増やさずに済ませるため Electron 上で実行する。
 */
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const ASSETS_DIR = path.join(PROJECT_ROOT, 'assets');
const LOGO_MARK_SVG = path.join(PROJECT_ROOT, 'src', 'renderer', 'assets', 'logo-mark.svg');

/** アイコンにだけ載せるアプリ名。マーク側の座標系（1024 四方）に合わせている。 */
const WORDMARK_ELEMENT = `<text
    x="512" y="946"
    text-anchor="middle"
    font-family="'Yu Gothic UI','Yu Gothic','Meiryo','Hiragino Sans',sans-serif"
    font-size="152" font-weight="700" fill="#FFFFFF" letter-spacing="6">キロク</text>`;

const composeIconSvg = (markSvg) => markSvg.replace('</svg>', `${WORDMARK_ELEMENT}\n</svg>`);

/** ICO に含めるサイズ。Windows がタスクバー・エクスプローラで使い分ける。 */
const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256];
/** ウィンドウアイコン・ストア用に単体で出す PNG のサイズ */
const PNG_SIZES = [256, 512, 1024];

/** PNG を並べて ICO コンテナに詰める（Vista 以降は PNG をそのまま格納できる）。 */
const packIco = (images) => {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);

  const directory = Buffer.alloc(16 * images.length);
  let offset = header.length + directory.length;

  images.forEach((image, index) => {
    const at = index * 16;
    // 256 は 0 で表す決まり
    const dimension = image.size >= 256 ? 0 : image.size;
    directory.writeUInt8(dimension, at);
    directory.writeUInt8(dimension, at + 1);
    directory.writeUInt8(0, at + 2); // パレット数（true color なので 0）
    directory.writeUInt8(0, at + 3); // reserved
    directory.writeUInt16LE(1, at + 4); // color planes
    directory.writeUInt16LE(32, at + 6); // bits per pixel
    directory.writeUInt32LE(image.buffer.length, at + 8);
    directory.writeUInt32LE(offset, at + 12);
    offset += image.buffer.length;
  });

  return Buffer.concat([header, directory, ...images.map((image) => image.buffer)]);
};

const renderSizes = async (window, svgDataUrl, sizes) => {
  const script = `
    (async () => {
      const image = new Image();
      image.src = ${JSON.stringify(svgDataUrl)};
      await image.decode();
      const results = {};
      for (const size of ${JSON.stringify(sizes)}) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d');
        context.clearRect(0, 0, size, size);
        context.drawImage(image, 0, 0, size, size);
        results[size] = canvas.toDataURL('image/png').split(',')[1];
      }
      return results;
    })()
  `;
  const rendered = await window.webContents.executeJavaScript(script, true);
  return Object.entries(rendered).map(([size, base64]) => ({
    size: Number(size),
    buffer: Buffer.from(base64, 'base64'),
  }));
};

app.disableHardwareAcceleration();

app.on('ready', async () => {
  try {
    const svg = composeIconSvg(fs.readFileSync(LOGO_MARK_SVG, 'utf-8'));
    const svgDataUrl = `data:image/svg+xml;base64,${Buffer.from(svg, 'utf-8').toString('base64')}`;

    const window = new BrowserWindow({ show: false, width: 128, height: 128 });
    await window.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent('<!doctype html><meta charset="utf-8"><body style="margin:0"></body>')}`,
    );
    // フォントの読み込みが終わってから描画させる
    await window.webContents.executeJavaScript('document.fonts.ready.then(() => true)', true);

    const allSizes = [...new Set([...ICO_SIZES, ...PNG_SIZES])].sort((a, b) => a - b);
    const images = await renderSizes(window, svgDataUrl, allSizes);
    const bySize = new Map(images.map((image) => [image.size, image]));

    for (const size of PNG_SIZES) {
      const target = path.join(ASSETS_DIR, size === 512 ? 'icon.png' : `icon-${size}.png`);
      fs.writeFileSync(target, bySize.get(size).buffer);
      console.log(`wrote ${path.relative(PROJECT_ROOT, target)}`);
    }

    const icoPath = path.join(ASSETS_DIR, 'icon.ico');
    fs.writeFileSync(icoPath, packIco(ICO_SIZES.map((size) => bySize.get(size))));
    console.log(`wrote ${path.relative(PROJECT_ROOT, icoPath)} (${ICO_SIZES.join(', ')})`);

    app.exit(0);
  } catch (error) {
    console.error(error);
    app.exit(1);
  }
});
