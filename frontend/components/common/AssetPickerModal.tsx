'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { AssetFilterBar } from '@/components/assets/AssetFilterBar';
import { AssetGrid } from '@/components/assets/AssetGrid';
import { assetsApi, type AssetsFilter } from '@/lib/api/assets';
import type { Asset } from '@/lib/api/types';

interface AssetPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (asset: Asset) => void;
  title?: string;
}

export function AssetPickerModal({
  open,
  onClose,
  onSelect,
  title = '选择素材',
}: AssetPickerModalProps) {
  const [filter, setFilter] = useState<AssetsFilter>({});

  const { data: locations = [] } = useQuery({
    queryKey: ['asset-locations'],
    queryFn: () => assetsApi.getLocations(),
    enabled: open,
  });

  const handleAssetSelect = (asset: Asset) => {
    onSelect(asset);
    onClose();
  };

  if (!open) return null;

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
          <h2 className="text-xl font-semibold">{title}</h2>
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
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <AssetGrid
            filter={filter}
            onAssetSelect={handleAssetSelect}
          />
        </div>
      </div>
    </div>
  );
}
