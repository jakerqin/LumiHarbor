'use client';

import { useEffect, useRef, useState } from 'react';
import { Calendar, Plus, X } from 'lucide-react';
import { DateRangePicker } from '@/components/common/DateRangePicker';

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
              <DateRangePicker
                startDate={filter.shot_at_start}
                endDate={filter.shot_at_end}
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
          <DateRangePicker
            startDate={filter.shot_at_start}
            endDate={filter.shot_at_end}
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
