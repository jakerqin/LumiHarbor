'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Funnel,
  X,
  Image as ImageIcon,
  VideoCamera,
  MapPin,
  Tag,
  SortAscending,
} from '@phosphor-icons/react/dist/ssr';
import type { AssetsFilter } from '@/lib/api/assets';

interface AssetFilterProps {
  filter: AssetsFilter;
  onChange: (filter: AssetsFilter) => void;
  tags: string[];
  locations: string[];
}

export function AssetFilter({ filter, onChange, tags, locations }: AssetFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleTypeChange = (type: 'image' | 'video' | undefined) => {
    onChange({ ...filter, type });
  };

  const handleTagToggle = (tag: string) => {
    const currentTags = filter.tags || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter((t) => t !== tag)
      : [...currentTags, tag];
    onChange({ ...filter, tags: newTags.length > 0 ? newTags : undefined });
  };

  const handleLocationChange = (location: string | undefined) => {
    onChange({ ...filter, location });
  };

  const handleSortChange = (sortBy: 'shotAt' | 'createdAt' | 'aiScore') => {
    onChange({ ...filter, sortBy });
  };

  const handleClearFilter = () => {
    onChange({});
  };

  const hasActiveFilter =
    filter.type || (filter.tags && filter.tags.length > 0) || filter.location || filter.sortBy;

  return (
    <div className="relative">
      {/* 筛选按钮 */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-colors ${
          hasActiveFilter
            ? 'bg-primary text-white'
            : 'bg-background-secondary hover:bg-background-tertiary text-foreground'
        }`}
      >
        <Funnel size={20} weight="duotone" />
        <span>筛选</span>
        {hasActiveFilter && (
          <span className="w-5 h-5 bg-white/20 rounded-full text-xs flex items-center justify-center">
            {[filter.type, filter.location, filter.sortBy].filter(Boolean).length +
              (filter.tags?.length || 0)}
          </span>
        )}
      </motion.button>

      {/* 筛选面板 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full mt-2 right-0 w-96 bg-background-secondary border border-white/10 rounded-xl shadow-2xl p-6 space-y-6 z-10"
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
                <ImageIcon size={16} weight="duotone" />
                <span>素材类型</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleTypeChange(undefined)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${
                    !filter.type
                      ? 'bg-primary text-white'
                      : 'bg-background-tertiary hover:bg-white/5'
                  }`}
                >
                  全部
                </button>
                <button
                  onClick={() => handleTypeChange('image')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-1 ${
                    filter.type === 'image'
                      ? 'bg-primary text-white'
                      : 'bg-background-tertiary hover:bg-white/5'
                  }`}
                >
                  <ImageIcon size={16} weight="duotone" />
                  图片
                </button>
                <button
                  onClick={() => handleTypeChange('video')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-1 ${
                    filter.type === 'video'
                      ? 'bg-primary text-white'
                      : 'bg-background-tertiary hover:bg-white/5'
                  }`}
                >
                  <VideoCamera size={16} weight="duotone" />
                  视频
                </button>
              </div>
            </div>

            {/* 地点筛选 */}
            <div>
              <div className="flex items-center gap-2 mb-3 text-sm text-foreground-secondary">
                <MapPin size={16} weight="duotone" />
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

            {/* 标签筛选 */}
            <div>
              <div className="flex items-center gap-2 mb-3 text-sm text-foreground-secondary">
                <Tag size={16} weight="duotone" />
                <span>标签</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleTagToggle(tag)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      filter.tags?.includes(tag)
                        ? 'bg-primary text-white'
                        : 'bg-background-tertiary hover:bg-white/5'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* 排序方式 */}
            <div>
              <div className="flex items-center gap-2 mb-3 text-sm text-foreground-secondary">
                <SortAscending size={16} weight="duotone" />
                <span>排序方式</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleSortChange('shotAt')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${
                    filter.sortBy === 'shotAt' || !filter.sortBy
                      ? 'bg-primary text-white'
                      : 'bg-background-tertiary hover:bg-white/5'
                  }`}
                >
                  拍摄时间
                </button>
                <button
                  onClick={() => handleSortChange('createdAt')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${
                    filter.sortBy === 'createdAt'
                      ? 'bg-primary text-white'
                      : 'bg-background-tertiary hover:bg-white/5'
                  }`}
                >
                  添加时间
                </button>
                <button
                  onClick={() => handleSortChange('aiScore')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${
                    filter.sortBy === 'aiScore'
                      ? 'bg-primary text-white'
                      : 'bg-background-tertiary hover:bg-white/5'
                  }`}
                >
                  AI 评分
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
