import { BrowserWindow, ipcMain, type IpcMainInvokeEvent } from 'electron';
import { AppException } from '@main/errors';
import { ERROR_CODES } from '@shared/constants/error-codes';
import type { IpcChannel } from '@shared/ipc-channels';
import { fail, ok, type AppError, type Result } from '@shared/types/result';

const toAppError = (error: unknown): AppError => {
  if (error instanceof AppException) {
    return error.toAppError();
  }
  if (error instanceof Error) {
    return { code: ERROR_CODES.UNKNOWN, message: error.message };
  }
  return { code: ERROR_CODES.UNKNOWN, message: '予期しないエラーが発生しました。' };
};

export type HandlerContext = {
  event: IpcMainInvokeEvent;
  /** 呼び出し元のウィンドウ（ダイアログの親に使う） */
  window: BrowserWindow | null;
};

/**
 * ipcMain.handle の共通ラッパー。
 * 例外を Result に変換し、renderer には常に同じ形で返す。
 */
export const registerHandler = <T>(
  channel: IpcChannel,
  handler: (context: HandlerContext, args: unknown[]) => Promise<T> | T,
): void => {
  ipcMain.handle(channel, async (event, ...args): Promise<Result<T>> => {
    try {
      const context: HandlerContext = {
        event,
        window: BrowserWindow.fromWebContents(event.sender),
      };
      return ok(await handler(context, args));
    } catch (error) {
      const appError = toAppError(error);
      if (appError.code === ERROR_CODES.UNKNOWN) {
        console.error(`[ipc] ${channel} failed`, error);
      }
      return fail<T>(appError);
    }
  });
};

/** IPC 引数を型付きで取り出す（値の妥当性は各サービスで検証する）。 */
export const arg = <T>(args: unknown[], index: number): T => args[index] as T;

export const requireNumber = (value: unknown, label: string): number => {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new AppException(
      ERROR_CODES.VALIDATION_FAILED,
      `${label}の指定が不正です。`,
    );
  }
  return value;
};

export const requireString = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || value.length === 0) {
    throw new AppException(
      ERROR_CODES.VALIDATION_FAILED,
      `${label}の指定が不正です。`,
    );
  }
  return value;
};

export const requireNumberArray = (value: unknown, label: string): number[] => {
  if (!Array.isArray(value) || value.some((item) => !Number.isInteger(item))) {
    throw new AppException(
      ERROR_CODES.VALIDATION_FAILED,
      `${label}の指定が不正です。`,
    );
  }
  return value as number[];
};

export const requireStringArray = (value: unknown, label: string): string[] => {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new AppException(
      ERROR_CODES.VALIDATION_FAILED,
      `${label}の指定が不正です。`,
    );
  }
  return value as string[];
};
