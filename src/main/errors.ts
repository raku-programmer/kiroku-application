import { ERROR_CODES, type ErrorCode } from '@shared/constants/error-codes';
import type { AppError } from '@shared/types/result';

/** アプリ内で明示的に投げる例外。IPC 層で Result に変換される。 */
export class AppException extends Error {
  readonly code: ErrorCode;
  readonly fields?: Record<string, string>;

  constructor(code: ErrorCode, message: string, fields?: Record<string, string>) {
    super(message);
    this.name = 'AppException';
    this.code = code;
    this.fields = fields;
  }

  toAppError(): AppError {
    return { code: this.code, message: this.message, fields: this.fields };
  }
}

export const validationError = (
  message: string,
  fields?: Record<string, string>,
): AppException => new AppException(ERROR_CODES.VALIDATION_FAILED, message, fields);

export const notFoundError = (message: string): AppException =>
  new AppException(ERROR_CODES.NOT_FOUND, message);
