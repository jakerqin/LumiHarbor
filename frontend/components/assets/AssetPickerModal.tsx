'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { AssetGrid } from '@/components/assets/AssetGrid';
import { AssetFilterBar } from '@/components/assets/AssetFilterBar';
import { assetsApi, type AssetsFilter } from '@/lib/api/assets';
import type { Asset } from '@/lib/api/types';

export interface AssetPickerModalProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  onSelect: (asset: Asset) => void;
}

export function AssetPickerModal({
  open,
  title,
  description,
  onClose,
  onSelect,
}: AssetPickerModalProps) {
  const [filter, setFilter] = useState<AssetsFilter>({});

  const { data: locations = [] } = useQuery({
    queryKey: ['asset-locations'],
    queryFn: () => assetsApi.getLocations(),
    staleTime: 5 * 60 * 1000,
    enabled: open,
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-label="关闭"
        onClick={onClose}
      />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-6xl max-h-[90vh] rounded-2xl bg-background border border-white/10 shadow-2xl overflow-hidden flex flex-col">
          <div className="flex items-start justify-between gap-4 p-5 border-b border-white/10">
            <div>
              <h2 className="text-lg font-heading font-semibold">{title}</h2>
              {description && (
                <p className="mt-1 text-sm text-foreground-secondary">{description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-9 w-9 inline-flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
              aria-label="关闭"
            >
              <X size={18} />
            </button>
          </div>

          <div className="px-5 pt-4 border-b border-white/10">
            <AssetFilterBar
              filter={filter}
              locations={locations}
              onChange={setFilter}
            />
          </div>

          <div className="p-5 overflow-auto">
            <AssetGrid
              filter={filter}
              onAssetSelect={(asset) => {
                onSelect(asset);
                onClose();
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

