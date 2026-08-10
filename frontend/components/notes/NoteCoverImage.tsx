'use client';

import { useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { CoverFocalEditor } from '@/components/albums/CoverFocalEditor';
import { resolveMediaUrl } from '@/lib/utils/mediaUrl';
import type { Asset } from '@/lib/api/types';

interface NoteCoverImageProps {
  asset: Asset | null;
  positionX: number;
  positionY: number;
  onPositionChange: (x: number, y: number) => void;
  onRemove: () => void;
  onReplace: () => void;
}

export function NoteCoverImage({
  asset,
  positionX,
  positionY,
  onPositionChange,
  onRemove,
  onReplace,
}: NoteCoverImageProps) {
  const [showActions, setShowActions] = useState(false);

  if (!asset) return null;

  const imageUrl =
    resolveMediaUrl(asset.preview_url) ||
    resolveMediaUrl(asset.original_url, asset.original_path) ||
    resolveMediaUrl(asset.thumbnail_url, asset.thumbnail_path);

  if (!imageUrl) return null;

  return (
    <div
      className="relative group"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <CoverFocalEditor
        src={imageUrl}
        alt="封面"
        positionX={positionX}
        positionY={positionY}
        onChange={onPositionChange}
        className="aspect-[16/7] w-full rounded-none"
      />

      {showActions && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-end gap-2 p-3">
          <button
            type="button"
            onClick={onReplace}
            className="pointer-events-auto inline-flex items-center gap-2 rounded-xl bg-black/55 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/70 active:scale-[0.98]"
          >
            <ImagePlus className="w-4 h-4" />
            更换
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="pointer-events-auto inline-flex items-center gap-2 rounded-xl bg-black/55 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/70 active:scale-[0.98]"
          >
            <X className="w-4 h-4" />
            移除
          </button>
        </div>
      )}
    </div>
  );
}
