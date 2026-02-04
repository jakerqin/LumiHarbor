'use client';

import { useEffect, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { DayPicker, type DropdownProps as DayPickerDropdownProps } from 'react-day-picker';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

function CustomDropdown(props: DayPickerDropdownProps) {
  const { value, onChange, options, name } = props;
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const frame = requestAnimationFrame(() => {
      const list = listRef.current;
      if (!list) return;
      const selected = list.querySelector<HTMLButtonElement>('[data-selected="true"]');
      if (!selected) return;
      const listRect = list.getBoundingClientRect();
      const itemRect = selected.getBoundingClientRect();
      const targetOffset = itemRect.top - listRect.top - (listRect.height / 2 - itemRect.height / 2);
      list.scrollTop += targetOffset;
    });
    return () => cancelAnimationFrame(frame);
  }, [isOpen, value]);

  const selectedOption = options?.find((opt) => opt.value === Number(value));
  const displayLabel = selectedOption?.label || '';

  const handleSelect = (optValue: number) => {
    const syntheticEvent = {
      target: { value: String(optValue), name },
    } as React.ChangeEvent<HTMLSelectElement>;
    onChange?.(syntheticEvent);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/10 text-sm hover:bg-white/15 transition-colors focus:outline-none focus:border-primary/50"
      >
        <span>{displayLabel}</span>
        <ChevronDown size={14} className={`text-foreground-secondary transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          ref={listRef}
          className="dropdown-scrollbar absolute top-full left-0 mt-1 min-w-[80px] max-h-[200px] overflow-y-auto rounded-lg bg-background-secondary/95 backdrop-blur-xl border border-white/10 shadow-xl z-[60]"
        >
          {options?.map((opt) => (
            <button
              key={opt.value}
              type="button"
              disabled={opt.disabled}
              data-selected={opt.value === Number(value)}
              onClick={() => handleSelect(opt.value)}
              className={`w-full px-3 py-1.5 text-left text-sm transition-colors ${
                opt.value === Number(value)
                  ? 'bg-primary/20 text-primary'
                  : 'hover:bg-white/5'
              } ${opt.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export type DatePickerKey = 'start' | 'end';
export type ActiveDatePicker = DatePickerKey | null;

export interface SingleDatePickerProps {
  pickerKey: DatePickerKey;
  value?: Date;
  activeKey: ActiveDatePicker;
  onActiveChange: (key: ActiveDatePicker) => void;
  onChange: (date?: Date) => void;
  disabled?: boolean;
}

export function SingleDatePicker({
  pickerKey,
  value,
  activeKey,
  onActiveChange,
  onChange,
  disabled,
}: SingleDatePickerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isOpen = activeKey === pickerKey;

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onActiveChange(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onActiveChange]);

  const displayValue = value ? format(value, 'yyyy-MM-dd') : '选择日期';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => onActiveChange(isOpen ? null : pickerKey)}
        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-left flex items-center justify-between gap-2 hover:border-primary/50 transition-colors disabled:opacity-50"
        disabled={disabled}
      >
        <span className={value ? 'text-foreground' : 'text-foreground-secondary'}>
          {displayValue}
        </span>
        <Calendar size={14} className="text-foreground-secondary" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 rounded-2xl bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl z-50 p-4">
          <DayPicker
            mode="single"
            selected={value}
            onSelect={(date) => {
              onChange(date || undefined);
              onActiveChange(null);
            }}
            locale={zhCN}
            showOutsideDays
            captionLayout="dropdown"
            startMonth={new Date(2000, 0)}
            endMonth={new Date(2030, 11)}
            classNames={{
              root: 'date-picker-root',
              months: 'flex gap-4',
              month: 'space-y-3',
              month_caption: 'flex justify-center items-center gap-2 h-8 relative',
              caption_label: 'hidden',
              dropdowns: 'flex items-center gap-2',
              nav: 'flex items-center gap-1',
              button_previous: 'p-1.5 rounded-lg hover:bg-white/10 transition-colors absolute left-0 top-0',
              button_next: 'p-1.5 rounded-lg hover:bg-white/10 transition-colors absolute right-0 top-0',
              weekdays: 'flex',
              weekday: 'w-9 h-9 flex items-center justify-center text-xs text-foreground-secondary font-medium',
              week: 'flex',
              day: 'w-9 h-9 flex items-center justify-center text-sm rounded-lg transition-colors hover:bg-white/10',
              day_button: 'w-full h-full flex items-center justify-center',
              selected: 'bg-primary/20 text-primary font-medium',
              today: 'ring-1 ring-primary/50',
              outside: 'text-foreground-secondary/40',
              disabled: 'text-foreground-secondary/30 cursor-not-allowed',
            }}
            components={{
              Chevron: ({ orientation }) =>
                orientation === 'left' ? (
                  <ChevronLeft size={16} className="text-foreground-secondary" />
                ) : (
                  <ChevronRight size={16} className="text-foreground-secondary" />
                ),
              Dropdown: CustomDropdown,
            }}
          />

          <div className="mt-3 pt-3 border-t border-white/5 flex justify-end">
            <button
              type="button"
              onClick={() => onChange(undefined)}
              className="px-3 py-1.5 text-sm text-foreground-secondary hover:text-foreground rounded-lg hover:bg-white/5 transition-colors"
              disabled={disabled}
            >
              清除
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
