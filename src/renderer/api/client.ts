import { ERROR_CODES } from '@shared/constants/error-codes';
import type { KirokuApi } from '@shared/types/api';
import type { AppError, Result } from '@shared/types/result';

/** preload が公開した API。画面からは必ずこの経由で呼ぶ。 */
export const api: KirokuApi = window.kiroku;

/** main から返された AppError を例外として扱うためのラッパー */
export class ApiError extends Error {
  readonly appError: AppError;

  constructor(appError: AppError) {
    super(appError.message);
    this.name = 'ApiError';
    this.appError = appError;
  }

  get fields(): Record<string, string> | undefined {
    return this.appError.fields;
  }
}

/** Result を展開する。失敗時は ApiError を投げる。 */
export const unwrap = async <T>(promise: Promise<Result<T>>): Promise<T> => {
  const result = await promise;
  if (result.ok) {
    return result.data;
  }
  throw new ApiError(result.error);
};

export const toAppError = (error: unknown): AppError => {
  if (error instanceof ApiError) {
    return error.appError;
  }
  if (error instanceof Error) {
    return { code: ERROR_CODES.UNKNOWN, message: error.message };
  }
  return { code: ERROR_CODES.UNKNOWN, message: String(error) };
};
