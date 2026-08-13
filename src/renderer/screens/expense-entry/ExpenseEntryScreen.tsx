import { useEffect, useState } from 'react';
import { api } from '@renderer/api/client';
import { ENTRY_MODES, type EntryTarget, type NavigateFn } from '@renderer/App';
import { Button, BUTTON_VARIANTS } from '@renderer/components/ui/Button';
import { Card } from '@renderer/components/ui/Card';
import { LABELS } from '@renderer/constants/labels';
import { SCREEN_IDS } from '@renderer/constants/navigation';
import { LOADING_SCOPES } from '@renderer/constants/ui';
import { useAsyncAction } from '@renderer/hooks/useAsyncAction';
import { ExpenseForm } from '@renderer/screens/expense-entry/ExpenseForm';
import { fetchExpense, useExpenseForm } from '@renderer/screens/expense-entry/useExpenseForm';

interface ExpenseEntryScreenProps {
  target: EntryTarget;
  onReady: () => void;
  onNavigate: NavigateFn;
}

export const ExpenseEntryScreen = ({
  target,
  onReady,
  onNavigate,
}: ExpenseEntryScreenProps): JSX.Element => {
  const { run, isBusy } = useAsyncAction();
  const formState = useExpenseForm();
  const { loadFromExpense, reset, toInput } = formState;

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const isEdit = target.mode === ENTRY_MODES.EDIT;

  // 編集・複製で開かれた場合は対象の経費を読み込む
  useEffect(() => {
    let canceled = false;
    const load = async (): Promise<void> => {
      if (target.expenseId != null) {
        try {
          const expense = await fetchExpense(target.expenseId);
          if (!canceled) {
            loadFromExpense(expense, target.mode === ENTRY_MODES.EDIT);
          }
        } catch {
          // 取得できない場合は新規入力として扱う
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
  }, [target, loadFromExpense, onReady]);

  const save = async (continueEntry: boolean): Promise<void> => {
    setFieldErrors({});
    const input = toInput();

    const saved = await run(
      () =>
        isEdit && target.expenseId != null
          ? api.expenses.update(target.expenseId, input)
          : api.expenses.create(input),
      {
        scope: LOADING_SCOPES.GLOBAL,
        loadingMessage: LABELS.common.processing,
        successMessage: isEdit ? LABELS.entry.updatedMessage : LABELS.entry.createdMessage,
        onError: (error) => setFieldErrors(error.fields ?? {}),
      },
    );

    if (!saved) {
      return;
    }
    if (continueEntry) {
      reset(true);
      return;
    }
    onNavigate(SCREEN_IDS.LIST);
  };

  return (
    <div className="screen">
      <Card
        title={isEdit ? LABELS.entry.titleEdit : LABELS.entry.titleCreate}
        description={LABELS.entry.description}
        relative
      >
        <ExpenseForm
          formState={formState}
          fieldErrors={fieldErrors}
          busy={isBusy}
          onSubmit={() => void save(false)}
          actions={
            <>
              {!isEdit && (
                <Button
                  variant={BUTTON_VARIANTS.SECONDARY}
                  onClick={() => void save(true)}
                  loading={isBusy}
                >
                  {LABELS.common.saveAndContinue}
                </Button>
              )}
              <Button type="submit" variant={BUTTON_VARIANTS.PRIMARY} loading={isBusy}>
                {isEdit ? LABELS.common.update : LABELS.common.save}
              </Button>
            </>
          }
        />
      </Card>
    </div>
  );
};
