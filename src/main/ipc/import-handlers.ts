import { registerHandler } from '@main/ipc/handler-utils';
import { loadSettings } from '@main/db/repositories/setting-repository';
import { AppException } from '@main/errors';
import {
  commitCsvImport,
  downloadCsvTemplate,
  pickAndParseCsv,
} from '@main/services/csv-import-service';
import { ERROR_CODES } from '@shared/constants/error-codes';
import { MAX_CSV_IMPORT_ROWS } from '@shared/constants/csv-import';
import { IPC_CHANNELS } from '@shared/ipc-channels';
import type { CsvImportCommitItem } from '@shared/types/csv-import';

const isCommitItem = (value: unknown): value is CsvImportCommitItem =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as CsvImportCommitItem).rowNumber === 'number' &&
  typeof (value as CsvImportCommitItem).input === 'object';

export const registerImportHandlers = (): void => {
  registerHandler(IPC_CHANNELS.IMPORT_CSV_PARSE, (context) =>
    pickAndParseCsv(context.window, loadSettings().defaultAllocationRate),
  );

  registerHandler(IPC_CHANNELS.IMPORT_CSV_COMMIT, (_context, args) => {
    const items = args[0];
    if (!Array.isArray(items) || !items.every(isCommitItem)) {
      throw new AppException(ERROR_CODES.VALIDATION_FAILED, '取り込み内容の指定が不正です。');
    }
    if (items.length === 0) {
      throw new AppException(ERROR_CODES.VALIDATION_FAILED, '取り込める行がありません。');
    }
    if (items.length > MAX_CSV_IMPORT_ROWS) {
      throw new AppException(ERROR_CODES.VALIDATION_FAILED, '一度に取り込める行数を超えています。');
    }
    return commitCsvImport(items);
  });

  registerHandler(IPC_CHANNELS.IMPORT_CSV_TEMPLATE, (context) =>
    downloadCsvTemplate(context.window),
  );
};
