import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { resolveAlias } from './vite.alias.config';

// https://vitejs.dev/config
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: resolveAlias(),
  },
});
