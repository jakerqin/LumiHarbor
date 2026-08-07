'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { X, MapPin, Calendar, Image as ImageIcon } from 'lucide-react';
import { mapApi } from '@/lib/api/map';

interface FootprintDetailProps {
  footprintId: string | null;
  onClose: () => void;
}

export function FootprintDetail({ footprintId, onClose }: FootprintDetailProps) {
  const router = useRouter();
  const { data: detail, isLoading } = useQuery({
    queryKey: ['footprint-detail', footprintId],
    queryFn: () => mapApi.getFootprintDetail(footprintId!),
    enabled: !!footprintId,
  });

  if (!footprintId) return null;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 animate-in slide-in-from-bottom duration-300 pb-16 md:pb-4">
      <div className="mx-4 mb-4 rounded-2xl overflow-hidden glass">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-3 min-w-0">
            <MapPin className="w-5 h-5 text-primary shrink-0" />
            {isLoading ? (
              <div className="h-5 w-32 bg-white/10 rounded animate-pulse" />
            ) : (
              <div className="min-w-0">
                <h3 className="font-heading font-semibold text-foreground truncate">
                  {detail?.location_city || detail?.location_country || '未知地点'}
                </h3>
                {detail?.location_formatted && (
                  <p className="text-xs text-foreground-secondary mt-0.5 truncate">
                    {detail.location_formatted}
                  </p>
                )}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors shrink-0"
            aria-label="关闭"
          >
            <X className="w-4 h-4 text-foreground-secondary" />
          </button>
        </div>

        <div className="px-5 py-4 max-h-[35vh] overflow-y-auto">
          {isLoading ? (
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-square bg-white/10 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : detail?.assets && detail.assets.length > 0 ? (
            <div className="grid grid-cols-4 gap-2">
              {detail.assets.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => router.push(`/assets/${asset.id}`)}
                  className="aspect-square rounded-lg overflow-hidden hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  <img
                    src={asset.thumbnail_url}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-foreground-secondary text-center py-4">暂无照片</p>
          )}
        </div>

        {detail && (
          <div className="flex items-center gap-4 px-5 py-3 border-t border-white/10 text-xs text-foreground-secondary">
            <span className="flex items-center gap-1 tabular-nums">
              <ImageIcon className="w-3.5 h-3.5" />
              {detail.asset_count} 张
            </span>
            <span className="flex items-center gap-1 tabular-nums">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(detail.first_shot_at).toLocaleDateString('zh-CN')}
              {detail.first_shot_at !== detail.last_shot_at &&
                ` - ${new Date(detail.last_shot_at).toLocaleDateString('zh-CN')}`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
