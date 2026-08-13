import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';

/**
 * バンドルできないため node_modules ごと同梱する必要があるパッケージ。
 * better-sqlite3 はネイティブモジュール、他はその実行時依存。
 * （vite.alias.config.ts の RUNTIME_EXTERNAL_PACKAGES と対応させること）
 */
const RUNTIME_NODE_MODULES = ['better-sqlite3', 'bindings', 'file-uri-to-path'];

/**
 * パッケージに含めるファイルの選別。
 * Vite プラグインの既定は `.vite` 以外をすべて除外するため、
 * ネイティブモジュールが同梱されない。ここで明示的に残す。
 */
const packagerIgnore = (file: string): boolean => {
  if (!file) {
    return false;
  }
  if (file.startsWith('/.vite')) {
    return false;
  }
  if (file === '/node_modules') {
    return false;
  }
  return !RUNTIME_NODE_MODULES.some(
    (name) => file === `/node_modules/${name}` || file.startsWith(`/node_modules/${name}/`),
  );
};

/**
 * アプリアイコン。拡張子なしで渡すと packager が OS ごとに
 * .ico / .icns / .png を補完する。実体は `npm run icons` で生成する。
 */
const ICON_BASE_PATH = 'assets/icon';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    icon: ICON_BASE_PATH,
    ignore: packagerIgnore,
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({ setupIcon: `${ICON_BASE_PATH}.ico` }),
    new MakerZIP({}, ['darwin']),
    new MakerRpm({}),
    new MakerDeb({}),
  ],
  plugins: [
    // better-sqlite3 のネイティブモジュールを asar の外に展開する
    new AutoUnpackNativesPlugin({}),
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
      // If you are familiar with Vite configuration, it will look really familiar.
      build: [
        {
          // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
          // 出力ファイル名はエントリ名から決まる（.vite/build/main.js）。
          // package.json の "main" と一致させること。
          entry: 'src/main/main.ts',
          config: 'vite.main.config.ts',
          target: 'main',
        },
        {
          // 出力は .vite/build/preload.js
          entry: 'src/preload/preload.ts',
          config: 'vite.preload.config.ts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
