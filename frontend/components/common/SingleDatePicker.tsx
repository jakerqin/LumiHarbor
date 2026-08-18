'use client';

import { useEffect, useRef } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { DayPickerDropdown } from './DayPickerDropdown';

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
        // 固定舒适宽度并相对触发框居中，避免半宽栅格里挤扁或单边溢出
        <div className="absolute left-1/2 top-full z-50 mt-2 w-[18.5rem] -translate-x-1/2 rounded-2xl border border-white/10 bg-background-secondary/95 p-4 shadow-2xl backdrop-blur-2xl">
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
              month_caption: 'relative flex h-8 items-center justify-center gap-2',
              caption_label: 'hidden',
              dropdowns: 'flex items-center gap-2',
              nav: 'flex items-center gap-1',
              button_previous:
                'absolute left-0 top-0 rounded-lg p-1.5 transition-colors hover:bg-white/10',
              button_next:
                'absolute right-0 top-0 rounded-lg p-1.5 transition-colors hover:bg-white/10',
              weekdays: 'flex',
              weekday:
                'flex h-9 w-9 items-center justify-center text-xs font-medium text-foreground-secondary',
              week: 'flex',
              day: 'flex h-9 w-9 items-center justify-center rounded-lg text-sm transition-colors hover:bg-white/10',
              day_button: 'flex h-full w-full items-center justify-center',
              selected: 'bg-primary/20 font-medium text-primary',
              today: 'ring-1 ring-primary/50',
              outside: 'text-foreground-secondary/40',
              disabled: 'cursor-not-allowed text-foreground-secondary/30',
            }}
            components={{
              Chevron: ({ orientation }) =>
                orientation === 'left' ? (
                  <ChevronLeft size={16} className="text-foreground-secondary" />
                ) : (
                  <ChevronRight size={16} className="text-foreground-secondary" />
                ),
              Dropdown: DayPickerDropdown,
            }}
          />

          <div className="mt-3 flex justify-end border-t border-white/5 pt-3">
            <button
              type="button"
              onClick={() => onChange(undefined)}
              className="rounded-lg px-3 py-1.5 text-sm text-foreground-secondary transition-colors hover:bg-white/5 hover:text-foreground"
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
