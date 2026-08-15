import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@renderer/api/client';
import { ENTRY_MODES, type ExpenseListState, type NavigateFn } from '@renderer/App';
import { LoadingOverlay, OVERLAY_VARIANTS } from '@renderer/components/feedback/LoadingOverlay';
import {
  CopyIcon,
  DownloadIcon,
  EyeIcon,
  PaperclipIcon,
  TrashIcon,
  UploadIcon,
} from '@renderer/components/icons/Icons';
import { ConfirmDialog } from '@renderer/components/modal/ConfirmDialog';
import { Button, BUTTON_SIZES, BUTTON_VARIANTS } from '@renderer/components/ui/Button';
import { Card } from '@renderer/components/ui/Card';
import { LABELS } from '@renderer/constants/labels';
import { SCREEN_IDS } from '@renderer/constants/navigation';
import {
  EXPENSE_LIST_PAGE_SIZE,
  FIRST_PAGE,
  LOADING_SCOPES,
  SEARCH_DEBOUNCE_MS,
} from '@renderer/constants/ui';
import { useAppData } from '@renderer/contexts/AppDataContext';
import { TOAST_TONES, useToast } from '@renderer/contexts/ToastContext';
import { useAsyncAction } from '@renderer/hooks/useAsyncAction';
import { CsvImportDialog } from '@renderer/screens/expense-list/CsvImportDialog';
import { UNCATEGORIZED_LABEL } from '@shared/constants/presets';
import type { YearRange } from '@shared/types/api';
import {
  PERIOD_MODES,
  type Expense,
  type ExpenseFilter,
  type ExpenseListResult,
  type PayeeSuggestion,
} from '@shared/types/expense';
import {
  formatDate,
  formatTaxRate,
  formatTaxTreatment,
  formatYen,
} from '@shared/utils/format';
import { calcAmountBreakdown } from '@shared/utils/money';
import { MONTH_OPTIONS, buildYearOptions, createCurrentPeriod } from '@shared/utils/period';
import './ExpenseListScreen.css';

interface ExpenseListScreenProps {
  /** 照会画面から戻ってきたときの復元値。初期表示・入力/設定を経由した場合は null */
  initialState: ExpenseListState | null;
  onStateChange: (state: ExpenseListState) => void;
  onReady: () => void;
  onNavigate: NavigateFn;
}

/**
 * 一覧の列。見出し・列幅クラス・空行の colSpan をここから導く。
 * ここに載せない項目は経費照会画面で確認する。
 */
const LIST_COLUMNS = [
  { key: 'date', label: LABELS.list.columns.date, numeric: false },
  { key: 'accountCategory', label: LABELS.list.columns.accountCategory, numeric: false },
  { key: 'payee', label: LABELS.list.columns.payee, numeric: false },
  { key: 'amount', label: LABELS.list.columns.amount, numeric: true },
  { key: 'tax', label: LABELS.list.columns.tax, numeric: false },
  { key: 'attachment', label: LABELS.list.columns.attachment, numeric: false },
  { key: 'actions', label: LABELS.list.columns.actions, numeric: false },
] as const;

/**
 * 領収書の添付有無で絞り込むときの選択肢。
 * select の値は文字列しか持てないため、表示値と filter の値をここで対応づける。
 */
const ATTACHMENT_FILTER_OPTIONS = [
  { value: 'any', label: LABELS.list.filterAll, hasAttachment: null },
  { value: 'present', label: LABELS.list.filterAttachmentPresent, hasAttachment: true },
  { value: 'absent', label: LABELS.list.filterAttachmentAbsent, hasAttachment: false },
] as const;

/** filter の値から select に表示する値を引く */
const toAttachmentFilterValue = (hasAttachment: boolean | null): string =>
  ATTACHMENT_FILTER_OPTIONS.find((option) => option.hasAttachment === hasAttachment)?.value ??
  ATTACHMENT_FILTER_OPTIONS[0].value;

const EMPTY_RESULT: ExpenseListResult = {
  expenses: [],
  summary: {
    count: 0,
    totalTaxIncluded: 0,
    totalTaxExcluded: 0,
    totalTax: 0,
    totalAllocated: 0,
    byCategory: [],
  },
};

/**
 * 削除した行を手元の一覧から即座に取り除く。
 * サーバへの問い合わせを待つと消えるまでに間があり、削除できたのか分からないため、
 * 先に画面へ反映してから再取得で辻褄を合わせる。
 */
