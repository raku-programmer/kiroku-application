import { useCallback, useState } from 'react';
import { api } from '@renderer/api/client';
import { LABELS } from '@renderer/constants/labels';
import { LOADING_SCOPES } from '@renderer/constants/ui';
import { useAppData } from '@renderer/contexts/AppDataContext';
import { useAsyncAction } from '@renderer/hooks/useAsyncAction';
import type { PresetRow } from '@renderer/screens/settings/PresetEditor';

/** 編集対象の種別 */
export const PRESET_KINDS = {
  CATEGORY: 'category',
  METHOD: 'method',
} as const;

export type PresetKind = (typeof PRESET_KINDS)[keyof typeof PRESET_KINDS];

export interface PresetDeleteTarget {
  row: PresetRow;
  kind: PresetKind;
}

/**
 * 勘定科目・支払方法の編集操作。
 * 設定画面と初期セットアップの両方から使う。
 */
export const usePresetActions = () => {
  const { reloadPresets } = useAppData();
  const action = useAsyncAction();
  const [deleteTarget, setDeleteTarget] = useState<PresetDeleteTarget | null>(null);
  /** 操作中の行。この行だけを非活性にし、他の行は触れるままにする */
  const [pendingRowId, setPendingRowId] = useState<number | null>(null);

  const runForRow = useCallback(
    async (rowId: number | null, task: () => Promise<void>): Promise<void> => {
      setPendingRowId(rowId);
      try {
        await task();
      } finally {
        setPendingRowId(null);
      }
    },
    [],
  );

  /** 追加できたら true。失敗時は入力欄を消さずに直せるようにする。 */
  const create = useCallback(
    async (name: string, kind: PresetKind): Promise<boolean> => {
      const created = await action.run(
        () =>
          kind === PRESET_KINDS.CATEGORY
            ? api.presets.createAccountCategory({
                name,
                defaultAllocationRate: null,
                isActive: true,
              })
            : api.presets.createPaymentMethod({ name, isActive: true }),
        { scope: LOADING_SCOPES.SECTION, successMessage: LABELS.settings.presetSaved },
      );
      if (created === null) {
        return false;
      }
      await reloadPresets();
      return true;
    },
    [action, reloadPresets],
  );

  const update = useCallback(
    async (row: PresetRow, kind: PresetKind): Promise<void> => {
      await runForRow(row.id, async () => {
        await action.run(
          () =>
            kind === PRESET_KINDS.CATEGORY
              ? api.presets.updateAccountCategory(row.id, {
                  name: row.name,
                  defaultAllocationRate: row.defaultAllocationRate ?? null,
                  isActive: row.isActive,
                })
              : api.presets.updatePaymentMethod(row.id, {
                  name: row.name,
                  isActive: row.isActive,
                }),
          { scope: LOADING_SCOPES.SECTION, successMessage: LABELS.settings.presetSaved },
        );
        // 失敗していれば保存済みの値に戻したいので、成否によらず取得し直す
        await reloadPresets();
      });
    },
    [action, reloadPresets, runForRow],
  );

  const reorder = useCallback(
    async (ids: number[], kind: PresetKind): Promise<void> => {
      const reordered = await action.run(
        () =>
          kind === PRESET_KINDS.CATEGORY
            ? api.presets.reorderAccountCategories(ids)
            : api.presets.reorderPaymentMethods(ids),
        { scope: LOADING_SCOPES.SECTION },
      );
      if (reordered !== null) {
        await reloadPresets();
      }
    },
    [action, reloadPresets],
  );

  const confirmDelete = useCallback(async (): Promise<void> => {
    const target = deleteTarget;
    if (!target) {
      return;
    }
    // 確認ダイアログは先に閉じる。処理の間ダイアログが残ると操作できなくなる。
    setDeleteTarget(null);
    await runForRow(target.row.id, async () => {
      const removed = await action.run(
        () =>
          target.kind === PRESET_KINDS.CATEGORY
            ? api.presets.deleteAccountCategory(target.row.id)
            : api.presets.deletePaymentMethod(target.row.id),
        { scope: LOADING_SCOPES.SECTION, successMessage: LABELS.settings.presetDeleted },
      );
      if (removed !== null) {
        await reloadPresets();
      }
    });
  }, [action, deleteTarget, reloadPresets, runForRow]);

  return {
    isBusy: action.isBusy,
    isSpinning: action.isSpinning,
    pendingRowId,
    deleteTarget,
    requestDelete: setDeleteTarget,
    cancelDelete: useCallback(() => setDeleteTarget(null), []),
    create,
    update,
    reorder,
    confirmDelete,
  };
};
