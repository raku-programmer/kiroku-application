import { BrowserWindow, dialog } from 'electron';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { getDefaultExportDirectory } from '@main/config/paths';
import { listAccountCategories, listPaymentMethods } from '@main/db/repositories/preset-repository';
import { AppException } from '@main/errors';
import { createExpense } from '@main/services/expense-service';
import { validateExpenseInput } from '@main/services/expense-validator';
import { ERROR_CODES } from '@shared/constants/error-codes';
import {
  CSV_ALLOCATION_DELEGATED_VALUES,
  CSV_IMPORT_COLUMNS,
  CSV_IMPORT_FILE_EXTENSION,
  CSV_IMPORT_HEADER_ROW,
  CSV_IMPORT_SAMPLE_ROW,
  CSV_TEMPLATE_FILE_NAME,
  MAX_CSV_IMPORT_ROWS,
} from '@shared/constants/csv-import';
import {
  NO_ALLOCATION_RATE,
  RATE_SCALE,
  TAX_RATE_OPTIONS,
  TAX_TREATMENTS,
  TAX_TREATMENT_OPTIONS,
} from '@shared/constants/tax';
import type { ExportResult } from '@shared/types/api';
import type {
  CsvImportCommitItem,
  CsvImportCommitResult,
  CsvImportFailure,
  CsvImportPreview,
  CsvImportRow,
} from '@shared/types/csv-import';
import type { ExpenseInput } from '@shared/types/expense';
import { withDelegatedNote } from '@shared/utils/allocation-note';
import { cellAt, isBlankCsvRow, parseCsvRows, stripBom } from '@shared/utils/csv';
import { percentToRate } from '@shared/utils/money';

/** 列の並び順（CSV_IMPORT_COLUMNS のインデックスとそのまま対応する） */
const COL = Object.fromEntries(
  CSV_IMPORT_COLUMNS.map((column, index) => [column.key, index]),
) as Record<(typeof CSV_IMPORT_COLUMNS)[number]['key'], number>;

/**
 * ファイルのバイト列を文字列にする。
 * UTF-8（BOM 有無いずれも）を優先し、UTF-8 として不正な場合は Shift_JIS として読む。
 * Excel で保存した日本語 CSV は既定で Shift_JIS になるため、これがないとほぼ確実に文字化けする。
 */
export const decodeCsvBuffer = (buffer: Buffer): string => {
  try {
    return stripBom(new TextDecoder('utf-8', { fatal: true }).decode(buffer));
  } catch {
    return new TextDecoder('shift_jis').decode(buffer);
  }
};

/** 税区分ラベルを値に変換する。一致しなければ null。 */
const resolveTaxTreatment = (label: string): (typeof TAX_TREATMENT_OPTIONS)[number] | null =>
  TAX_TREATMENT_OPTIONS.find((option) => option.label === label) ?? null;

/**
 * 税率の指定を解決する。
 * 「10%」のような選択肢のラベルに加えて、「10」のような数値だけの表記も受け付ける。
 */
const resolveTaxRate = (label: string): number | null => {
  const byLabel = TAX_RATE_OPTIONS.find((option) => option.label === label);
  if (byLabel) {
    return byLabel.value;
  }
  const percent = Number(label.replace('%', '').trim());
  if (!Number.isFinite(percent)) {
    return null;
  }
  const rate = percentToRate(percent);
  return TAX_RATE_OPTIONS.some((option) => option.value === rate) ? rate : null;
};

interface AllocationResolution {
  /** 解決できなければ NaN（呼び出し側でエラーにする） */
  rate: number;
  /** 「按分なし」を選んだ場合、備考に定型文を足す必要がある */
  delegated: boolean;
}

/** 按分率の指定を解決する。空欄は既定値、「なし」は 100%（按分なし）扱いにする。 */
const resolveAllocationRate = (label: string, defaultRate: number): AllocationResolution => {
  if (label.length === 0) {
    return { rate: defaultRate, delegated: false };
  }
  if (CSV_ALLOCATION_DELEGATED_VALUES.includes(label)) {
    return { rate: NO_ALLOCATION_RATE, delegated: true };
  }
  const percent = Number(label.replace('%', '').trim());
  if (!Number.isFinite(percent)) {
    return { rate: Number.NaN, delegated: false };
  }
  return { rate: Math.min(Math.max(percentToRate(percent), 0), RATE_SCALE), delegated: false };
};