const removeFromResult = (current: ExpenseListResult, target: Expense): ExpenseListResult => {
  if (!current.expenses.some((expense) => expense.id === target.id)) {
    return current;
  }
  const breakdown = calcAmountBreakdown(target);
  const { summary } = current;

  return {
    expenses: current.expenses.filter((expense) => expense.id !== target.id),
    summary: {
      count: Math.max(summary.count - 1, 0),
      totalTaxIncluded: summary.totalTaxIncluded - breakdown.taxIncluded,
      totalTaxExcluded: summary.totalTaxExcluded - breakdown.taxExcluded,
      totalTax: summary.totalTax - breakdown.taxAmount,
      totalAllocated: summary.totalAllocated - breakdown.allocatedAmount,
      byCategory: summary.byCategory
        .map((category) =>
          category.accountCategoryId === target.accountCategoryId
            ? {
                ...category,
                count: category.count - 1,
                totalAmount: category.totalAmount - breakdown.taxIncluded,
                totalAllocatedAmount:
                  category.totalAllocatedAmount - breakdown.allocatedAmount,
              }
            : category,
        )
        .filter((category) => category.count > 0),
    },
  };
};

export const ExpenseListScreen = ({
  initialState,
  onStateChange,
  onReady,
  onNavigate,
}: ExpenseListScreenProps): JSX.Element => {
  const { settings, accountCategories } = useAppData();
  const { showToast } = useToast();
  const listAction = useAsyncAction();
  const commandAction = useAsyncAction();

  const [filter, setFilter] = useState<ExpenseFilter>(
    () =>
      initialState?.filter ?? {
        period: createCurrentPeriod(settings.defaultPeriodMode),
        accountCategoryId: null,
        payeeId: null,
        keyword: '',
        hasAttachment: null,
      },
  );
  const [page, setPage] = useState(() => initialState?.page ?? FIRST_PAGE);
  // 復元時はキーワードも戻す。戻さないとデバウンスが空文字で filter を上書きしてしまう
  const [keywordInput, setKeywordInput] = useState(() => initialState?.filter.keyword ?? '');
  /** setFilter へ反映済みのキーワード。復元直後にデバウンスを空振りさせるために持つ */
  const appliedKeyword = useRef(filter.keyword);
  const [result, setResult] = useState<ExpenseListResult>(EMPTY_RESULT);
  const [yearRange, setYearRange] = useState<YearRange>({ oldest: null, newest: null });
  const [payees, setPayees] = useState<PayeeSuggestion[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  const readyNotified = useRef(false);

  const yearOptions = useMemo(
    () => buildYearOptions(yearRange.oldest, yearRange.newest),
    [yearRange],
  );

  const loadList = useCallback(
    async (nextFilter: ExpenseFilter) => {
      const loaded = await listAction.run(() => api.expenses.list(nextFilter), {
        scope: LOADING_SCOPES.SECTION,
      });
      if (loaded) {
        setResult(loaded);
      }
      if (!readyNotified.current) {
        readyNotified.current = true;
        onReady();
      }
    },
    [listAction, onReady],
  );

  // 期間・絞り込みが変わるたびに取得し直す
  useEffect(() => {
    void loadList(filter);
    // loadList は毎レンダー再生成されるため依存に含めない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => {
    void Promise.all([api.expenses.yearRange(), api.payees.list()]).then(
      ([rangeResult, payeeResult]) => {
        if (rangeResult.ok) {
          setYearRange(rangeResult.data);
        }
        if (payeeResult.ok) {
          setPayees(payeeResult.data);
        }
      },
    );
  }, []);

  /**
   * 絞り込みとページを親へ預ける。照会画面から戻ったときの復元に使う。
   * アンマウント時にまとめて書き戻すと、入力画面へ移動したときのリセットを
   * 後から上書きしてしまうため、必ず変化のたびに通知する。
   */
  useEffect(() => {
    onStateChange({ filter, page });
  }, [filter, page, onStateChange]);

  /**
   * 絞り込みを変えたら先頭ページへ戻す。
   * setFilter の updater は StrictMode で二重に呼ばれるため、
   * ページ番号の更新はその外側で行う。
   */
  const updateFilter = useCallback((patch: Partial<ExpenseFilter>): void => {
    setFilter((current) => ({ ...current, ...patch }));
    setPage(FIRST_PAGE);
  }, []);

  // キーワードは入力が落ち着いてから反映する
  useEffect(() => {
    const timer = window.setTimeout(() => {
      // 復元直後は入力欄と適用済みの値が一致する。ここで空振りさせて
      // 復元したページ番号を潰さないようにする。
      if (appliedKeyword.current === keywordInput) {
        return;
      }
      appliedKeyword.current = keywordInput;
      updateFilter({ keyword: keywordInput });
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [keywordInput, updateFilter]);

  const totalCount = result.expenses.length;
  const totalPages = Math.max(FIRST_PAGE, Math.ceil(totalCount / EXPENSE_LIST_PAGE_SIZE));
  /** 削除で総ページが減った直後でも空ページを描かないよう、描画は必ずこの値を使う */
  const currentPage = Math.min(page, totalPages);
  const pageStartIndex = (currentPage - FIRST_PAGE) * EXPENSE_LIST_PAGE_SIZE;
  const pageExpenses = useMemo(
    () => result.expenses.slice(pageStartIndex, pageStartIndex + EXPENSE_LIST_PAGE_SIZE),
    [result.expenses, pageStartIndex],
  );

  // 最終ページの最後の 1 件を消したときなど、範囲外になった値を state 側にも反映する
  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const handleDownload = async (): Promise<void> => {
    const exported = await commandAction.run(() => api.exports.excel(filter), {
      scope: LOADING_SCOPES.GLOBAL,
      loadingMessage: LABELS.list.downloading,
    });
    if (!exported) {
      return;
    }
    // 出力先まで伝えたいので、トーストはここで組み立てる
    if (exported.canceled) {
      showToast(TOAST_TONES.INFO, LABELS.list.downloadCanceled);
    } else {
      showToast(TOAST_TONES.SUCCESS, `${LABELS.list.downloaded}（${exported.filePath}）`);
    }
  };

  const handleDelete = async (): Promise<void> => {
    const target = deleteTarget;
    if (!target) {
      return;
    }
    // 確認ダイアログを閉じ、行も先に消してから通信する
    setDeleteTarget(null);
    setResult((current) => removeFromResult(current, target));

    await commandAction.run(() => api.expenses.remove(target.id), {
      scope: LOADING_SCOPES.GLOBAL,
      loadingMessage: LABELS.common.processing,
      successMessage: LABELS.list.deletedMessage,
    });
    // 失敗していれば取得し直した時点で行が戻る
    await loadList(filter);
  };

  const isMonthMode = filter.period.mode === PERIOD_MODES.MONTH;

  return (
    <div className="screen">
      <Card
        title={LABELS.list.title}
        description={LABELS.list.description}
        actions={
          <div className="list-header-actions">
            <Button
              variant={BUTTON_VARIANTS.SECONDARY}
              icon={<UploadIcon width={18} height={18} />}
              onClick={() => setCsvImportOpen(true)}
            >
              {LABELS.list.csvImport}
            </Button>
            <Button
              variant={BUTTON_VARIANTS.PRIMARY}
              icon={<DownloadIcon width={18} height={18} />}
              onClick={() => void handleDownload()}
              loading={commandAction.isBusy}
            >
              {LABELS.list.download}
            </Button>
          </div>
        }
      >
        <div className="list-filters">
          <label className="list-filters__item">
            <span className="list-filters__label">{LABELS.list.periodMode}</span>
            <select
              className="select"
              value={filter.period.mode}
              onChange={(event) => {
                const mode =
                  event.target.value === PERIOD_MODES.YEAR
                    ? PERIOD_MODES.YEAR
                    : PERIOD_MODES.MONTH;
                updateFilter({
                  period: {
                    ...filter.period,
                    mode,
                    month:
                      mode === PERIOD_MODES.MONTH
                        ? (filter.period.month ?? new Date().getMonth() + 1)
                        : null,
                  },
                });
              }}
            >
              <option value={PERIOD_MODES.MONTH}>{LABELS.list.modeMonth}</option>
              <option value={PERIOD_MODES.YEAR}>{LABELS.list.modeYear}</option>
            </select>
          </label>

          <label className="list-filters__item">
            <span className="list-filters__label">{LABELS.list.periodYear}</span>
            <select
              className="select"
              value={filter.period.year}
              onChange={(event) =>
                updateFilter({
                  period: { ...filter.period, year: Number(event.target.value) },
                })
              }
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>

          {isMonthMode && (
            <label className="list-filters__item">
              <span className="list-filters__label">{LABELS.list.periodMonth}</span>
              <select
                className="select"
                value={filter.period.month ?? ''}
                onChange={(event) =>
                  updateFilter({
                    period: { ...filter.period, month: Number(event.target.value) },
                  })
                }
              >
                {MONTH_OPTIONS.map((month) => (
                  <option key={month} value={month}>
                    {month}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="list-filters__item">
            <span className="list-filters__label">{LABELS.list.filterCategory}</span>
            <select
              className="select"
              value={filter.accountCategoryId ?? ''}
              onChange={(event) =>
                updateFilter({
                  accountCategoryId:
                    event.target.value === '' ? null : Number(event.target.value),
                })
              }
            >
              <option value="">{LABELS.list.filterAll}</option>
              {accountCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label className="list-filters__item">
            <span className="list-filters__label">{LABELS.list.filterPayee}</span>
            <select
              className="select"
              value={filter.payeeId ?? ''}
              onChange={(event) =>
                updateFilter({
                  payeeId: event.target.value === '' ? null : Number(event.target.value),
                })
              }
            >
              <option value="">{LABELS.list.filterAll}</option>
              {payees.map((payee) => (
                <option key={payee.id} value={payee.id}>
                  {payee.name}
                </option>
              ))}
            </select>
          </label>

          <label className="list-filters__item">
            <span className="list-filters__label">{LABELS.list.filterAttachment}</span>
            <select
              className="select"
              value={toAttachmentFilterValue(filter.hasAttachment)}
              onChange={(event) =>
                updateFilter({
                  hasAttachment:
                    ATTACHMENT_FILTER_OPTIONS.find(
                      (option) => option.value === event.target.value,
                    )?.hasAttachment ?? null,
                })
              }
            >
              {ATTACHMENT_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="list-filters__item list-filters__item--grow">
            <span className="list-filters__label">{LABELS.list.filterKeyword}</span>
            <input
              type="search"
              className="input"
              value={keywordInput}
              placeholder={LABELS.list.filterKeywordPlaceholder}
              onChange={(event) => setKeywordInput(event.target.value)}
            />
          </label>
        </div>
      </Card>

      <Card relative>
        <div className="list-summary">
          <div className="list-summary__item">
            <span className="list-summary__label">{LABELS.list.count}</span>
            <span className="list-summary__value numeric">{result.summary.count}</span>
          </div>
          <div className="list-summary__item">
            <span className="list-summary__label">{LABELS.list.totalTaxIncluded}</span>
            <span className="list-summary__value numeric">
              {formatYen(result.summary.totalTaxIncluded)}
            </span>
          </div>
          <div className="list-summary__item">
            <span className="list-summary__label">{LABELS.list.totalTaxExcluded}</span>
            <span className="list-summary__value numeric">
              {formatYen(result.summary.totalTaxExcluded)}
            </span>
          </div>
          <div className="list-summary__item">
            <span className="list-summary__label">{LABELS.list.totalTax}</span>
            <span className="list-summary__value numeric">
              {formatYen(result.summary.totalTax)}
            </span>
          </div>
          <div className="list-summary__item list-summary__item--highlight">
            <span className="list-summary__label">{LABELS.list.totalAllocated}</span>
            <span className="list-summary__value numeric">
              {formatYen(result.summary.totalAllocated)}
            </span>
          </div>
        </div>

        <div className="list-table__wrapper">
          <table className="list-table">
            <colgroup>
              {LIST_COLUMNS.map((column) => (
                <col key={column.key} className={`list-table__col--${column.key}`} />
              ))}
            </colgroup>
            <thead>
              <tr>
                {LIST_COLUMNS.map((column) => (
                  <th key={column.key} className={column.numeric ? 'numeric' : undefined}>
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageExpenses.length === 0 && !listAction.isSpinning && (
                <tr>
                  <td className="list-table__empty" colSpan={LIST_COLUMNS.length}>
                    {LABELS.list.empty}
                  </td>
                </tr>
              )}
              {pageExpenses.map((expense) => {
                const categoryName = expense.accountCategoryName ?? UNCATEGORIZED_LABEL;
                const attachmentCount = expense.attachments.length;
                return (
                  <tr key={expense.id}>
                    <td>{formatDate(expense.expenseDate)}</td>
                    {/* 幅に収まらない場合は「…」で切れるため、全文はツールチップで補う */}
                    <td title={categoryName}>{categoryName}</td>
                    <td title={expense.payeeName}>{expense.payeeName}</td>
                    <td className="numeric">
                      {formatYen(calcAmountBreakdown(expense).taxIncluded)}
                    </td>
                    <td>
                      {formatTaxTreatment(expense.taxTreatment)} /{' '}
                      {formatTaxRate(expense.taxTreatment, expense.taxRate)}
                    </td>
                    <td>
                      {attachmentCount > 0 ? (
                        <span className="list-table__attachment">
                          <PaperclipIcon width={14} height={14} />
                          {LABELS.list.attachmentPresent.replace(
                            '{count}',
                            String(attachmentCount),
                          )}
                        </span>
                      ) : (
                        <span className="list-table__attachment list-table__attachment--none">
                          {LABELS.list.attachmentAbsent}
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="list-table__actions">
                        <Button
                          variant={BUTTON_VARIANTS.GHOST}
                          size={BUTTON_SIZES.SMALL}
                          icon={<EyeIcon width={16} height={16} />}
                          onClick={() =>
                            onNavigate(SCREEN_IDS.DETAIL, { expenseId: expense.id })
                          }
                          title={LABELS.common.detail}
                          aria-label={LABELS.common.detail}
                        />
                        <Button
                          variant={BUTTON_VARIANTS.GHOST}
                          size={BUTTON_SIZES.SMALL}
                          icon={<CopyIcon width={16} height={16} />}
                          onClick={() =>
                            onNavigate(SCREEN_IDS.ENTRY, {
                              mode: ENTRY_MODES.DUPLICATE,
                              expenseId: expense.id,
                            })
                          }
                          title={LABELS.common.duplicate}
                          aria-label={LABELS.common.duplicate}
                        />
                        <Button
                          variant={BUTTON_VARIANTS.GHOST}
                          size={BUTTON_SIZES.SMALL}
                          icon={<TrashIcon width={16} height={16} />}
                          onClick={() => setDeleteTarget(expense)}
                          title={LABELS.common.delete}
                          aria-label={LABELS.common.delete}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalCount > 0 && (
          <nav className="list-pager" aria-label={LABELS.list.pagination.label}>
            <span className="list-pager__status">
              {LABELS.list.pagination.status
                .replace('{total}', String(totalCount))
                .replace('{start}', String(pageStartIndex + 1))
                .replace('{end}', String(pageStartIndex + pageExpenses.length))}
            </span>
            <div className="list-pager__controls">
              <Button
                variant={BUTTON_VARIANTS.GHOST}
                size={BUTTON_SIZES.SMALL}
                onClick={() => setPage(currentPage - 1)}
                disabled={currentPage <= FIRST_PAGE}
              >
                {LABELS.common.previous}
              </Button>
              <span className="list-pager__page">
                {LABELS.list.pagination.page
                  .replace('{current}', String(currentPage))
                  .replace('{total}', String(totalPages))}
              </span>
              <Button
                variant={BUTTON_VARIANTS.GHOST}
                size={BUTTON_SIZES.SMALL}
                onClick={() => setPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
              >
                {LABELS.common.next}
              </Button>
            </div>
          </nav>
        )}

        {result.summary.byCategory.length > 0 && (
          <div className="list-breakdown">
            <h3 className="list-breakdown__title">{LABELS.list.categoryBreakdown}</h3>
            <ul className="list-breakdown__list">
              {result.summary.byCategory.map((category) => (
                <li className="list-breakdown__item" key={category.accountCategoryId}>
                  <span className="list-breakdown__name">{category.accountCategoryName}</span>
                  <span className="list-breakdown__count numeric">{category.count}</span>
                  <span className="list-breakdown__amount numeric">
                    {formatYen(category.totalAllocatedAmount)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <LoadingOverlay visible={listAction.isSpinning} variant={OVERLAY_VARIANTS.SECTION} />
      </Card>

      <CsvImportDialog
        open={csvImportOpen}
        onClose={() => setCsvImportOpen(false)}
        onImported={() => {
          // 件数が大きく変わるので先頭ページから見せる
          setPage(FIRST_PAGE);
          void loadList(filter);
        }}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title={LABELS.list.deleteConfirmTitle}
        body={LABELS.list.deleteConfirmBody}
        confirmLabel={LABELS.common.delete}
        danger
        busy={commandAction.isBusy}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
