'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Calendar,
  MapPin,
  Heart,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { DayPicker, type DateRange, type DropdownProps as DayPickerDropdownProps } from 'react-day-picker';
import { format, parse } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { AssetsFilter } from '@/lib/api/assets';

// ============================================================
// 类型定义
// ============================================================

interface AssetFilterBarProps {
  filter: AssetsFilter;
  locations: string[];
  onChange: (filter: AssetsFilter) => void;
}

type FilterType = 'date' | 'location' | 'favorite';

// ============================================================
// 工具函数
// ============================================================

function normalizeFilter(filter: AssetsFilter): AssetsFilter {
  const next: AssetsFilter = { ...filter };
  if (!next.shot_at_start) delete next.shot_at_start;
  if (!next.shot_at_end) delete next.shot_at_end;
  if (next.location_poi !== undefined) {
    const cleaned = next.location_poi.trim();
    if (cleaned) {
      next.location_poi = cleaned;
    } else {
      delete next.location_poi;
    }
  }
  if (!next.is_favorited) delete next.is_favorited;
  return next;
}

// 生成时间筛选的显示文本
function getDateLabel(filter: AssetsFilter): string {
  if (filter.shot_at_start && filter.shot_at_end) {
    return `${filter.shot_at_start} ~ ${filter.shot_at_end}`;
  }
  if (filter.shot_at_start) return `${filter.shot_at_start} 起`;
  if (filter.shot_at_end) return `至 ${filter.shot_at_end}`;
  return '';
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
}

function FilterChip({ icon, label, onRemove, onClick }: FilterChipProps) {
  return (
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
  );
}

// ============================================================
// 时间筛选面板（使用 react-day-picker）
// ============================================================

