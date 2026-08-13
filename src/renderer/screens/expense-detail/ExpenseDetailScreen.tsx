import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@renderer/api/client';
import {
  ENTRY_MODES,
  type ExpenseListState,
  type NavigateFn,
} from '@renderer/App';
import { LoadingOverlay, OVERLAY_VARIANTS } from '@renderer/components/feedback/LoadingOverlay';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  TrashIcon,
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
} from '@renderer/constants/ui';
import { useAsyncAction } from '@renderer/hooks/useAsyncAction';
import { ExpenseForm } from '@renderer/screens/expense-entry/ExpenseForm';
import { fetchExpense, useExpenseForm } from '@renderer/screens/expense-entry/useExpenseForm';
import type { Expense } from '@shared/types/expense';
import { formatDateTime } from '@shared/utils/format';
import './ExpenseDetailScreen.css';

interface ExpenseDetailScreenProps {
  expenseId: number | null;
  /**
   * 一覧の絞り込みとページ。前後の領収書をたどる順序に使う。
   * 一覧を経由していない場合は null で、そのときは前後移動を出さない。
   */
  listState: ExpenseListState | null;
  onListStateChange: (state: ExpenseListState) => void;
  onReady: () => void;
  onNavigate: NavigateFn;
}

/**
 * 経費照会画面。
 * 入力画面と同じフォームをそのまま出し、この画面で修正・削除まで完結させる。
 * 一覧の並び順で前後の領収書へ移動できるので、CSV 取り込み後に
 * 画像を順番に付けていく作業がこの画面だけで済む。
 */
