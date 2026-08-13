import {
  createAccountCategory,
  createPaymentMethod,
  deleteAccountCategory,
  deletePaymentMethod,
  listPresets,
  reorderAccountCategories,
  reorderPaymentMethods,
  updateAccountCategory,
  updatePaymentMethod,
} from '@main/db/repositories/preset-repository';
import { registerHandler, requireNumber, requireNumberArray } from '@main/ipc/handler-utils';
import {
  validateAccountCategoryInput,
  validatePaymentMethodInput,
} from '@main/services/preset-validator';
import { IPC_CHANNELS } from '@shared/ipc-channels';

export const registerPresetHandlers = (): void => {
  registerHandler(IPC_CHANNELS.PRESET_LIST, () => listPresets());

  registerHandler(IPC_CHANNELS.PRESET_ACCOUNT_CATEGORY_CREATE, (_context, args) =>
    createAccountCategory(validateAccountCategoryInput(args[0])),
  );

  registerHandler(IPC_CHANNELS.PRESET_ACCOUNT_CATEGORY_UPDATE, (_context, args) =>
    updateAccountCategory(
      requireNumber(args[0], '勘定科目 ID'),
      validateAccountCategoryInput(args[1]),
    ),
  );

  registerHandler(IPC_CHANNELS.PRESET_ACCOUNT_CATEGORY_DELETE, (_context, args) => {
    deleteAccountCategory(requireNumber(args[0], '勘定科目 ID'));
    return null;
  });

  registerHandler(IPC_CHANNELS.PRESET_ACCOUNT_CATEGORY_REORDER, (_context, args) =>
    reorderAccountCategories(requireNumberArray(args[0], '並び順')),
  );

  registerHandler(IPC_CHANNELS.PRESET_PAYMENT_METHOD_CREATE, (_context, args) =>
    createPaymentMethod(validatePaymentMethodInput(args[0])),
  );

  registerHandler(IPC_CHANNELS.PRESET_PAYMENT_METHOD_UPDATE, (_context, args) =>
    updatePaymentMethod(
      requireNumber(args[0], '支払方法 ID'),
      validatePaymentMethodInput(args[1]),
    ),
  );

  registerHandler(IPC_CHANNELS.PRESET_PAYMENT_METHOD_DELETE, (_context, args) => {
    deletePaymentMethod(requireNumber(args[0], '支払方法 ID'));
    return null;
  });

  registerHandler(IPC_CHANNELS.PRESET_PAYMENT_METHOD_REORDER, (_context, args) =>
    reorderPaymentMethods(requireNumberArray(args[0], '並び順')),
  );
};
