'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Calendar,
  MapPin,
  Heart,
  Plus,
  X,
} from 'lucide-react';
import type { AssetsFilter } from '@/lib/api/assets';
import { DateRangePicker } from '@/components/common/DateRangePicker';

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
      {/* 在 Chip 下方渲染面板 */}
      {isActive && panel}
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
  const [filterOrder, setFilterOrder] = useState<FilterType[]>([]);

  // 判断各筛选是否激活
  const hasDateFilter = Boolean(filter.shot_at_start || filter.shot_at_end);
  const hasLocationFilter = Boolean(filter.location_poi);
  const hasFavoriteFilter = Boolean(filter.is_favorited);
  const hasAnyFilter = hasDateFilter || hasLocationFilter || hasFavoriteFilter;

  // 初始化筛选顺序（仅在组件挂载时执行一次）
  useEffect(() => {
    const initialOrder: FilterType[] = [];
    if (hasDateFilter) initialOrder.push('date');
    if (hasLocationFilter) initialOrder.push('location');
    if (hasFavoriteFilter) initialOrder.push('favorite');
    setFilterOrder(initialOrder);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 更新筛选（同时更新顺序）
  const updateFilter = (next: AssetsFilter, addedType?: FilterType) => {
    onChange(normalizeFilter(next));

    // 如果添加了新筛选，更新顺序
    if (addedType && !filterOrder.includes(addedType)) {
      setFilterOrder([...filterOrder, addedType]);
    }
  };

  // 移除单个筛选（同时从顺序中移除）
  const removeDate = () => {
    updateFilter({ ...filter, shot_at_start: undefined, shot_at_end: undefined });
    setFilterOrder(filterOrder.filter(t => t !== 'date'));
  };
  const removeLocation = () => {
    updateFilter({ ...filter, location_poi: undefined });
    setFilterOrder(filterOrder.filter(t => t !== 'location'));
  };
  const removeFavorite = () => {
    updateFilter({ ...filter, is_favorited: false });
    setFilterOrder(filterOrder.filter(t => t !== 'favorite'));
  };

  // 打开筛选面板
  const openPanel = (type: FilterType) => {
    setActivePanel(type);
    setMenuOpen(false);
  };

  // 关闭面板
  const closePanel = () => setActivePanel(null);

  // 根据类型渲染对应的 FilterChip
  const renderFilterChip = (type: FilterType) => {
    switch (type) {
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
      case 'location':
        if (!hasLocationFilter) return null;
        return (
          <FilterChip
            key="location"
            icon={<MapPin size={14} />}
            label={filter.location_poi!}
            onRemove={removeLocation}
            onClick={() => setActivePanel(activePanel === 'location' ? null : 'location')}
            isActive={activePanel === 'location'}
            panel={
              <LocationFilterPanel
                locations={locations}
                onSelect={(loc) => {
                  updateFilter({ ...filter, location_poi: loc }, 'location');
                  closePanel();
                }}
                onClose={closePanel}
              />
            }
          />
        );
      case 'favorite':
        if (!hasFavoriteFilter) return null;
        return (
          <FilterChip
            key="favorite"
            icon={<Heart size={14} className="fill-current" />}
            label="已收藏"
            onRemove={removeFavorite}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative mb-6 flex flex-wrap items-center gap-2">
      {/* 已激活的筛选 Chips - 按添加顺序显示 */}
      {filterOrder.map(type => renderFilterChip(type))}

      {/* 添加筛选按钮 */}
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
                  updateFilter({ ...filter, is_favorited: true }, 'favorite');
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

        {/* 在「添加筛选」按钮下方渲染面板（仅当对应筛选未激活时） */}
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
        {activePanel === 'location' && !hasLocationFilter && (
          <LocationFilterPanel
            locations={locations}
            onSelect={(loc) => {
              updateFilter({ ...filter, location_poi: loc }, 'location');
              closePanel();
            }}
            onClose={closePanel}
          />
        )}
      </div>

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
    </div>
  );
}