/** 1 データ行を検証済みの ExpenseInput に解決する。失敗した項目はエラー文字列として集める。 */
const resolveRow = (
  row: string[],
  defaultAllocationRate: number,
  categoryByName: Map<string, number>,
  methodByName: Map<string, number>,
): { input: ExpenseInput | null; errors: string[] } => {
  const errors: string[] = [];

  const expenseDate = cellAt(row, COL.expenseDate);
  const accountCategoryName = cellAt(row, COL.accountCategoryName);
  const payeeName = cellAt(row, COL.payeeName);
  const amountText = cellAt(row, COL.amount);
  const taxTreatmentLabel = cellAt(row, COL.taxTreatmentLabel);
  const taxRateLabel = cellAt(row, COL.taxRateLabel);
  const paymentMethodName = cellAt(row, COL.paymentMethodName);
  const allocationRateLabel = cellAt(row, COL.allocationRateLabel);
  const description = cellAt(row, COL.description);
  const note = cellAt(row, COL.note);

  // 勘定科目は未入力を許容する（税理士に判断を委ねたい場合を想定）。
  // 入力されている場合のみ、設定に登録済みの名称と一致するか確認する。
  let accountCategoryId: number | null = null;
  if (accountCategoryName.length > 0) {
    accountCategoryId = categoryByName.get(accountCategoryName) ?? null;
    if (accountCategoryId == null) {
      errors.push(`勘定科目「${accountCategoryName}」が見つかりません。設定の表記と揃えてください。`);
    }
  }

  let paymentMethodId: number | null = null;
  if (paymentMethodName.length > 0) {
    paymentMethodId = methodByName.get(paymentMethodName) ?? null;
    if (paymentMethodId == null) {
      errors.push(`支払方法「${paymentMethodName}」が見つかりません。設定の表記と揃えてください。`);
    }
  }

  const treatmentOption = resolveTaxTreatment(taxTreatmentLabel);
  if (!treatmentOption) {
    errors.push('税区分は「税込」「税抜」「非課税・不課税」のいずれかで入力してください。');
  }
  const isExempt = treatmentOption?.value === TAX_TREATMENTS.EXEMPT;

  let taxRate = 0;
  if (!isExempt) {
    const resolved = resolveTaxRate(taxRateLabel);
    if (resolved == null) {
      errors.push('税率は「10%」「8%（軽減税率）」「0%」のいずれかで入力してください。');
    } else {
      taxRate = resolved;
    }
  }

  const amount = Number(amountText.replace(/[¥,\s]/g, ''));
  const amountValid = Number.isFinite(amount);
  if (!amountValid) {
    errors.push('金額は数値で入力してください。');
  }

  const allocation = resolveAllocationRate(allocationRateLabel, defaultAllocationRate);
  if (Number.isNaN(allocation.rate)) {
    errors.push('按分率は数値、または「なし」で入力してください。');
  }

  // ここまでで解決できなかった項目があれば、この先の検証に進めない
  if (errors.length > 0) {
    return { input: null, errors };
  }

  const resolvedNote = allocation.delegated ? withDelegatedNote(note) : note;

  const candidate: ExpenseInput = {
    expenseDate,
    accountCategoryId,
    payeeName,
    amount: amountValid ? Math.trunc(amount) : Number.NaN,
    taxTreatment: (treatmentOption?.value ?? TAX_TREATMENTS.INCLUSIVE),
    taxRate,
    paymentMethodId,
    allocationRate: allocation.rate,
    allocationDelegated: allocation.delegated,
    description,
    note: resolvedNote,
    attachments: [],
  };

  // 日付・金額の範囲・文字数などの最終確認は既存の検証ロジックをそのまま使う
  try {
    const normalized = validateExpenseInput(candidate);
    return { input: normalized, errors: [] };
  } catch (error) {
    if (error instanceof AppException && error.fields) {
      return { input: null, errors: Object.values(error.fields) };
    }
    return { input: null, errors: [(error as Error).message] };
  }
};

const buildPreview = (fileName: string, text: string, defaultAllocationRate: number): CsvImportPreview => {
  const allRows = parseCsvRows(text).filter((row) => !isBlankCsvRow(row));
  if (allRows.length === 0) {
    throw new AppException(ERROR_CODES.VALIDATION_FAILED, 'CSV に取り込める行がありません。');
  }

  const header = allRows[0].map((cell) => cell.trim());
  const headerMatches =
    header.length === CSV_IMPORT_HEADER_ROW.length &&
    header.every((cell, index) => cell === CSV_IMPORT_HEADER_ROW[index]);
  if (!headerMatches) {
    throw new AppException(
      ERROR_CODES.VALIDATION_FAILED,
      `1行目の見出しが正しくありません。テンプレートをダウンロードしてご利用ください。` +
        `（想定：${CSV_IMPORT_HEADER_ROW.join(', ')}）`,
    );
  }

  const dataRows = allRows.slice(1);
  if (dataRows.length > MAX_CSV_IMPORT_ROWS) {
    throw new AppException(
      ERROR_CODES.VALIDATION_FAILED,
      `一度に取り込める行数は ${MAX_CSV_IMPORT_ROWS} 行までです（${dataRows.length} 行あります）。ファイルを分割してください。`,
    );
  }

  const categoryByName = new Map(listAccountCategories().map((item) => [item.name, item.id]));
  const methodByName = new Map(listPaymentMethods().map((item) => [item.name, item.id]));

  const rows: CsvImportRow[] = dataRows.map((row, dataIndex) => {
    const rowNumber = dataIndex + 2; // 見出し行が 1 行目
    const raw = {
      expenseDate: cellAt(row, COL.expenseDate),
      accountCategoryName: cellAt(row, COL.accountCategoryName),
      payeeName: cellAt(row, COL.payeeName),
      amount: cellAt(row, COL.amount),
      taxTreatmentLabel: cellAt(row, COL.taxTreatmentLabel),
      taxRateLabel: cellAt(row, COL.taxRateLabel),
      paymentMethodName: cellAt(row, COL.paymentMethodName),
      allocationRateLabel: cellAt(row, COL.allocationRateLabel),
      description: cellAt(row, COL.description),
      note: cellAt(row, COL.note),
    };

    if (row.length !== CSV_IMPORT_HEADER_ROW.length) {
      return {
        rowNumber,
        status: 'error',
        errors: [`列の数が正しくありません（${CSV_IMPORT_HEADER_ROW.length} 列である必要があります）。`],
        raw,
        input: null,
      };
    }

    const { input, errors } = resolveRow(row, defaultAllocationRate, categoryByName, methodByName);
    return {
      rowNumber,
      status: errors.length === 0 ? 'ok' : 'error',
      errors,
      raw,
      input,
    };
  });

  return {
    fileName,
    rows,
    okCount: rows.filter((row) => row.status === 'ok').length,
    errorCount: rows.filter((row) => row.status === 'error').length,
  };
};

