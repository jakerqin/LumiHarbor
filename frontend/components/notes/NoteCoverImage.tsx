'use client';

import { useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { resolveMediaUrl } from '@/lib/utils/mediaUrl';
import type { Asset } from '@/lib/api/types';

interface NoteCoverImageProps {
  asset: Asset | null;
  onRemove: () => void;
  onReplace: () => void;
}

export function NoteCoverImage({ asset, onRemove, onReplace }: NoteCoverImageProps) {
  const [isHovered, setIsHovered] = useState(false);

  if (!asset) return null;

  const imageUrl = resolveMediaUrl(asset.thumbnail_url, asset.thumbnail_path);

  return (
    <div
      className="relative w-full h-64 bg-gray-100 overflow-hidden group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 封面图片 */}
      <img
        src={imageUrl || ''}
        alt="封面"
        className="w-full h-full object-cover"
      />

      {/* Hover 操作按钮 */}
      {isHovered && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-3">
          <button
            onClick={onReplace}
            className="flex items-center gap-2 px-4 py-2 bg-white text-gray-900 rounded-md hover:bg-gray-100 transition-colors"
          >
            <ImagePlus className="w-4 h-4" />
            更换封面
          </button>
          <button
            onClick={onRemove}
            className="flex items-center gap-2 px-4 py-2 bg-white text-gray-900 rounded-md hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
            移除封面
          </button>
        </div>
      )}
    </div>
  );
}
