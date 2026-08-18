'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker, type DateRange } from 'react-day-picker';
import { format, parse } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { DayPickerDropdown } from './DayPickerDropdown';

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
          range_start: 'bg-primary text-primary-foreground rounded-l-lg rounded-r-none',
          range_end: 'bg-primary text-primary-foreground rounded-r-lg rounded-l-none',
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
          Dropdown: DayPickerDropdown,
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
