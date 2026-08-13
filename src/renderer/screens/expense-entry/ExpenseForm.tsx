import { Combobox } from '@renderer/components/form/Combobox';
import { SparkleIcon } from '@renderer/components/icons/Icons';
import { Field } from '@renderer/components/ui/Field';
import { LABELS } from '@renderer/constants/labels';
import { useAppData } from '@renderer/contexts/AppDataContext';
import { AttachmentField } from '@renderer/screens/expense-entry/AttachmentField';
import type { UseExpenseFormResult } from '@renderer/screens/expense-entry/useExpenseForm';
import {
  ALLOCATION_RATE_PRESETS,
  TAX_RATE_OPTIONS,
  TAX_TREATMENTS,
  TAX_TREATMENT_OPTIONS,
} from '@shared/constants/tax';
import { formatRate, formatYen } from '@shared/utils/format';
import './ExpenseForm.css';

/**
 * 経費 1 件の入力欄一式。
 * 新規入力（経費入力画面）と既存の編集（経費照会画面）で同じものを使う。
 * 保存ボタンなど画面ごとに違う部分は呼び出し側が `actions` で差し込む。
 */
interface ExpenseFormProps {
  /** useExpenseForm() の戻り値をそのまま渡す */
  formState: UseExpenseFormResult;
  fieldErrors: Record<string, string>;
  /** 保存中など、入力を止めたいとき */
  busy: boolean;
  /** フォーム下部に置くボタン類 */
  actions: React.ReactNode;
  onSubmit: () => void;
}

/**
 * 入力欄の id。1 画面に 1 つしかフォームが出ない前提で固定値にしている
 * （label とひも付けるために必要）。
 */
const FIELD_IDS = {
  date: 'expense-date',
  category: 'expense-category',
  payee: 'expense-payee',
  amount: 'expense-amount',
  taxTreatment: 'expense-tax-treatment',
  taxRate: 'expense-tax-rate',
  paymentMethod: 'expense-payment-method',
  allocation: 'expense-allocation',
  allocationNone: 'expense-allocation-none',
  description: 'expense-description',
  note: 'expense-note',
} as const;

