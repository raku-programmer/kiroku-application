import { useEffect, useId, useRef, useState } from 'react';
import './Combobox.css';

export interface ComboboxOption {
  /** 一意なキー */
  key: string | number;
  /** 入力欄に反映する値 */
  value: string;
  /** 補足表示（使用回数など） */
  hint?: string;
}

interface ComboboxProps {
  id?: string;
  value: string;
  placeholder?: string;
  options: readonly ComboboxOption[];
  disabled?: boolean;
  assisted?: boolean;
  onChange: (value: string) => void;
  /** 候補から選択されたとき（自動補完のトリガー） */
  onSelectOption: (option: ComboboxOption) => void;
  onBlur?: () => void;
}

/**
 * 入力しながら過去の値から候補を選べる入力欄。
 * 請求元・内容の入力アシストに使う。
 */
export const Combobox = ({
  id,
  value,
  placeholder,
  options,
  disabled = false,
  assisted = false,
  onChange,
  onSelectOption,
  onBlur,
}: ComboboxProps): JSX.Element => {
  const generatedId = useId();
  const listId = `${id ?? generatedId}-listbox`;
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const select = (option: ComboboxOption): void => {
    onSelectOption(option);
    setOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (options.length === 0) {
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => (current + 1) % options.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => (current <= 0 ? options.length - 1 : current - 1));
    } else if (event.key === 'Enter' && open && activeIndex >= 0) {
      event.preventDefault();
      select(options[activeIndex]);
    } else if (event.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div className="combobox" ref={containerRef}>
      <input
        id={id}
        type="text"
        className={`input${assisted ? ' input--assisted' : ''}`}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={onBlur}
        onKeyDown={handleKeyDown}
      />
      {open && options.length > 0 && (
        <ul className="combobox__list" id={listId} role="listbox">
          {options.map((option, index) => (
            <li key={option.key}>
              <button
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                className={`combobox__option${
                  index === activeIndex ? ' combobox__option--active' : ''
                }`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => select(option)}
              >
                <span className="combobox__option-value">{option.value}</span>
                {option.hint && <span className="combobox__option-hint">{option.hint}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
