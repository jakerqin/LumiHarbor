'use client';

import { useQuery } from '@tanstack/react-query';
import { X, MapPin, Calendar, Image as ImageIcon } from 'lucide-react';
import { mapApi } from '@/lib/api/map';

interface FootprintDetailProps {
  footprintId: string | null;
  onClose: () => void;
}

export function FootprintDetail({ footprintId, onClose }: FootprintDetailProps) {
  const { data: detail, isLoading } = useQuery({
    queryKey: ['footprint-detail', footprintId],
    queryFn: () => mapApi.getFootprintDetail(footprintId!),
    enabled: !!footprintId,
  });

  if (!footprintId) return null;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 animate-in slide-in-from-bottom duration-300">
      <div
        className="mx-4 mb-4 rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-blue-400" />
            {isLoading ? (
              <div className="h-5 w-32 bg-white/10 rounded animate-pulse" />
            ) : (
              <div>
                <h3 className="font-heading font-semibold text-foreground">
                  {detail?.location_city || detail?.location_country || '未知地点'}
                </h3>
                {detail?.location_formatted && (
                  <p className="text-xs text-foreground-secondary mt-0.5">
                    {detail.location_formatted}
                  </p>
                )}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 text-foreground-secondary" />
          </button>
        </div>

        {/* 照片网格 */}
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
                <div
                  key={asset.id}
                  className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <img
                    src={asset.thumbnail_url}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-foreground-secondary text-center py-4">暂无照片</p>
          )}
        </div>

        {/* 底部统计 */}
        {detail && (
          <div className="flex items-center gap-4 px-5 py-3 border-t border-white/10 text-xs text-foreground-secondary">
            <span className="flex items-center gap-1">
              <ImageIcon className="w-3.5 h-3.5" />
              {detail.asset_count} 张
            </span>
            <span className="flex items-center gap-1">
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
