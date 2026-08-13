import { registerHandler } from '@main/ipc/handler-utils';
import {
  chooseDirectory,
  getSettings,
  getStorageLocations,
  updateSettings,
} from '@main/services/settings-service';
import { IPC_CHANNELS } from '@shared/ipc-channels';

export const registerSettingHandlers = (): void => {
  registerHandler(IPC_CHANNELS.SETTING_GET, () => getSettings());

  registerHandler(IPC_CHANNELS.SETTING_UPDATE, (_context, args) => updateSettings(args[0]));

  registerHandler(IPC_CHANNELS.SETTING_CHOOSE_DIRECTORY, (context, args) =>
    chooseDirectory(context.window, typeof args[0] === 'string' ? args[0] : null),
  );

  registerHandler(IPC_CHANNELS.SETTING_STORAGE_LOCATIONS, () => getStorageLocations());
};
