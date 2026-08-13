import { defineConfig } from 'vite';
import { nodeExternals, resolveAlias } from './vite.alias.config';

// https://vitejs.dev/config
export default defineConfig({
  resolve: {
    alias: resolveAlias(),
  },
  build: {
    rollupOptions: {
      external: nodeExternals(),
    },
  },
});