export const ExpenseDetailScreen = ({
  expenseId,
  listState,
  onListStateChange,
  onReady,
  onNavigate,
}: ExpenseDetailScreenProps): JSX.Element => {
  const loadAction = useAsyncAction();
  const commandAction = useAsyncAction();
  const formState = useExpenseForm();
  const { loadFromExpense, toInput } = formState;

  const [expense, setExpense] = useState<Expense | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  /** 未保存のまま移動しようとしたときの行き先。確認してから移動する */
  const [pendingMoveId, setPendingMoveId] = useState<number | null>(null);
  /** 絞り込み結果の並び。前後移動の順序になる */
  const [siblingIds, setSiblingIds] = useState<number[]>([]);
  /** 読み込み直後の内容。変更の有無を判定する基準にする */
  const baseline = useRef<string | null>(null);

  useEffect(() => {
    let canceled = false;
    const load = async (): Promise<void> => {
      if (expenseId != null) {
        try {
          const loaded = await fetchExpense(expenseId);
          if (!canceled) {
            setExpense(loaded);
            loadFromExpense(loaded, true);
          }
        } catch {
          // 見つからない場合は「対象なし」の表示にする
        }
      }
      if (!canceled) {
        onReady();
      }
    };
    void load();
    return () => {
      canceled = true;
    };
    // 対象が変わったときだけ読み直す
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenseId]);

  // 読み込んだ内容を変更判定の基準として控える
  useEffect(() => {
    if (expense && baseline.current === null) {
      baseline.current = JSON.stringify(toInput());
    }
  }, [expense, toInput]);

  // 前後移動のために、同じ絞り込みでの並び順を取っておく
  useEffect(() => {
    if (!listState) {
      return undefined;
    }
    let canceled = false;
    void api.expenses.list(listState.filter).then((result) => {
      if (!canceled && result.ok) {
        setSiblingIds(result.data.expenses.map((item) => item.id));
      }
    });
    return () => {
      canceled = true;
    };
  }, [listState]);

  const currentIndex = expenseId == null ? -1 : siblingIds.indexOf(expenseId);
  const previousId = currentIndex > 0 ? siblingIds[currentIndex - 1] : null;
  const nextId =
    currentIndex >= 0 && currentIndex < siblingIds.length - 1
      ? siblingIds[currentIndex + 1]
      : null;

  const isDirty = useMemo(
    () => baseline.current !== null && JSON.stringify(toInput()) !== baseline.current,
    [toInput],
  );

  /** 移動先の経費が一覧のどのページにいるかを親へ伝えてから遷移する */
  const moveTo = useCallback(
    (targetId: number) => {
      const index = siblingIds.indexOf(targetId);
      if (listState && index >= 0) {
        onListStateChange({
          filter: listState.filter,
          page: Math.floor(index / EXPENSE_LIST_PAGE_SIZE) + FIRST_PAGE,
        });
      }
      onNavigate(SCREEN_IDS.DETAIL, { expenseId: targetId });
    },
    [listState, onListStateChange, onNavigate, siblingIds],
  );

  /** 未保存の変更があれば確認を挟む */
  const requestMove = (targetId: number | null): void => {
    if (targetId == null) {
      return;
    }
    if (isDirty) {
      setPendingMoveId(targetId);
      return;
    }
    moveTo(targetId);
  };

  const handleUpdate = async (): Promise<void> => {
    if (!expense) {
      return;
    }
    setFieldErrors({});
    const updated = await commandAction.run(
      () => api.expenses.update(expense.id, toInput()),
      {
        scope: LOADING_SCOPES.GLOBAL,
        loadingMessage: LABELS.common.processing,
        successMessage: LABELS.entry.updatedMessage,
        onError: (error) => setFieldErrors(error.fields ?? {}),
      },
    );
    if (!updated) {
      return;
    }
    // 保存できたので、この内容を新しい基準にする（続けて前後へ移動できる）
    setExpense(updated);
    loadFromExpense(updated, true);
    baseline.current = null;
  };

  const handleDelete = async (): Promise<void> => {
    if (!expense) {
      return;
    }
    setConfirmingDelete(false);
    const removed = await commandAction.run(() => api.expenses.remove(expense.id), {
      scope: LOADING_SCOPES.GLOBAL,
      loadingMessage: LABELS.common.processing,
      successMessage: LABELS.list.deletedMessage,
    });
    if (removed !== null) {
      onNavigate(SCREEN_IDS.LIST);
    }
  };

  if (!expense) {
    return (
      <div className="screen">
        <Card title={LABELS.detail.title} relative>
          <p className="detail-empty">{LABELS.detail.notFound}</p>
          <div className="detail-actions">
            <Button
              variant={BUTTON_VARIANTS.SECONDARY}
              onClick={() => onNavigate(SCREEN_IDS.LIST)}
            >
              {LABELS.detail.backToList}
            </Button>
          </div>
          <LoadingOverlay visible={loadAction.isSpinning} variant={OVERLAY_VARIANTS.SECTION} />
        </Card>
      </div>
    );
  }

  const hasSiblings = siblingIds.length > 0 && currentIndex >= 0;

  return (
    <div className="screen">
      <Card
        title={LABELS.detail.title}
        description={LABELS.detail.description}
        relative
        actions={
          hasSiblings ? (
            <div className="detail-stepper">
              <Button
                variant={BUTTON_VARIANTS.SECONDARY}
                size={BUTTON_SIZES.SMALL}
                icon={<ChevronLeftIcon width={16} height={16} />}
                onClick={() => requestMove(previousId)}
                disabled={previousId == null}
              >
                {LABELS.detail.previousReceipt}
              </Button>
              <span className="detail-stepper__position">
                {LABELS.detail.position
                  .replace('{current}', String(currentIndex + 1))
                  .replace('{total}', String(siblingIds.length))}
              </span>
              <Button
                variant={BUTTON_VARIANTS.SECONDARY}
                size={BUTTON_SIZES.SMALL}
                icon={<ChevronRightIcon width={16} height={16} />}
                onClick={() => requestMove(nextId)}
                disabled={nextId == null}
              >
                {LABELS.detail.nextReceipt}
              </Button>
            </div>
          ) : undefined
        }
      >
        <ExpenseForm
          formState={formState}
          fieldErrors={fieldErrors}
          busy={commandAction.isBusy}
          onSubmit={() => void handleUpdate()}
          actions={
            <>
              <Button
                variant={BUTTON_VARIANTS.GHOST}
                onClick={() => onNavigate(SCREEN_IDS.LIST)}
                disabled={commandAction.isBusy}
              >
                {LABELS.detail.backToList}
              </Button>
              <Button
                variant={BUTTON_VARIANTS.SECONDARY}
                icon={<CopyIcon width={16} height={16} />}
                onClick={() =>
                  onNavigate(SCREEN_IDS.ENTRY, {
                    mode: ENTRY_MODES.DUPLICATE,
                    expenseId: expense.id,
                  })
                }
                disabled={commandAction.isBusy}
              >
                {LABELS.common.duplicate}
              </Button>
              <Button type="submit" variant={BUTTON_VARIANTS.PRIMARY} loading={commandAction.isBusy}>
                {LABELS.common.update}
              </Button>
              <Button
                variant={BUTTON_VARIANTS.DANGER}
                icon={<TrashIcon width={16} height={16} />}
                onClick={() => setConfirmingDelete(true)}
                disabled={commandAction.isBusy}
              >
                {LABELS.common.delete}
              </Button>
            </>
          }
        />

        <p className="detail-timestamps">
          {`${LABELS.detail.createdAt}：${formatDateTime(expense.createdAt)}`}
          {' / '}
          {`${LABELS.detail.updatedAt}：${formatDateTime(expense.updatedAt)}`}
        </p>

        <LoadingOverlay visible={loadAction.isSpinning} variant={OVERLAY_VARIANTS.SECTION} />
      </Card>

      <ConfirmDialog
        open={confirmingDelete}
        title={LABELS.list.deleteConfirmTitle}
        body={LABELS.list.deleteConfirmBody}
        confirmLabel={LABELS.common.delete}
        danger
        busy={commandAction.isBusy}
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmingDelete(false)}
      />

      <ConfirmDialog
        open={pendingMoveId !== null}
        title={LABELS.detail.unsavedTitle}
        body={LABELS.detail.unsavedBody}
        confirmLabel={LABELS.detail.discardAndMove}
        danger
        onConfirm={() => {
          const targetId = pendingMoveId;
          setPendingMoveId(null);
          if (targetId != null) {
            moveTo(targetId);
          }
        }}
        onCancel={() => setPendingMoveId(null)}
      />
    </div>
  );
};
