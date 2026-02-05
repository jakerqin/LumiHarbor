'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { DayPicker, type DateRange, type DropdownProps as DayPickerDropdownProps } from 'react-day-picker';
import { format, parse } from 'date-fns';
import { zhCN } from 'date-fns/locale';

// ============================================================
// 类型定义
// ============================================================

export interface DateRangePickerProps {
  startDate?: string; // yyyy-MM-dd 格式
  endDate?: string; // yyyy-MM-dd 格式
  onApply: (start?: string, end?: string) => void;
  onClose: () => void;
}

// ============================================================
// 工具函数
// ============================================================

// 解析日期字符串为 Date 对象
function parseDate(dateStr?: string): Date | undefined {
  if (!dateStr) return undefined;
  try {
    return parse(dateStr, 'yyyy-MM-dd', new Date());
  } catch {
    return undefined;
  }
}

// 格式化 Date 对象为日期字符串
function formatDate(date?: Date): string | undefined {
  if (!date) return undefined;
  return format(date, 'yyyy-MM-dd');
}

// ============================================================
// 自定义下拉选择器组件（用于年月选择）
// ============================================================

function CustomDropdown(props: DayPickerDropdownProps) {
  const { value, onChange, options, name } = props;
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭
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

// ============================================================
// 日期范围选择器组件
// ============================================================

export function DateRangePicker({ startDate, endDate, onApply, onClose }: DateRangePickerProps) {
  const ref = useRef<HTMLDivElement>(null);

  // 初始化日期范围
  const initialRange: DateRange | undefined = useMemo(() => {
    const from = parseDate(startDate);
    const to = parseDate(endDate);
    if (!from && !to) return undefined;
    return { from, to };
  }, [startDate, endDate]);

  const [range, setRange] = useState<DateRange | undefined>(initialRange);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const handleApply = () => {
    onApply(formatDate(range?.from), formatDate(range?.to));
  };

  return (
    <div
      ref={ref}
      className="absolute left-0 top-full mt-2 p-4 rounded-2xl bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl z-50"
    >
      {/* 日期选择器 - 支持年月下拉选择 */}
      <DayPicker
        mode="range"
        selected={range}
        onSelect={setRange}
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
          range_start: 'bg-primary text-white rounded-l-lg rounded-r-none',
          range_end: 'bg-primary text-white rounded-r-lg rounded-l-none',
          range_middle: 'bg-primary/15 text-primary rounded-none',
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

      {/* 已选范围显示 */}
      <div className="mt-3 pt-3 border-t border-white/5">
        <div className="text-xs text-foreground-secondary mb-3">
          {range?.from && range?.to ? (
            <span>
              已选择: {format(range.from, 'yyyy年M月d日', { locale: zhCN })} ~{' '}
              {format(range.to, 'yyyy年M月d日', { locale: zhCN })}
            </span>
          ) : range?.from ? (
            <span>已选择起始: {format(range.from, 'yyyy年M月d日', { locale: zhCN })}</span>
          ) : (
            <span>点击选择起始日期，再次点击选择结束日期</span>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setRange(undefined)}
            className="px-3 py-1.5 text-sm text-foreground-secondary hover:text-foreground rounded-lg hover:bg-white/5 transition-colors"
          >
            清除
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-foreground-secondary hover:text-foreground rounded-lg hover:bg-white/5 transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-4 py-1.5 text-sm bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors"
          >
            应用
          </button>
        </div>
      </div>
    </div>
  );
}
