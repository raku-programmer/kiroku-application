import type { ErrorCode } from '@shared/constants/error-codes';

export interface AppError {
  code: ErrorCode;
  message: string;
  /** 項目単位の検証エラー（フィールド名 -> メッセージ） */
  fields?: Record<string, string>;
}

export type Result<T> = { ok: true; data: T } | { ok: false; error: AppError };

export const ok = <T>(data: T): Result<T> => ({ ok: true, data });

export const fail = <T = never>(error: AppError): Result<T> => ({ ok: false, error });
