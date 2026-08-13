import { defineConfig } from 'vitest/config';
import { resolveAlias } from './vite.alias.config';

/**
 * shared 層の計算ロジックを対象にしたテスト設定。
 * 金額と期間の計算は Excel 出力と画面表示の両方で使うため、
 * ここが壊れると提出資料の数字がずれる。
 */
export default defineConfig({
  resolve: {
    alias: resolveAlias(),
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
