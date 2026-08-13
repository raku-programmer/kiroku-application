import { DESCRIPTION_SUGGEST_LIMIT, PAYEE_SUGGEST_LIMIT } from '@main/config/app-config';
import { getYearRange } from '@main/db/repositories/expense-repository';
import {
  listDescriptionsByPayee,
  listPayees,
  suggestPayees,
} from '@main/db/repositories/payee-repository';
import {
  arg,
  registerHandler,
  requireNumber,
  type HandlerContext,
} from '@main/ipc/handler-utils';
import {
  createExpense,
  getExpense,
  getExpenseList,
  modifyExpense,
  removeExpense,
} from '@main/services/expense-service';
import { normalizeExpenseFilter } from '@main/services/filter-validator';
import { IPC_CHANNELS } from '@shared/ipc-channels';
import type { ExpenseInput } from '@shared/types/expense';

export const registerExpenseHandlers = (): void => {
  registerHandler(IPC_CHANNELS.EXPENSE_LIST, (_context: HandlerContext, args) =>
    getExpenseList(normalizeExpenseFilter(args[0])),
  );

  registerHandler(IPC_CHANNELS.EXPENSE_GET, (_context, args) =>
    getExpense(requireNumber(args[0], '経費 ID')),
  );

  registerHandler(IPC_CHANNELS.EXPENSE_CREATE, (_context, args) =>
    createExpense(arg<ExpenseInput>(args, 0)),
  );

  registerHandler(IPC_CHANNELS.EXPENSE_UPDATE, (_context, args) =>
    modifyExpense(requireNumber(args[0], '経費 ID'), arg<ExpenseInput>(args, 1)),
  );

  registerHandler(IPC_CHANNELS.EXPENSE_DELETE, async (_context, args) => {
    await removeExpense(requireNumber(args[0], '経費 ID'));
    return null;
  });

  registerHandler(IPC_CHANNELS.EXPENSE_YEAR_RANGE, () => getYearRange());

  registerHandler(IPC_CHANNELS.PAYEE_SUGGEST, (_context, args) =>
    suggestPayees(typeof args[0] === 'string' ? args[0] : '', PAYEE_SUGGEST_LIMIT),
  );

  registerHandler(IPC_CHANNELS.PAYEE_LIST, () => listPayees());

  registerHandler(IPC_CHANNELS.PAYEE_DESCRIPTIONS, (_context, args) =>
    listDescriptionsByPayee(requireNumber(args[0], '請求元 ID'), DESCRIPTION_SUGGEST_LIMIT),
  );
};
