import { builtinModules } from 'node:module';
import path from 'node:path';

/**
 * 3 つの Vite ビルド（main / preload / renderer）で共有する設定値。
 * パスやモジュール名を各設定ファイルに直接書かず、ここへ集約する。
 */

const SOURCE_ROOT = path.resolve(__dirname, 'src');

/** tsconfig.json の compilerOptions.paths と対応させること。 */
const ALIAS_ENTRIES: ReadonlyArray<readonly [string, string]> = [
  ['@shared', 'shared'],
  ['@main', 'main'],
  ['@preload', 'preload'],
  ['@renderer', 'renderer'],
];

export const resolveAlias = (): Record<string, string> =>
  Object.fromEntries(
    ALIAS_ENTRIES.map(([alias, directory]) => [alias, path.join(SOURCE_ROOT, directory)]),
  );

/**
 * バンドルせず実行時に require させるモジュール。
 * ネイティブモジュール（.node）は Vite でバンドルできないためここに列挙し、
 * forge.config.ts の RUNTIME_NODE_MODULES でパッケージにも同梱する。
 */
const RUNTIME_EXTERNAL_PACKAGES = ['electron', 'better-sqlite3'] as const;

export const nodeExternals = (): string[] => [
  ...RUNTIME_EXTERNAL_PACKAGES,
  ...builtinModules,
  ...builtinModules.map((name) => `node:${name}`),
];
