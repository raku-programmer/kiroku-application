import { BrowserWindow, dialog } from 'electron';
import ExcelJS from 'exceljs';
import path from 'node:path';
import { APP_NAME } from '@main/config/app-config';
import { getDefaultExportDirectory } from '@main/config/paths';
import { loadSettings } from '@main/db/repositories/setting-repository';
import { AppException } from '@main/errors';
import { getExpenseList } from '@main/services/expense-service';
import { ERROR_CODES } from '@shared/constants/error-codes';
import {
  EXPENSE_EXPORT_COLUMNS,
  EXPORT_FILE_EXTENSION,
  EXPORT_SHEET_NAME_TEMPLATE,
  TOTAL_ROW_LABEL,
  TOTAL_ROW_LABEL_KEY,
  type ExpenseExportRow,
} from '@shared/constants/export-columns';
import { EXPORT_FILENAME_PLACEHOLDERS } from '@shared/constants/setting-keys';
import type { ExportResult } from '@shared/types/api';
import type { ExpenseFilter } from '@shared/types/expense';
import { toExportRow } from '@shared/utils/export-row';
import { formatPeriodLabel, formatPeriodSlug, toTimestampString } from '@shared/utils/period';

/** ヘッダ行と合計行の見た目 */
const SHEET_STYLE = {
  headerFillColor: 'FF1F6F43',
  headerFontColor: 'FFFFFFFF',
  totalFillColor: 'FFE8F2EA',
  borderColor: 'FFBFD8C6',
  headerRowHeight: 22,
  titleRowHeight: 26,
  titleFontSize: 14,
} as const;

/** シート名に使えない文字 */
const INVALID_SHEET_NAME_CHARS = /[\\/*?:[\]]/g;
const MAX_SHEET_NAME_LENGTH = 31;

const buildSheetName = (periodSlug: string): string =>
  EXPORT_SHEET_NAME_TEMPLATE.replace(EXPORT_FILENAME_PLACEHOLDERS.PERIOD, periodSlug)
    .replace(INVALID_SHEET_NAME_CHARS, '_')
    .slice(0, MAX_SHEET_NAME_LENGTH);

/** ファイル名テンプレートのプレースホルダを解決する */
const buildFileName = (template: string, periodSlug: string): string => {
  const resolved = template
    .replaceAll(EXPORT_FILENAME_PLACEHOLDERS.PERIOD, periodSlug)
    .replaceAll(EXPORT_FILENAME_PLACEHOLDERS.TODAY, toTimestampString().split('-')[0])
    .replaceAll(EXPORT_FILENAME_PLACEHOLDERS.APP, APP_NAME)
    .replace(/[\\/:*?"<>|]/g, '_')
    .trim();
  const safeName = resolved.length > 0 ? resolved : APP_NAME;
  return `${safeName}.${EXPORT_FILE_EXTENSION}`;
};

const applyBorder = (cell: ExcelJS.Cell): void => {
  const style: Partial<ExcelJS.Border> = {
    style: 'thin',
    color: { argb: SHEET_STYLE.borderColor },
  };
  cell.border = { top: style, left: style, bottom: style, right: style };
};

const buildWorkbook = (
  rows: ExpenseExportRow[],
  periodLabel: string,
  periodSlug: string,
): ExcelJS.Workbook => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = APP_NAME;
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(buildSheetName(periodSlug), {
    views: [{ state: 'frozen', ySplit: 2 }],
  });

  sheet.columns = EXPENSE_EXPORT_COLUMNS.map((column) => ({
    key: column.key,
    width: column.width,
  }));

  // 1 行目：対象期間のタイトル
  const titleRow = sheet.addRow([]);
  titleRow.height = SHEET_STYLE.titleRowHeight;
  const titleCell = titleRow.getCell(1);
  titleCell.value = `${periodLabel} 経費明細`;
  titleCell.font = { bold: true, size: SHEET_STYLE.titleFontSize };
  sheet.mergeCells(titleRow.number, 1, titleRow.number, EXPENSE_EXPORT_COLUMNS.length);

  // 2 行目：見出し
  const headerRow = sheet.addRow(
    EXPENSE_EXPORT_COLUMNS.map((column) => column.header),
  );
  headerRow.height = SHEET_STYLE.headerRowHeight;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: SHEET_STYLE.headerFontColor } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: SHEET_STYLE.headerFillColor },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    applyBorder(cell);
  });

  for (const row of rows) {
    const dataRow = sheet.addRow(row as unknown as Record<string, unknown>);
    EXPENSE_EXPORT_COLUMNS.forEach((column, index) => {
      const cell = dataRow.getCell(index + 1);
      if (column.numFmt) {
        cell.numFmt = column.numFmt;
      }
      if (column.alignment) {
        cell.alignment = { vertical: 'middle', horizontal: column.alignment };
      }
      applyBorder(cell);
    });
  }

  // 合計行
  const totalValues: Record<string, string | number> = {
    [TOTAL_ROW_LABEL_KEY]: TOTAL_ROW_LABEL,
  };
  for (const column of EXPENSE_EXPORT_COLUMNS) {
    if (!column.totalize) {
      continue;
    }
    totalValues[column.key] = rows.reduce((sum, row) => {
      const value = row[column.key];
      return typeof value === 'number' ? sum + value : sum;
    }, 0);
  }
  const totalRow = sheet.addRow(totalValues);
  EXPENSE_EXPORT_COLUMNS.forEach((column, index) => {
    const cell = totalRow.getCell(index + 1);
    cell.font = { bold: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: SHEET_STYLE.totalFillColor },
    };
    if (column.numFmt) {
      cell.numFmt = column.numFmt;
    }
    if (column.alignment) {
      cell.alignment = { vertical: 'middle', horizontal: column.alignment };
    }
    applyBorder(cell);
  });

  sheet.autoFilter = {
    from: { row: headerRow.number, column: 1 },
    to: { row: headerRow.number, column: EXPENSE_EXPORT_COLUMNS.length },
  };

  return workbook;
};

/**
 * 一覧画面の条件に一致する経費を Excel に出力する。
 * 保存先はダイアログで確認し、キャンセル時は canceled: true を返す。
 */
export const exportExpensesToExcel = async (
  parentWindow: BrowserWindow | null,
  filter: ExpenseFilter,
): Promise<ExportResult> => {
  const { expenses } = getExpenseList(filter);
  const settings = loadSettings();
  const periodSlug = formatPeriodSlug(filter.period);
  const defaultDirectory = settings.exportDirectory ?? getDefaultExportDirectory();
  const defaultPath = path.join(
    defaultDirectory,
    buildFileName(settings.exportFileNameTemplate, periodSlug),
  );

  const options: Electron.SaveDialogOptions = {
    title: 'Excel ファイルの保存先',
    defaultPath,
    filters: [{ name: 'Excel ブック', extensions: [EXPORT_FILE_EXTENSION] }],
  };
  const result = parentWindow
    ? await dialog.showSaveDialog(parentWindow, options)
    : await dialog.showSaveDialog(options);

  if (result.canceled || !result.filePath) {
    return { canceled: true, filePath: null, rowCount: 0 };
  }

  const workbook = buildWorkbook(
    expenses.map(toExportRow),
    formatPeriodLabel(filter.period),
    periodSlug,
  );

  try {
    await workbook.xlsx.writeFile(result.filePath);
  } catch (error) {
    throw new AppException(
      ERROR_CODES.EXPORT_FAILED,
      `Excel の書き出しに失敗しました。${(error as Error).message}`,
    );
  }

  return { canceled: false, filePath: result.filePath, rowCount: expenses.length };
};
