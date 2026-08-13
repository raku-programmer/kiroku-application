import { useEffect, useState } from 'react';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  PlusIcon,
  TrashIcon,
} from '@renderer/components/icons/Icons';
import { Button, BUTTON_SIZES, BUTTON_VARIANTS } from '@renderer/components/ui/Button';
import { LABELS } from '@renderer/constants/labels';
import { RATE_FRACTION_DIGITS, RATE_SCALE } from '@shared/constants/tax';
import { percentToRate, rateToPercent } from '@shared/utils/money';
import './PresetEditor.css';

/** 一覧に表示する 1 行分の値（勘定科目・支払方法で共通） */
export interface PresetRow {
  id: number;
  name: string;
  isActive: boolean;
  /** 勘定科目のみ使用 */
  defaultAllocationRate?: number | null;
}

interface PresetEditorProps {
  title: string;
  rows: PresetRow[];
  /** 既定按分率の列を表示するか（勘定科目のみ） */
  withAllocationRate?: boolean;
  /** 何らかの操作が進行中。並べ替えと追加だけを止める */
  busy: boolean;
  /**
   * 保存・削除の対象になっている行。
   * この行だけを非活性にし、他の行は触れるままにする。
   */
  pendingRowId: number | null;
  /** 追加できたら true を返す。false のときは入力を残す。 */
  onCreate: (name: string) => Promise<boolean>;
  onUpdate: (row: PresetRow) => Promise<void>;
  onDelete: (row: PresetRow) => void;
  onReorder: (ids: number[]) => Promise<void>;
}

const formatPercentValue = (rate: number | null | undefined): string => {
  if (rate == null) {
    return '';
  }
  const percent = rateToPercent(rate);
  return Number.isInteger(percent) ? String(percent) : percent.toFixed(RATE_FRACTION_DIGITS);
};

const parsePercentValue = (text: string): number | null => {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return null;
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return Math.min(Math.max(percentToRate(parsed), 0), RATE_SCALE);
};

interface DraftRow extends PresetRow {
  allocationText: string;
}

const toDraft = (row: PresetRow): DraftRow => ({
  ...row,
  allocationText: formatPercentValue(row.defaultAllocationRate),
});

export const PresetEditor = ({
  title,
  rows,
  withAllocationRate = false,
  busy,
  pendingRowId,
  onCreate,
  onUpdate,
  onDelete,
  onReorder,
}: PresetEditorProps): JSX.Element => {
  const [newName, setNewName] = useState('');
  // 入力中は手元で保持し、フォーカスが外れたときにだけ保存する
  const [drafts, setDrafts] = useState<DraftRow[]>(() => rows.map(toDraft));

  useEffect(() => {
    setDrafts(rows.map(toDraft));
  }, [rows]);

  const updateDraft = (id: number, patch: Partial<DraftRow>): void => {
    setDrafts((current) =>
      current.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft)),
    );
  };

  const commit = (draft: DraftRow): void => {
    const original = rows.find((row) => row.id === draft.id);
    const nextAllocation = withAllocationRate
      ? parsePercentValue(draft.allocationText)
      : undefined;

    if (
      original &&
      original.name === draft.name.trim() &&
      original.isActive === draft.isActive &&
      (!withAllocationRate || (original.defaultAllocationRate ?? null) === (nextAllocation ?? null))
    ) {
      return;
    }
    void onUpdate({
      id: draft.id,
      name: draft.name.trim(),
      isActive: draft.isActive,
      defaultAllocationRate: nextAllocation ?? null,
    });
  };

  const move = (index: number, offset: number): void => {
    const target = index + offset;
    if (target < 0 || target >= drafts.length) {
      return;
    }
    const ids = drafts.map((row) => row.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    void onReorder(ids);
  };

  const handleCreate = async (): Promise<void> => {
    const name = newName.trim();
    if (name.length === 0) {
      return;
    }
    if (await onCreate(name)) {
      setNewName('');
    }
  };

  return (
    <div className="preset-editor">
      <h3 className="preset-editor__title">{title}</h3>

      <ul className="preset-editor__list">
        {drafts.map((draft, index) => {
          // 操作中の行だけを止める。他の行は続けて編集できる。
          const rowBusy = pendingRowId === draft.id;
          return (
          <li className="preset-editor__row" key={draft.id}>
            <div className="preset-editor__order">
              <button
                type="button"
                onClick={() => move(index, -1)}
                disabled={busy || index === 0}
                aria-label={LABELS.common.moveUp}
                title={LABELS.common.moveUp}
              >
                <ChevronUpIcon width={14} height={14} />
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                disabled={busy || index === drafts.length - 1}
                aria-label={LABELS.common.moveDown}
                title={LABELS.common.moveDown}
              >
                <ChevronDownIcon width={14} height={14} />
              </button>
            </div>

            <input
              type="text"
              className="input preset-editor__name"
              value={draft.name}
              disabled={rowBusy}
              onChange={(event) => updateDraft(draft.id, { name: event.target.value })}
              onBlur={() => commit(draft)}
            />

            {withAllocationRate && (
              <div className="preset-editor__allocation">
                <input
                  type="text"
                  inputMode="decimal"
                  className="input input--numeric"
                  value={draft.allocationText}
                  placeholder={LABELS.common.unset}
                  disabled={rowBusy}
                  onChange={(event) =>
                    updateDraft(draft.id, { allocationText: event.target.value })
                  }
                  onBlur={() => commit(draft)}
                />
                <span className="input-suffix">%</span>
              </div>
            )}

            <label className="preset-editor__active">
              <input
                type="checkbox"
                checked={draft.isActive}
                disabled={rowBusy}
                onChange={(event) => {
                  const next = { ...draft, isActive: event.target.checked };
                  updateDraft(draft.id, { isActive: event.target.checked });
                  commit(next);
                }}
              />
              <span>{LABELS.settings.presetActive}</span>
            </label>

            <Button
              variant={BUTTON_VARIANTS.GHOST}
              size={BUTTON_SIZES.SMALL}
              icon={<TrashIcon width={16} height={16} />}
              onClick={() => onDelete(draft)}
              loading={rowBusy}
              aria-label={LABELS.common.delete}
              title={LABELS.common.delete}
            />
          </li>
          );
        })}
      </ul>

      <div className="preset-editor__add">
        <input
          type="text"
          className="input"
          value={newName}
          placeholder={LABELS.settings.presetNamePlaceholder}
          disabled={busy}
          onChange={(event) => setNewName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void handleCreate();
            }
          }}
        />
        <Button
          variant={BUTTON_VARIANTS.SECONDARY}
          icon={<PlusIcon width={16} height={16} />}
          onClick={() => void handleCreate()}
          disabled={busy || newName.trim().length === 0}
        >
          {LABELS.settings.presetAdd}
        </Button>
      </div>
    </div>
  );
};
