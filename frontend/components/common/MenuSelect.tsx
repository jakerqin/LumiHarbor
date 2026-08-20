'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface MenuSelectOption {
  value: string;
  label: string;
  hint?: string;
}

interface MenuSelectProps {
  value: string;
  options: MenuSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  searchable?: boolean;
  onChange: (value: string) => void;
}

export function MenuSelect({
  value,
  options,
  placeholder = '请选择',
  disabled,
  searchable = false,
  onChange,
}: MenuSelectProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = options.find((item) => item.value === value);
  const filtered = useMemo(
    () => (searchable && query.trim() ? options.filter((item) => matchOption(query, item)) : options),
    [options, query, searchable],
  );

  useEffect(() => {
    if (!open) {
      setQuery('');
      return;
    }
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  useEffect(() => {
    if (open && searchable) inputRef.current?.focus();
  }, [open, searchable]);

  const pick = (next: string) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative min-w-0">
      {searchable ? (
        <SearchTrigger
          inputRef={inputRef}
          open={open}
          query={query}
          selectedLabel={selected?.label}
          placeholder={placeholder}
          disabled={disabled}
          onQueryChange={(next) => {
            setQuery(next);
            setOpen(true);
          }}
          onOpen={() => !disabled && setOpen(true)}
          onToggle={() => !disabled && setOpen((prev) => !prev)}
          onEnter={() => filtered[0] && pick(filtered[0].value)}
          onEscape={() => setOpen(false)}
        />
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((prev) => !prev)}
          className={triggerClass}
        >
          <span className={selected ? 'truncate text-foreground' : 'truncate text-foreground-secondary'}>
            {selected?.label ?? placeholder}
          </span>
          <ChevronIcon open={open} />
        </button>
      )}
      {open && (
        <OptionList value={value} options={filtered} emptyText={query.trim() ? '无匹配结果' : '暂无选项'} onPick={pick} />
      )}
    </div>
  );
}

function SearchTrigger({
  inputRef,
  open,
  query,
  selectedLabel,
  placeholder,
  disabled,
  onQueryChange,
  onOpen,
  onToggle,
  onEnter,
  onEscape,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  open: boolean;
  query: string;
  selectedLabel?: string;
  placeholder: string;
  disabled?: boolean;
  onQueryChange: (value: string) => void;
  onOpen: () => void;
  onToggle: () => void;
  onEnter: () => void;
  onEscape: () => void;
}) {
  return (
    <div className={`${triggerClass} ${open ? 'border-primary/40' : ''}`}>
      <input
        ref={inputRef}
        value={open ? query : (selectedLabel ?? '')}
        placeholder={placeholder}
        disabled={disabled}
        onFocus={onOpen}
        onChange={(e) => onQueryChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onEnter();
          }
          if (e.key === 'Escape') onEscape();
        }}
        className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-foreground-secondary"
      />
      <button type="button" tabIndex={-1} disabled={disabled} onClick={onToggle} className="shrink-0">
        <ChevronIcon open={open} />
      </button>
    </div>
  );
}

function OptionList({
  value,
  options,
  emptyText,
  onPick,
}: {
  value: string;
  options: MenuSelectOption[];
  emptyText: string;
  onPick: (value: string) => void;
}) {
  return (
    <div className="absolute left-0 right-0 z-50 mt-1 max-h-64 overflow-y-auto rounded-xl border border-white/10 bg-background py-1 shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
      {options.length === 0 && (
        <p className="px-3 py-3 text-sm text-foreground-secondary">{emptyText}</p>
      )}
      {options.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => onPick(item.value)}
          className={`flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-white/10 ${
            item.value === value ? 'bg-white/10 text-primary' : 'text-foreground'
          }`}
        >
          <span>{item.label}</span>
          {item.hint && (
            <span className="font-mono text-[10px] text-foreground-secondary">{item.hint}</span>
          )}
        </button>
      ))}
    </div>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <ChevronDown
      size={14}
      className={`shrink-0 text-foreground-secondary transition-transform ${open ? 'rotate-180' : ''}`}
    />
  );
}

function matchOption(query: string, item: MenuSelectOption): boolean {
  const haystack = [item.label, item.hint, item.value].filter(Boolean).join(' ').toLowerCase();
  return haystack.includes(query.trim().toLowerCase());
}

const triggerClass =
  'flex w-full items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-left text-sm hover:border-primary/40 transition-colors disabled:opacity-50';
