// Lightweight autocomplete input. Uses the native <datalist> element so we
// get free keyboard navigation, accessibility, and platform-style dropdown
// rendering — no external dependencies, no popper logic.

import { useId } from 'react';
import clsx from 'clsx';

interface AutocompleteInputProps {
  value: string;
  onChange: (next: string) => void;
  onCommit?: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function AutocompleteInput({
  value,
  onChange,
  onCommit,
  suggestions,
  placeholder,
  className,
  disabled,
}: AutocompleteInputProps) {
  const listId = useId();
  return (
    <>
      <input
        type="text"
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && onCommit) {
            const v = (e.target as HTMLInputElement).value.trim();
            if (v) onCommit(v);
          }
        }}
        placeholder={placeholder}
        disabled={disabled}
        className={clsx('input', className)}
      />
      <datalist id={listId}>
        {suggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </>
  );
}
