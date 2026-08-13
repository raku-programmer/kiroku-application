import type { KirokuApi } from '@shared/types/api';

declare global {
  interface Window {
    /** preload の contextBridge で公開される API（キー名は BRIDGE_KEY と一致） */
    kiroku: KirokuApi;
  }
}

export {};
