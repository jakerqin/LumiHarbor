'use client';

import { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { AssetFilterBar } from '@/components/assets/AssetFilterBar';
import { AssetGrid } from '@/components/assets/AssetGrid';
import { assetsApi, type AssetsFilter } from '@/lib/api/assets';
import type { Asset } from '@/lib/api/types';

interface AssetPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect?: (asset: Asset) => void;
  onMultiSelect?: (assets: Asset[]) => void;
  title?: string;
  description?: string;
  multiSelect?: boolean;
}

export function AssetPickerModal({
  open,
  onClose,
  onSelect,
  onMultiSelect,
  title = '选择素材',
  description,
  multiSelect = false,
}: AssetPickerModalProps) {
  const [filter, setFilter] = useState<AssetsFilter>({});
  const [selectedAssets, setSelectedAssets] = useState<Map<number, Asset>>(new Map());

  const { data: locations = [] } = useQuery({
    queryKey: ['asset-locations'],
    queryFn: () => assetsApi.getLocations(),
    staleTime: 5 * 60 * 1000, // 5 分钟缓存（地点数据相对静态）
    enabled: open,
  });

  // 重置选择状态
  useEffect(() => {
    if (!open) {
      setSelectedAssets(new Map());
    }
  }, [open]);

  const handleAssetClick = (asset: Asset) => {
    if (multiSelect) {
      // 多选模式：切换选择状态
      setSelectedAssets((prev) => {
        const next = new Map(prev);
        if (next.has(asset.id)) {
          next.delete(asset.id);
        } else {
          next.set(asset.id, asset);
        }
        return next;
      });
    } else {
      // 单选模式：直接回调并关闭
      onSelect?.(asset);
      onClose();
    }
  };

  const handleConfirm = () => {
    if (multiSelect && onMultiSelect) {
      onMultiSelect(Array.from(selectedAssets.values()));
      onClose();
    }
  };

  if (!open) return null;

  const selectedIds = new Set(selectedAssets.keys());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal 内容 */}
      <div className="relative w-[90vw] max-w-[1400px] h-[85vh] rounded-2xl bg-background-secondary/95 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h2 className="text-xl font-semibold">{title}</h2>
            {description && (
              <p className="text-sm text-foreground-secondary mt-1">
                {description}
              </p>
            )}
            {multiSelect && selectedAssets.size > 0 && (
              <p className="text-sm text-foreground-secondary mt-1">
                已选择 {selectedAssets.size} 项
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
            aria-label="关闭"
          >
            <X size={20} />
          </button>
        </div>

        {/* 筛选栏 */}
        <div className="px-6 py-4 border-b border-white/10">
          <AssetFilterBar
            filter={filter}
            locations={locations}
            onChange={setFilter}
          />
        </div>

        {/* 素材网格 */}
        <div className="flex-1 overflow-y-auto px-6 py-4 dropdown-scrollbar">
          <AssetGrid
            filter={filter}
            onAssetSelect={!multiSelect ? handleAssetClick : undefined}
            selectionMode={multiSelect}
            selectedAssetIds={selectedIds}
            onSelectionToggle={multiSelect ? handleAssetClick : undefined}
          />
        </div>

        {/* 底部操作栏（仅多选模式） */}
        {multiSelect && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl text-sm text-foreground-secondary hover:text-foreground hover:bg-white/5 transition-colors"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={selectedAssets.size === 0}
              className="px-6 py-2.5 rounded-xl text-sm bg-primary hover:bg-primary-hover text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Check size={16} />
              确认选择 ({selectedAssets.size})
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
