'use client';

import { useEffect, useMemo, useState } from 'react';
import { X, Pin, PinOff, Calendar, MapPin, Heart } from 'lucide-react';
import type { AssetsFilter } from '@/lib/api/assets';

interface FilterPreset {
  key: string;
  label: string;
  filter: AssetsFilter;
}

interface AssetFilterPanelProps {
  open: boolean;
  filter: AssetsFilter;
  locations: string[];
  onChange: (filter: AssetsFilter) => void;
  onClose: () => void;
}

const STORAGE_KEY = 'assets-filter-pins:v1';

function readPinnedFilters(): FilterPreset[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FilterPreset[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item.key === 'string' && item.filter);
  } catch {
    return [];
  }
}

function writePinnedFilters(presets: FilterPreset[]) {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  } catch {
    // localStorage 不可用时忽略
  }
}

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

function buildFilterKey(filter: AssetsFilter): string {
  const normalized = normalizeFilter(filter);
  return JSON.stringify({
    shot_at_start: normalized.shot_at_start ?? '',
    shot_at_end: normalized.shot_at_end ?? '',
    location_poi: normalized.location_poi ?? '',
    is_favorited: normalized.is_favorited ? '1' : '',
  });
}

function describeFilter(filter: AssetsFilter): string {
  const parts: string[] = [];
  if (filter.shot_at_start || filter.shot_at_end) {
    const start = filter.shot_at_start ?? '不限';
    const end = filter.shot_at_end ?? '不限';
    parts.push(`时间 ${start} ~ ${end}`);
  }
  if (filter.location_poi) {
    parts.push(`地标 ${filter.location_poi}`);
  }
  if (filter.is_favorited) {
    parts.push('已收藏');
  }
  return parts.length > 0 ? parts.join(' · ') : '全部素材';
}

export function AssetFilterPanel({
  open,
  filter,
  locations,
  onChange,
  onClose,
}: AssetFilterPanelProps) {
  const [pinned, setPinned] = useState<FilterPreset[]>(() => readPinnedFilters());

  useEffect(() => {
    writePinnedFilters(pinned);
  }, [pinned]);

  const hasActiveFilter = Boolean(
    filter.shot_at_start || filter.shot_at_end || filter.location_poi || filter.is_favorited
  );

  const currentKey = useMemo(() => buildFilterKey(filter), [filter]);
  const isPinned = pinned.some((item) => item.key === currentKey);

  const handlePinToggle = () => {
    if (!hasActiveFilter) return;

    if (isPinned) {
      setPinned((prev) => prev.filter((item) => item.key !== currentKey));
      return;
    }

    const normalized = normalizeFilter(filter);
    setPinned((prev) => [
      ...prev,
      {
        key: currentKey,
        label: describeFilter(normalized),
        filter: normalized,
      },
    ]);
  };

  const updateFilter = (next: AssetsFilter) => {
    onChange(normalizeFilter(next));
  };

  const handleClear = () => {
    onChange({});
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-label="关闭"
        onClick={onClose}
      />

      <div className="absolute inset-0 flex items-start justify-center p-4 pt-24">
        <div className="w-full max-w-2xl rounded-2xl bg-background border border-white/10 shadow-2xl overflow-hidden">
          <div className="flex items-start justify-between gap-4 p-5 border-b border-white/10">
            <div>
              <h2 className="text-lg font-heading font-semibold">筛选</h2>
              <p className="mt-1 text-sm text-foreground-secondary">
                选择拍摄时间、地标或收藏状态
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePinToggle}
                disabled={!hasActiveFilter}
                className="h-9 px-3 inline-flex items-center gap-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPinned ? <PinOff size={16} /> : <Pin size={16} />}
                <span className="text-sm">{isPinned ? '解除固定' : '固定当前'}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="h-9 w-9 inline-flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                aria-label="关闭"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="p-5 space-y-6">
            {pinned.length > 0 && (
              <div>
                <div className="text-sm text-foreground-secondary mb-3">固定筛选</div>
                <div className="flex flex-wrap gap-2">
                  {pinned.map((preset) => (
                    <div key={preset.key} className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => updateFilter(preset.filter)}
                        className="px-3 py-1.5 rounded-full text-xs bg-background-tertiary hover:bg-white/10 transition-colors"
                      >
                        {preset.label}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPinned((prev) => prev.filter((item) => item.key !== preset.key))}
                        className="h-6 w-6 inline-flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                        aria-label="解除固定"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-foreground-secondary">
                <Calendar size={16} />
                <span>拍摄时间范围</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  value={filter.shot_at_start ?? ''}
                  onChange={(event) => updateFilter({ ...filter, shot_at_start: event.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-background-tertiary border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <input
                  type="date"
                  value={filter.shot_at_end ?? ''}
                  onChange={(event) => updateFilter({ ...filter, shot_at_end: event.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-background-tertiary border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-foreground-secondary">
                <MapPin size={16} />
                <span>地标（location_poi）</span>
              </div>
              <input
                type="text"
                list="asset-location-options"
                value={filter.location_poi ?? ''}
                onChange={(event) => updateFilter({ ...filter, location_poi: event.target.value })}
                placeholder="输入或选择地标"
                className="w-full px-3 py-2 rounded-lg bg-background-tertiary border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <datalist id="asset-location-options">
                {locations.map((location) => (
                  <option key={location} value={location} />
                ))}
              </datalist>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-foreground-secondary">
                <Heart size={16} />
                <span>收藏状态</span>
              </div>
              <button
                type="button"
                onClick={() => updateFilter({ ...filter, is_favorited: !filter.is_favorited })}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                  filter.is_favorited
                    ? 'bg-primary text-white'
                    : 'bg-background-tertiary hover:bg-white/10 text-foreground'
                }`}
              >
                {filter.is_favorited ? '仅看已收藏' : '不限'}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 p-5 border-t border-white/10">
            <button
              type="button"
              onClick={handleClear}
              disabled={!hasActiveFilter}
              className="px-4 py-2 rounded-lg bg-background-tertiary hover:bg-white/10 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              清空筛选
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover transition-colors text-sm"
            >
              完成
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
