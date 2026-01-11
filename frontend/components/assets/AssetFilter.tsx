'use client';

import { useState, useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import {
  Filter,
  X,
  Image as ImageIcon,
  Video,
  MapPin,
  ArrowUpDown,
} from 'lucide-react';
import type { AssetsFilter } from '@/lib/api/assets';

interface AssetFilterProps {
  filter: AssetsFilter;
  onChange: (filter: AssetsFilter) => void;
  locations: string[];
}

export function AssetFilter({ filter, onChange, locations }: AssetFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleTypeChange = (asset_type: 'image' | 'video' | undefined) => {
    onChange({ ...filter, asset_type });
  };

  const handleLocationChange = (location: string | undefined) => {
    onChange({ ...filter, location });
  };

  const handleSortChange = (sort_by: 'shot_at' | 'created_at') => {
    onChange({ ...filter, sort_by });
  };

  const handleClearFilter = () => {
    onChange({});
  };

  const hasActiveFilter = filter.asset_type || filter.location || filter.sort_by;

  // 按钮 Hover 效果
  const handleButtonMouseEnter = () => {
    if (!filterButtonRef.current) return;
    gsap.to(filterButtonRef.current, {
      scale: 1.05,
      duration: 0.3,
      ease: 'power2.out',
    });
  };

  const handleButtonMouseLeave = () => {
    if (!filterButtonRef.current) return;
    gsap.to(filterButtonRef.current, {
      scale: 1,
      duration: 0.3,
      ease: 'power2.out',
    });
  };

  // 按钮 Tap 效果
  const handleButtonMouseDown = () => {
    if (!filterButtonRef.current) return;
    gsap.to(filterButtonRef.current, {
      scale: 0.95,
      duration: 0.1,
      ease: 'power2.out',
    });
  };

  const handleButtonMouseUp = () => {
    if (!filterButtonRef.current) return;
    gsap.to(filterButtonRef.current, {
      scale: 1.05,
      duration: 0.1,
      ease: 'power2.out',
    });
  };

  // 筛选面板展开/收起动画
  useEffect(() => {
    if (!panelRef.current) return;

    if (isOpen) {
      // 显示面板
      panelRef.current.style.display = 'block';
      gsap.fromTo(
        panelRef.current,
        { opacity: 0, y: -10 },
        { opacity: 1, y: 0, duration: 0.2, ease: 'power2.out' }
      );
    } else {
      // 隐藏面板
      gsap.to(panelRef.current, {
        opacity: 0,
        y: -10,
        duration: 0.15,
        ease: 'power2.in',
        onComplete: () => {
          if (panelRef.current) {
            panelRef.current.style.display = 'none';
          }
        },
      });
    }
  }, [isOpen]);

  return (
    <div className="relative">
      {/* 筛选按钮 */}
      <button
        ref={filterButtonRef}
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={handleButtonMouseEnter}
        onMouseLeave={handleButtonMouseLeave}
        onMouseDown={handleButtonMouseDown}
        onMouseUp={handleButtonMouseUp}
        className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-colors ${
          hasActiveFilter
            ? 'bg-primary text-white'
            : 'bg-background-secondary hover:bg-background-tertiary text-foreground'
        }`}
      >
        <Filter size={20} />
        <span>筛选</span>
        {hasActiveFilter && (
          <span className="w-5 h-5 bg-white/20 rounded-full text-xs flex items-center justify-center">
            {[filter.asset_type, filter.location, filter.sort_by].filter(Boolean).length}
          </span>
        )}
      </button>

      {/* 筛选面板 */}
      <div
        ref={panelRef}
        className="absolute top-full mt-2 right-0 w-96 bg-background-secondary border border-white/10 rounded-xl shadow-2xl p-6 space-y-6 z-10"
        style={{ display: 'none', opacity: 0 }}
      >
        {/* 顶部栏 */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-heading font-semibold">筛选条件</h3>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* 类型筛选 */}
        <div>
          <div className="flex items-center gap-2 mb-3 text-sm text-foreground-secondary">
            <ImageIcon size={16} />
            <span>素材类型</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleTypeChange(undefined)}
              className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${
                !filter.asset_type
                  ? 'bg-primary text-white'
                  : 'bg-background-tertiary hover:bg-white/5'
              }`}
            >
              全部
            </button>
            <button
              onClick={() => handleTypeChange('image')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-1 ${
                filter.asset_type === 'image'
                  ? 'bg-primary text-white'
                  : 'bg-background-tertiary hover:bg-white/5'
              }`}
            >
              <ImageIcon size={16} />
              图片
            </button>
            <button
              onClick={() => handleTypeChange('video')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-1 ${
                filter.asset_type === 'video'
                  ? 'bg-primary text-white'
                  : 'bg-background-tertiary hover:bg-white/5'
              }`}
            >
              <Video size={16} />
              视频
            </button>
          </div>
        </div>

        {/* 地点筛选 */}
        <div>
          <div className="flex items-center gap-2 mb-3 text-sm text-foreground-secondary">
            <MapPin size={16} />
            <span>拍摄地点</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleLocationChange(undefined)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                !filter.location
                  ? 'bg-primary text-white'
                  : 'bg-background-tertiary hover:bg-white/5'
              }`}
            >
              全部
            </button>
            {locations.slice(0, 7).map((location) => (
              <button
                key={location}
                onClick={() => handleLocationChange(location)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  filter.location === location
                    ? 'bg-primary text-white'
                    : 'bg-background-tertiary hover:bg-white/5'
                }`}
              >
                {location}
              </button>
            ))}
          </div>
        </div>

        {/* 排序方式 */}
        <div>
          <div className="flex items-center gap-2 mb-3 text-sm text-foreground-secondary">
            <ArrowUpDown size={16} />
            <span>排序方式</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleSortChange('shot_at')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${
                filter.sort_by === 'shot_at' || !filter.sort_by
                  ? 'bg-primary text-white'
                  : 'bg-background-tertiary hover:bg-white/5'
              }`}
            >
              拍摄时间
            </button>
            <button
              onClick={() => handleSortChange('created_at')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${
                filter.sort_by === 'created_at'
                  ? 'bg-primary text-white'
                  : 'bg-background-tertiary hover:bg-white/5'
              }`}
            >
              添加时间
            </button>
          </div>
        </div>

        {/* 底部操作 */}
        <div className="flex gap-3 pt-4 border-t border-white/10">
          <button
            onClick={handleClearFilter}
            disabled={!hasActiveFilter}
            className="flex-1 px-4 py-2 bg-background-tertiary hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            清空筛选
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="flex-1 px-4 py-2 bg-primary hover:bg-primary-hover rounded-lg transition-colors"
          >
            应用
          </button>
        </div>
      </div>
    </div>
  );
}