/** ファイル選択ダイアログを開き、読み込んで検証する。キャンセル時は null。 */
export const pickAndParseCsv = async (
  parentWindow: BrowserWindow | null,
  defaultAllocationRate: number,
): Promise<CsvImportPreview | null> => {
  const options: Electron.OpenDialogOptions = {
    title: 'CSV ファイルを選択',
    properties: ['openFile'],
    filters: [
      { name: 'CSV ファイル', extensions: [CSV_IMPORT_FILE_EXTENSION] },
      { name: 'すべてのファイル', extensions: ['*'] },
    ],
  };
  const result = parentWindow
    ? await dialog.showOpenDialog(parentWindow, options)
    : await dialog.showOpenDialog(options);

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const filePath = result.filePaths[0];
  let buffer: Buffer;
  try {
    buffer = await fsp.readFile(filePath);
  } catch (error) {
    throw new AppException(
      ERROR_CODES.FILE_ERROR,
      `ファイルを読み取れませんでした。${(error as Error).message}`,
    );
  }

  const text = decodeCsvBuffer(buffer);
  return buildPreview(path.basename(filePath), text, defaultAllocationRate);
};

/**
 * 検証済みの行を一括登録する。
 * プレビューから確定までの間に勘定科目が削除される等の可能性があるため、
 * 1 件ずつ既存の createExpense を通し、失敗しても他の行は続行する。
 */
export const commitCsvImport = async (
  items: CsvImportCommitItem[],
): Promise<CsvImportCommitResult> => {
  const failures: CsvImportFailure[] = [];
  let importedCount = 0;

  for (const item of items) {
    try {
      await createExpense(item.input);
      importedCount += 1;
    } catch (error) {
      const message =
        error instanceof AppException ? error.message : (error as Error).message;
      failures.push({ rowNumber: item.rowNumber, message });
    }
  }

  return { importedCount, failedCount: failures.length, failures };
};

/** Excel が UTF-8 と正しく認識できるよう、テンプレート出力にだけ BOM を付ける */
const BOM = '﻿';

const buildTemplateCsvText = (): string => {
  const escape = (value: string): string =>
    /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
  const lines = [CSV_IMPORT_HEADER_ROW, CSV_IMPORT_SAMPLE_ROW].map((row) =>
    row.map(escape).join(','),
  );
  // Excel が UTF-8 と正しく認識できるよう BOM を付ける
  return `${BOM}${lines.join('\r\n')}\r\n`;
};

/** 記入例つきのテンプレート CSV を保存する。 */
export const downloadCsvTemplate = async (
  parentWindow: BrowserWindow | null,
): Promise<ExportResult> => {
  const defaultPath = path.join(getDefaultExportDirectory(), CSV_TEMPLATE_FILE_NAME);
  const options: Electron.SaveDialogOptions = {
    title: 'CSV テンプレートの保存先',
    defaultPath,
    filters: [{ name: 'CSV ファイル', extensions: [CSV_IMPORT_FILE_EXTENSION] }],
  };
  const result = parentWindow
    ? await dialog.showSaveDialog(parentWindow, options)
    : await dialog.showSaveDialog(options);

  if (result.canceled || !result.filePath) {
    return { canceled: true, filePath: null, rowCount: 0 };
  }

  try {
    await fsp.writeFile(result.filePath, buildTemplateCsvText(), 'utf-8');
  } catch (error) {
    throw new AppException(
      ERROR_CODES.FILE_ERROR,
      `テンプレートの書き出しに失敗しました。${(error as Error).message}`,
    );
  }

  return { canceled: false, filePath: result.filePath, rowCount: 1 };
};