interface DateFilterPanelProps {
  filter: AssetsFilter;
  onApply: (start?: string, end?: string) => void;
  onClose: () => void;
}

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
        <div className="absolute top-full left-0 mt-1 min-w-[80px] max-h-[200px] overflow-y-auto rounded-lg bg-background-secondary/95 backdrop-blur-xl border border-white/10 shadow-xl z-[60]">
          {options?.map((opt) => (
            <button
              key={opt.value}
              type="button"
              disabled={opt.disabled}
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

function DateFilterPanel({ filter, onApply, onClose }: DateFilterPanelProps) {
  const ref = useRef<HTMLDivElement>(null);

  // 初始化日期范围
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

// ============================================================
// 地点筛选面板
// ============================================================

interface LocationFilterPanelProps {
  locations: string[];
  onSelect: (location: string) => void;
  onClose: () => void;
}

function LocationFilterPanel({ locations, onSelect, onClose }: LocationFilterPanelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState('');

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

  // 模糊搜索过滤
  const filteredLocations = useMemo(() => {
    if (!search.trim()) return locations;
    const keyword = search.toLowerCase().trim();
    return locations.filter((loc) => loc.toLowerCase().includes(keyword));
  }, [locations, search]);

  return (
    <div
      ref={ref}
      className="absolute left-0 top-full mt-2 rounded-2xl bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl z-50 min-w-[240px] overflow-hidden"
    >
      {/* 搜索框 */}
      <div className="p-3 border-b border-white/5">
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索地点..."
            className="w-full pl-3 pr-8 py-2 rounded-xl bg-white/5 border border-white/10 text-sm placeholder:text-foreground-secondary/50 focus:outline-none focus:border-primary/50 transition-colors"
            autoFocus
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/10"
            >
              <X size={12} className="text-foreground-secondary" />
            </button>
          )}
        </div>
      </div>

      {/* 地点列表 */}
      <div className="max-h-[280px] overflow-y-auto p-2">
        {filteredLocations.length === 0 ? (
          <div className="px-3 py-4 text-center text-sm text-foreground-secondary">
            {locations.length === 0 ? '暂无地点数据' : '无匹配结果'}
          </div>
        ) : (
          filteredLocations.map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => onSelect(loc)}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm rounded-xl hover:bg-white/5 transition-colors"
            >
              <MapPin size={14} className="text-foreground-secondary shrink-0" />
              <span className="truncate">{loc}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ============================================================
// 主组件
// ============================================================

export function AssetFilterBar({ filter, locations, onChange }: AssetFilterBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<FilterType | null>(null);

  // 判断各筛选是否激活
  const hasDateFilter = Boolean(filter.shot_at_start || filter.shot_at_end);
  const hasLocationFilter = Boolean(filter.location_poi);
  const hasFavoriteFilter = Boolean(filter.is_favorited);
  const hasAnyFilter = hasDateFilter || hasLocationFilter || hasFavoriteFilter;

  // 更新筛选
  const updateFilter = (next: AssetsFilter) => {
    onChange(normalizeFilter(next));
  };

  // 移除单个筛选
  const removeDate = () => updateFilter({ ...filter, shot_at_start: undefined, shot_at_end: undefined });
  const removeLocation = () => updateFilter({ ...filter, location_poi: undefined });
  const removeFavorite = () => updateFilter({ ...filter, is_favorited: false });

  // 打开筛选面板
  const openPanel = (type: FilterType) => {
    setActivePanel(type);
    setMenuOpen(false);
  };

  // 关闭面板
  const closePanel = () => setActivePanel(null);

  return (
    <div className="relative mb-6 flex flex-wrap items-center gap-2">
      {/* 已激活的筛选 Chips */}
      {hasDateFilter && (
        <FilterChip
          icon={<Calendar size={14} />}
          label={getDateLabel(filter)}
          onRemove={removeDate}
          onClick={() => setActivePanel('date')}
        />
      )}
      {hasLocationFilter && (
        <FilterChip
          icon={<MapPin size={14} />}
          label={filter.location_poi!}
          onRemove={removeLocation}
          onClick={() => setActivePanel('location')}
        />
      )}
      {hasFavoriteFilter && (
        <FilterChip
          icon={<Heart size={14} className="fill-current" />}
          label="已收藏"
          onRemove={removeFavorite}
        />
      )}

      {/* 添加筛选按钮 */}
      <Dropdown
        open={menuOpen}
        onOpenChange={setMenuOpen}
        trigger={
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
          >
            <Plus size={14} />
            <span>添加筛选</span>
          </button>
        }
      >
        <div className="p-2 space-y-1">
          {/* 时间筛选选项 */}
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
          {/* 地点筛选选项 */}
          {!hasLocationFilter && (
            <button
              type="button"
              onClick={() => openPanel('location')}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-white/5 transition-colors"
            >
              <MapPin size={16} className="text-foreground-secondary" />
              <span>按地点筛选</span>
            </button>
          )}
          {/* 收藏筛选选项 */}
          {!hasFavoriteFilter && (
            <button
              type="button"
              onClick={() => {
                updateFilter({ ...filter, is_favorited: true });
                setMenuOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-white/5 transition-colors"
            >
              <Heart size={16} className="text-foreground-secondary" />
              <span>仅显示收藏</span>
            </button>
          )}
          {/* 所有筛选都已激活时的提示 */}
          {hasDateFilter && hasLocationFilter && hasFavoriteFilter && (
            <div className="px-3 py-2 text-sm text-foreground-secondary">
              所有筛选条件已添加
            </div>
          )}
        </div>
      </Dropdown>

      {/* 清空所有筛选 */}
      {hasAnyFilter && (
        <button
          type="button"
          onClick={() => onChange({})}
          className="ml-1 px-2 py-1 text-xs text-foreground-secondary hover:text-foreground transition-colors"
        >
          清空全部
        </button>
      )}

      {/* 时间筛选面板 */}
      {activePanel === 'date' && (
        <DateFilterPanel
          filter={filter}
          onApply={(start, end) => {
            updateFilter({ ...filter, shot_at_start: start, shot_at_end: end });
            closePanel();
          }}
          onClose={closePanel}
        />
      )}

      {/* 地点筛选面板 */}
      {activePanel === 'location' && (
        <LocationFilterPanel
          locations={locations}
          onSelect={(loc) => {
            updateFilter({ ...filter, location_poi: loc });
            closePanel();
          }}
          onClose={closePanel}
        />
      )}
    </div>
  );
}
