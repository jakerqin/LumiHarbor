'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { X, MapPin, Calendar, Image as ImageIcon } from 'lucide-react';
import { mapApi } from '@/lib/api/map';
import { cn } from '@/lib/utils/cn';

interface FootprintDetailProps {
  footprintId: string | null;
  onClose: () => void;
}

const ANIMATION_MS = 300;

/** 浅色底图上的详情抽屉：不透明暖色底，保证标题与元信息可读 */
export function FootprintDetail({ footprintId, onClose }: FootprintDetailProps) {
  const router = useRouter();
  const [renderedId, setRenderedId] = useState<string | null>(null);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (footprintId) {
      setRenderedId(footprintId);
      setExiting(false);
      return;
    }
    if (renderedId) {
      setExiting(true);
    }
  }, [footprintId, renderedId]);

  useEffect(() => {
    if (!exiting) return;
    const timer = window.setTimeout(() => {
      setRenderedId(null);
      setExiting(false);
    }, ANIMATION_MS);
    return () => window.clearTimeout(timer);
  }, [exiting]);

  const { data: detail, isLoading } = useQuery({
    queryKey: ['footprint-detail', renderedId],
    queryFn: () => mapApi.getFootprintDetail(renderedId!),
    enabled: !!renderedId,
  });

  if (!renderedId) return null;

  return (
    <div
      className="absolute inset-0 z-20"
      onClick={exiting ? undefined : onClose}
      role="presentation"
    >
      <div
        className={cn(
          'absolute inset-x-0 bottom-0 flex h-[90dvh] flex-col pb-16 md:pb-4 pointer-events-none duration-300',
          exiting
            ? 'animate-out slide-out-to-bottom fill-mode-forwards'
            : 'animate-in slide-in-from-bottom'
        )}
      >
        <div
          className="mx-4 mb-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#e4d4bc] bg-[#fffaf3]/96 shadow-lg shadow-stone-900/15 backdrop-blur-md pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-[#e4d4bc] px-5 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <MapPin className="h-5 w-5 shrink-0 text-[#a67c4a]" />
              {isLoading ? (
                <div className="h-5 w-32 animate-pulse rounded bg-[#e4d4bc]/80" />
              ) : (
                <div className="min-w-0">
                  <h3 className="truncate font-heading font-semibold text-[#3d3428]">
                    {detail?.location_city || detail?.location_country || '未知地点'}
                  </h3>
                  {detail?.location_formatted && (
                    <p className="mt-0.5 truncate text-xs text-[#8a7a66]">
                      {detail.location_formatted}
                    </p>
                  )}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={exiting}
              className="shrink-0 rounded-lg p-1.5 text-[#8a7a66] transition-colors hover:bg-[#f0e4d0] hover:text-[#3d3428] disabled:pointer-events-none"
              aria-label="关闭"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {isLoading ? (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="aspect-square animate-pulse rounded-lg bg-[#e4d4bc]/80" />
                ))}
              </div>
            ) : detail?.assets && detail.assets.length > 0 ? (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                {detail.assets.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => router.push(`/assets/${asset.id}`)}
                    className="aspect-square overflow-hidden rounded-lg transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a67c4a]/50"
                  >
                    <img
                      src={asset.thumbnail_url}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-[#8a7a66]">暂无照片</p>
            )}
          </div>

          {detail && (
            <div className="flex shrink-0 items-center gap-4 border-t border-[#e4d4bc] px-5 py-3 text-xs text-[#8a7a66]">
              <span className="flex items-center gap-1 tabular-nums">
                <ImageIcon className="h-3.5 w-3.5" />
                {detail.asset_count} 张
              </span>
              <span className="flex items-center gap-1 tabular-nums">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(detail.first_shot_at).toLocaleDateString('zh-CN')}
                {detail.first_shot_at !== detail.last_shot_at &&
                  ` - ${new Date(detail.last_shot_at).toLocaleDateString('zh-CN')}`}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
