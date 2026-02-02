'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, Plus, X, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { DayPicker, type DateRange, type DropdownProps as DayPickerDropdownProps } from 'react-day-picker';
import { format, parse } from 'date-fns';
import { zhCN } from 'date-fns/locale';

// ============================================================
// 类型定义
// ============================================================

export interface AlbumsFilter {
  name?: string;
  shot_at_start?: string;
  shot_at_end?: string;
}

interface AlbumFilterBarProps {
  filter: AlbumsFilter;
  onChange: (filter: AlbumsFilter) => void;
}

type FilterType = 'name' | 'date';

// ============================================================
// 工具函数
// ============================================================

function normalizeFilter(filter: AlbumsFilter): AlbumsFilter {
  const next: AlbumsFilter = { ...filter };
  if (!next.name?.trim()) delete next.name;
  if (!next.shot_at_start) delete next.shot_at_start;
  if (!next.shot_at_end) delete next.shot_at_end;
  return next;
}

function getDateLabel(filter: AlbumsFilter): string {
  if (filter.shot_at_start && filter.shot_at_end) {
    return `${filter.shot_at_start} ~ ${filter.shot_at_end}`;
  }
  if (filter.shot_at_start) return `${filter.shot_at_start} 起`;
  if (filter.shot_at_end) return `至 ${filter.shot_at_end}`;
  return '';
}

function parseDate(dateStr?: string): Date | undefined {
  if (!dateStr) return undefined;
  try {
    return parse(dateStr, 'yyyy-MM-dd', new Date());
  } catch {
    return undefined;
  }
}

function formatDate(date?: Date): string | undefined {
  if (!date) return undefined;
  return format(date, 'yyyy-MM-dd');
}

// ============================================================
// 下拉菜单组件
// ============================================================

interface DropdownProps {
  trigger: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

function Dropdown({ trigger, open, onOpenChange, children }: DropdownProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onOpenChange(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, onOpenChange]);

  return (
    <div ref={ref} className="relative">
      <div onClick={() => onOpenChange(!open)}>{trigger}</div>
      {open && (
        <div className="absolute top-full left-0 mt-2 min-w-[280px] rounded-xl bg-background-secondary/95 backdrop-blur-xl border border-white/10 shadow-2xl z-50">
          {children}
        </div>
      )}
    </div>
  );
}

// ============================================================
// 筛选 Chip 组件
// ============================================================

interface FilterChipProps {
  icon: React.ReactNode;
  label: string;
  onRemove: () => void;
  onClick?: () => void;
  isActive?: boolean;
  panel?: React.ReactNode;
}

function FilterChip({ icon, label, onRemove, onClick, isActive, panel }: FilterChipProps) {
  return (
    <div className="relative">
      <div
        onClick={onClick}
        className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full bg-primary/15 text-primary text-sm border border-primary/20 cursor-pointer hover:bg-primary/20 transition-colors"
      >
        {icon}
        <span className="max-w-[120px] truncate">{label}</span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 p-0.5 rounded-full hover:bg-primary/30 transition-colors"
          aria-label="移除筛选"
        >
          <X size={12} />
        </button>
      </div>
      {isActive && panel}
    </div>
  );
}

// ============================================================
// 自定义下拉选择器组件
// ============================================================

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

// ============================================================
// 时间筛选面板
// ============================================================

interface DateFilterPanelProps {
  filter: AlbumsFilter;
  onApply: (start?: string, end?: string) => void;
  onClose: () => void;
}