export const ExpenseForm = ({
  formState,
  fieldErrors,
  busy,
  actions,
  onSubmit,
}: ExpenseFormProps): JSX.Element => {
  const { activeAccountCategories, activePaymentMethods } = useAppData();
  const {
    form,
    assistedFields,
    payeeSuggestions,
    descriptionSuggestions,
    breakdown,
    allocationDelegated,
    setAllocationDelegated,
    setField,
    applyPayeeSuggestion,
  } = formState;

  const isAssisted = (field: keyof typeof form): boolean =>
    assistedFields.has(field as never);
  const taxRateDisabled = form.taxTreatment === TAX_TREATMENTS.EXEMPT;

  return (
    <form
      className="entry-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="entry-form__grid">
        <Field
          label={LABELS.entry.date}
          htmlFor={FIELD_IDS.date}
          required
          error={fieldErrors.expenseDate}
        >
          <input
            id={FIELD_IDS.date}
            type="date"
            className="input"
            value={form.expenseDate}
            onChange={(event) => setField('expenseDate', event.target.value)}
          />
        </Field>

        <Field
          label={LABELS.entry.accountCategory}
          htmlFor={FIELD_IDS.category}
          assisted={isAssisted('accountCategoryId')}
          hint={LABELS.entry.accountCategoryHint}
          error={fieldErrors.accountCategoryId}
        >
          <select
            id={FIELD_IDS.category}
            className={`select${isAssisted('accountCategoryId') ? ' select--assisted' : ''}`}
            value={form.accountCategoryId ?? ''}
            onChange={(event) =>
              setField(
                'accountCategoryId',
                event.target.value === '' ? null : Number(event.target.value),
              )
            }
          >
            <option value="">{LABELS.common.unset}</option>
            {activeAccountCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label={LABELS.entry.payee}
          htmlFor={FIELD_IDS.payee}
          required
          error={fieldErrors.payeeName}
          hint={
            assistedFields.size > 0 ? (
              <span className="entry-form__assist-note">
                <SparkleIcon width={14} height={14} />
                {LABELS.entry.assistApplied}
              </span>
            ) : undefined
          }
        >
          <Combobox
            id={FIELD_IDS.payee}
            value={form.payeeName}
            placeholder={LABELS.entry.payeePlaceholder}
            options={payeeSuggestions.map((suggestion) => ({
              key: suggestion.id,
              value: suggestion.name,
              hint: `${suggestion.useCount} 回`,
            }))}
            onChange={(value) => setField('payeeName', value)}
            onSelectOption={(option) => {
              const suggestion = payeeSuggestions.find((item) => item.id === option.key);
              if (suggestion) {
                applyPayeeSuggestion(suggestion);
              } else {
                setField('payeeName', option.value);
              }
            }}
          />
        </Field>

        <Field
          label={LABELS.entry.amount}
          htmlFor={FIELD_IDS.amount}
          required
          error={fieldErrors.amount}
        >
          <input
            id={FIELD_IDS.amount}
            type="text"
            inputMode="numeric"
            className="input input--numeric"
            value={form.amountText}
            onChange={(event) => setField('amountText', event.target.value)}
          />
          <span className="input-suffix">{LABELS.entry.amountUnit}</span>
        </Field>

        <Field
          label={LABELS.entry.taxTreatment}
          htmlFor={FIELD_IDS.taxTreatment}
          assisted={isAssisted('taxTreatment')}
          error={fieldErrors.taxTreatment}
        >
          <select
            id={FIELD_IDS.taxTreatment}
            className={`select${isAssisted('taxTreatment') ? ' select--assisted' : ''}`}
            value={form.taxTreatment}
            onChange={(event) =>
              setField('taxTreatment', event.target.value as typeof form.taxTreatment)
            }
          >
            {TAX_TREATMENT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label={LABELS.entry.taxRate}
          htmlFor={FIELD_IDS.taxRate}
          assisted={isAssisted('taxRate')}
          error={fieldErrors.taxRate}
        >
          <select
            id={FIELD_IDS.taxRate}
            className={`select${isAssisted('taxRate') ? ' select--assisted' : ''}`}
            value={form.taxRate}
            disabled={taxRateDisabled}
            onChange={(event) => setField('taxRate', Number(event.target.value))}
          >
            {TAX_RATE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label={LABELS.entry.paymentMethod}
          htmlFor={FIELD_IDS.paymentMethod}
          assisted={isAssisted('paymentMethodId')}
          error={fieldErrors.paymentMethodId}
        >
          <select
            id={FIELD_IDS.paymentMethod}
            className={`select${isAssisted('paymentMethodId') ? ' select--assisted' : ''}`}
            value={form.paymentMethodId ?? ''}
            onChange={(event) =>
              setField(
                'paymentMethodId',
                event.target.value === '' ? null : Number(event.target.value),
              )
            }
          >
            <option value="">{LABELS.common.unset}</option>
            {activePaymentMethods.map((method) => (
              <option key={method.id} value={method.id}>
                {method.name}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label={LABELS.entry.allocationRate}
          htmlFor={FIELD_IDS.allocation}
          required
          assisted={isAssisted('allocationPercentText')}
          hint={
            allocationDelegated ? LABELS.entry.allocationNoneHint : LABELS.entry.allocationHint
          }
          error={fieldErrors.allocationRate}
        >
          <input
            id={FIELD_IDS.allocation}
            type="text"
            inputMode="decimal"
            className={`input input--numeric${
              isAssisted('allocationPercentText') ? ' input--assisted' : ''
            }`}
            value={form.allocationPercentText}
            disabled={allocationDelegated}
            onChange={(event) => setField('allocationPercentText', event.target.value)}
          />
          <span className="input-suffix">%</span>
        </Field>
      </div>

      <div className="entry-form__allocation">
        <label className="entry-form__checkbox" htmlFor={FIELD_IDS.allocationNone}>
          <input
            id={FIELD_IDS.allocationNone}
            type="checkbox"
            checked={allocationDelegated}
            onChange={(event) => setAllocationDelegated(event.target.checked)}
          />
          <span>{LABELS.entry.allocationNone}</span>
        </label>

        <div className="entry-form__allocation-presets">
          {ALLOCATION_RATE_PRESETS.map((rate) => (
            <button
              key={rate}
              type="button"
              className="entry-form__chip"
              disabled={allocationDelegated}
              onClick={() => setField('allocationPercentText', formatRate(rate).replace('%', ''))}
            >
              {formatRate(rate)}
            </button>
          ))}
        </div>
      </div>

      <Field
        label={LABELS.entry.content}
        htmlFor={FIELD_IDS.description}
        assisted={isAssisted('description')}
        error={fieldErrors.description}
      >
        <Combobox
          id={FIELD_IDS.description}
          value={form.description}
          placeholder={LABELS.entry.contentPlaceholder}
          assisted={isAssisted('description')}
          options={descriptionSuggestions.map((description) => ({
            key: description,
            value: description,
          }))}
          onChange={(value) => setField('description', value)}
          onSelectOption={(option) => setField('description', option.value)}
        />
      </Field>

      <Field label={LABELS.entry.note} htmlFor={FIELD_IDS.note} error={fieldErrors.note}>
        <textarea
          id={FIELD_IDS.note}
          className="textarea"
          value={form.note}
          onChange={(event) => setField('note', event.target.value)}
        />
      </Field>

      <Field label={LABELS.entry.attachments} error={fieldErrors.attachments}>
        <AttachmentField
          attachments={form.attachments}
          disabled={busy}
          onChange={(attachments) => setField('attachments', attachments)}
        />
      </Field>

      <div className="entry-preview">
        <h3 className="entry-preview__title">{LABELS.entry.preview}</h3>
        <dl className="entry-preview__grid">
          <div className="entry-preview__item">
            <dt>{LABELS.entry.previewTaxExcluded}</dt>
            <dd className="numeric">{formatYen(breakdown.taxExcluded)}</dd>
          </div>
          <div className="entry-preview__item">
            <dt>{LABELS.entry.previewTax}</dt>
            <dd className="numeric">{formatYen(breakdown.taxAmount)}</dd>
          </div>
          <div className="entry-preview__item">
            <dt>{LABELS.entry.previewTaxIncluded}</dt>
            <dd className="numeric">{formatYen(breakdown.taxIncluded)}</dd>
          </div>
          <div className="entry-preview__item entry-preview__item--highlight">
            <dt>{LABELS.entry.previewAllocated}</dt>
            <dd className="numeric">{formatYen(breakdown.allocatedAmount)}</dd>
          </div>
        </dl>
      </div>

      <div className="entry-form__actions">{actions}</div>
    </form>
  );
};
