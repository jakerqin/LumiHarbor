'use client';

import { useRef } from 'react';
import { Video, MapPin, Calendar, Tag } from 'lucide-react';
import type { Asset } from '@/lib/api/types';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { createHoverLiftHandlers } from '@/lib/utils/gsap';

interface AssetCardProps {
  asset: Asset;
  onClick?: () => void;
}

export function AssetCard({ asset, onClick }: AssetCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const hoverHandlers = createHoverLiftHandlers(cardRef.current);

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      {...hoverHandlers}
      className="group cursor-pointer"
    >
      <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-background-secondary">
        <img
          src={asset.thumbnailUrl}
          alt=""
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
        />

        {/* 视频标识 */}
        {asset.type === 'video' && (
          <div className="absolute top-3 right-3 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-lg flex items-center gap-1">
            <Video size={16} className="text-accent-purple" />
            <span className="text-xs text-white">视频</span>
          </div>
        )}

        {/* AI 评分 */}
        {asset.aiScore && asset.aiScore >= 0.9 && (
          <div className="absolute top-3 left-3 px-2 py-1 bg-gradient-to-r from-accent-blue to-accent-purple backdrop-blur-sm rounded-lg">
            <span className="text-xs text-white font-medium">精选</span>
          </div>
        )}

        {/* Hover 信息覆盖层 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
            {/* 地点 */}
            {asset.location && (
              <div className="flex items-center gap-2 text-white">
                <MapPin size={16} />
                <span className="text-sm font-medium">{asset.location.name}</span>
              </div>
            )}

            {/* 日期 */}
            <div className="flex items-center gap-2 text-white/80">
              <Calendar size={16} />
              <span className="text-xs">
                {format(new Date(asset.shotAt), 'PPP', { locale: zhCN })}
              </span>
            </div>

            {/* 标签 */}
            {asset.tags && asset.tags.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <Tag size={16} className="text-white/80" />
                {asset.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 bg-white/20 backdrop-blur-sm rounded text-xs text-white"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