function DateFilterPanel({ filter, onApply, onClose }: DateFilterPanelProps) {
  const ref = useRef<HTMLDivElement>(null);

  const initialRange: DateRange | undefined = useMemo(() => {
    const from = parseDate(filter.shot_at_start);
    const to = parseDate(filter.shot_at_end);
    if (!from && !to) return undefined;
    return { from, to };
  }, [filter.shot_at_start, filter.shot_at_end]);

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

// ============================================================
// 名称筛选面板
// ============================================================

interface NameFilterPanelProps {
  value: string;
  onApply: (name: string) => void;
  onClose: () => void;
}

function NameFilterPanel({ value, onApply, onClose }: NameFilterPanelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [name, setName] = useState(value);

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
    onApply(name.trim());
  };

  return (
    <div
      ref={ref}
      className="absolute left-0 top-full mt-2 p-4 rounded-2xl bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl z-50 min-w-[320px]"
    >
      <div className="space-y-3">
        <div>
          <label className="block text-sm text-foreground-secondary mb-2">相册名称</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="输入相册名称..."
            className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm placeholder:text-foreground-secondary/50 focus:outline-none focus:border-primary/50 transition-colors"
            autoFocus
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setName('')}
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

// ============================================================
// 主组件
// ============================================================

export function AlbumFilterBar({ filter, onChange }: AlbumFilterBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<FilterType | null>(null);
  const [filterOrder, setFilterOrder] = useState<FilterType[]>([]);

  const hasNameFilter = Boolean(filter.name?.trim());
  const hasDateFilter = Boolean(filter.shot_at_start || filter.shot_at_end);
  const hasAnyFilter = hasNameFilter || hasDateFilter;

  useEffect(() => {
    const initialOrder: FilterType[] = [];
    if (hasNameFilter) initialOrder.push('name');
    if (hasDateFilter) initialOrder.push('date');
    setFilterOrder(initialOrder);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateFilter = (next: AlbumsFilter, addedType?: FilterType) => {
    onChange(normalizeFilter(next));
    if (addedType && !filterOrder.includes(addedType)) {
      setFilterOrder([...filterOrder, addedType]);
    }
  };

  const removeName = () => {
    updateFilter({ ...filter, name: undefined });
    setFilterOrder(filterOrder.filter(t => t !== 'name'));
  };

  const removeDate = () => {
    updateFilter({ ...filter, shot_at_start: undefined, shot_at_end: undefined });
    setFilterOrder(filterOrder.filter(t => t !== 'date'));
  };

  const openPanel = (type: FilterType) => {
    setActivePanel(type);
    setMenuOpen(false);
  };

  const closePanel = () => setActivePanel(null);

  const renderFilterChip = (type: FilterType) => {
    switch (type) {
      case 'name':
        if (!hasNameFilter) return null;
        return (
          <FilterChip
            key="name"
            icon={<span className="text-xs">📝</span>}
            label={filter.name!}
            onRemove={removeName}
            onClick={() => setActivePanel(activePanel === 'name' ? null : 'name')}
            isActive={activePanel === 'name'}
            panel={
              <NameFilterPanel
                value={filter.name || ''}
                onApply={(name) => {
                  updateFilter({ ...filter, name }, 'name');
                  closePanel();
                }}
                onClose={closePanel}
              />
            }
          />
        );
      case 'date':
        if (!hasDateFilter) return null;
        return (
          <FilterChip
            key="date"
            icon={<Calendar size={14} />}
            label={getDateLabel(filter)}
            onRemove={removeDate}
            onClick={() => setActivePanel(activePanel === 'date' ? null : 'date')}
            isActive={activePanel === 'date'}
            panel={
              <DateFilterPanel
                filter={filter}
                onApply={(start, end) => {
                  updateFilter({ ...filter, shot_at_start: start, shot_at_end: end }, 'date');
                  closePanel();
                }}
                onClose={closePanel}
              />
            }
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative mb-6 flex flex-wrap items-center gap-2">
      {filterOrder.map(type => renderFilterChip(type))}

      <div className="relative">
        <Dropdown
          open={menuOpen}
          onOpenChange={setMenuOpen}
          trigger={
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3 h-11 rounded-full text-sm bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
            >
              <Plus size={14} />
              <span>添加筛选</span>
            </button>
          }
        >
          <div className="p-2 space-y-1">
            {!hasNameFilter && (
              <button
                type="button"
                onClick={() => openPanel('name')}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-white/5 transition-colors"
              >
                <span className="text-base">📝</span>
                <span>按名称筛选</span>
              </button>
            )}
            {!hasDateFilter && (
              <button
                type="button"
                onClick={() => openPanel('date')}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-white/5 transition-colors"
              >
                <Calendar size={16} className="text-foreground-secondary" />
                <span>按时间筛选</span>
              </button>
            )}
            {hasNameFilter && hasDateFilter && (
              <div className="px-3 py-2 text-sm text-foreground-secondary">
                所有筛选条件已添加
              </div>
            )}
          </div>
        </Dropdown>

        {activePanel === 'name' && !hasNameFilter && (
          <NameFilterPanel
            value={filter.name || ''}
            onApply={(name) => {
              updateFilter({ ...filter, name }, 'name');
              closePanel();
            }}
            onClose={closePanel}
          />
        )}
        {activePanel === 'date' && !hasDateFilter && (
          <DateFilterPanel
            filter={filter}
            onApply={(start, end) => {
              updateFilter({ ...filter, shot_at_start: start, shot_at_end: end }, 'date');
              closePanel();
            }}
            onClose={closePanel}
          />
        )}
      </div>

      {hasAnyFilter && (
        <button
          type="button"
          onClick={() => onChange({})}
          className="ml-1 px-2 py-1 text-xs text-foreground-secondary hover:text-foreground transition-colors"
        >
          清空全部
        </button>
      )}
    </div>
  );
}
