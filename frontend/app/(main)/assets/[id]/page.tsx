'use client';

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Calendar,
  Hash,
  Image as ImageIcon,
  Info,
  MapPin,
  Music,
  Video,
} from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { assetsApi, type SimilarAsset } from '@/lib/api/assets';
import type { Asset } from '@/lib/api/types';

function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '-';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, index);
  const fixed = value >= 100 || index === 0 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(fixed)} ${units[index]}`;
}

function getAssetTypeMeta(assetType: Asset['asset_type']) {
  switch (assetType) {
    case 'video':
      return { Icon: Video, label: '视频', className: 'text-accent-purple' };
    case 'audio':
      return { Icon: Music, label: '音频', className: 'text-accent-green' };
    case 'image':
    default:
      return { Icon: ImageIcon, label: '图片', className: 'text-accent-blue' };
  }
}

function formatTagKey(key: string) {
  return key.replaceAll('_', ' ');
}

export default function AssetDetailPage() {
  const router = useRouter();
  const params = useParams();
  const assetId = Number(params.id);

  const assetQuery = useQuery({
    queryKey: ['asset', assetId],
    queryFn: () => assetsApi.getAsset(assetId),
    enabled: Number.isFinite(assetId),
  });

  const tagsQuery = useQuery({
    queryKey: ['asset-tags', assetId],
    queryFn: () => assetsApi.getAssetTags(assetId),
    enabled: Number.isFinite(assetId),
  });

  const similarQuery = useQuery({
    queryKey: ['asset-similar', assetId],
    queryFn: () => assetsApi.getSimilarAssets(assetId, { limit: 12 }),
    enabled: Number.isFinite(assetId),
  });

  const asset = assetQuery.data;

  const tagsEntries = useMemo(() => {
    const tags = tagsQuery.data ?? {};
    return Object.entries(tags)
      .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== '')
      .sort(([a], [b]) => a.localeCompare(b));
  }, [tagsQuery.data]);

  const similarAssets = similarQuery.data?.assets ?? [];

  if (!Number.isFinite(assetId)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-8">
        <div className="text-center">
          <p className="text-xl text-foreground-secondary">无效的素材 ID</p>
        </div>
      </div>
    );
  }

  if (assetQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-8">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4 mx-auto" />
          <p className="text-foreground-secondary">加载素材详情中...</p>
        </div>
      </div>
    );
  }

  if (assetQuery.isError || !asset) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-8">
        <div className="text-center">
          <p className="text-xl text-red-500 mb-2">加载失败</p>
          <p className="text-foreground-secondary mb-6">素材不存在或网络错误</p>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 rounded-xl bg-background-secondary border border-white/10 text-white hover:bg-background-tertiary transition-colors"
          >
            返回
          </button>
        </div>
      </div>
    );
  }

  const typeMeta = getAssetTypeMeta(asset.asset_type);
  const originalUrl = asset.original_url || asset.thumbnail_url || '/placeholder-image.jpg';
  const locationText = [asset.location_city, asset.location_poi].filter(Boolean).join(' · ');

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1920px] mx-auto px-6 md:px-8 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-background-secondary border border-white/10 text-white hover:bg-background-tertiary transition-colors"
          >
            <ArrowLeft size={18} />
            返回
          </button>

          <div className="flex items-center gap-3 text-foreground-secondary">
            <typeMeta.Icon size={18} className={typeMeta.className} />
            <span className="text-sm">{typeMeta.label}</span>
          </div>
        </div>

        {/* Main */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Media */}
          <div className="lg:col-span-8">
            <div className="rounded-2xl overflow-hidden bg-black/30 border border-white/10">
              {asset.asset_type === 'video' ? (
                <video
                  key={originalUrl}
                  src={originalUrl}
                  poster={asset.thumbnail_url ?? undefined}
                  controls
                  playsInline
                  className="w-full max-h-[70vh] bg-black"
                />
              ) : asset.asset_type === 'audio' ? (
                <div className="p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <Music size={20} className="text-accent-green" />
                    <span className="text-white font-medium">音频播放</span>
                  </div>
                  <audio key={originalUrl} src={originalUrl} controls className="w-full" />
                </div>
              ) : (
                <img
                  src={originalUrl}
                  alt=""
                  className="w-full max-h-[70vh] object-contain bg-black"
                />
              )}
            </div>

            {/* Similar */}
            <div className="mt-10">
              <div className="flex items-center gap-2 mb-4">
                <Hash size={18} className="text-foreground-secondary" />
                <h2 className="text-lg font-heading font-semibold">相似推荐</h2>
                <span className="text-sm text-foreground-tertiary">（基于 phash）</span>
              </div>

              {similarQuery.isLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div
                      key={i}
                      className="aspect-square rounded-xl bg-background-secondary border border-white/5 animate-pulse"
                    />
                  ))}
                </div>
              ) : similarAssets.length === 0 ? (
                <div className="rounded-2xl bg-background-secondary border border-white/10 p-6">
                  <p className="text-sm text-foreground-secondary">
                    {similarQuery.data?.has_phash === false
                      ? '该素材尚未生成相似特征（phash），请稍后再试。'
                      : '暂无相似素材推荐。'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
                  {similarAssets.map((item) => (
                    <SimilarAssetTile
                      key={item.id}
                      asset={item}
                      onClick={() => router.push(`/assets/${item.id}`)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Side */}
          <div className="lg:col-span-4 space-y-6">
            {/* Info */}
            <div className="rounded-2xl bg-background-secondary border border-white/10 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Info size={18} className="text-foreground-secondary" />
                <h2 className="text-lg font-heading font-semibold">素材信息</h2>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-foreground-tertiary">ID</span>
                  <span className="text-foreground font-mono">#{asset.id}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-foreground-tertiary">类型</span>
                  <span className="text-foreground">{typeMeta.label}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-foreground-tertiary">MIME</span>
                  <span className="text-foreground">{asset.mime_type || '-'}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-foreground-tertiary">大小</span>
                  <span className="text-foreground">{formatFileSize(asset.file_size)}</span>
                </div>
                {asset.shot_at && (
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-foreground-tertiary flex items-center gap-2">
                      <Calendar size={14} />
                      拍摄时间
                    </span>
                    <span className="text-foreground">
                      {format(new Date(asset.shot_at), 'PPP', { locale: zhCN })}
                    </span>
                  </div>
                )}
                {locationText && (
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-foreground-tertiary flex items-center gap-2">
                      <MapPin size={14} />
                      地点
                    </span>
                    <span className="text-foreground text-right">{locationText}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Tags */}
            <div className="rounded-2xl bg-background-secondary border border-white/10 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Hash size={18} className="text-foreground-secondary" />
                <h2 className="text-lg font-heading font-semibold">标签</h2>
              </div>

              {tagsQuery.isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-12 rounded-xl bg-background-tertiary border border-white/5 animate-pulse"
                    />
                  ))}
                </div>
              ) : tagsEntries.length === 0 ? (
                <p className="text-sm text-foreground-secondary">暂无标签信息</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {tagsEntries.map(([key, value]) => (
                    <div
                      key={key}
                      className="rounded-xl bg-background-tertiary border border-white/5 p-3"
                    >
                      <p className="text-xs text-foreground-tertiary mb-1">
                        {formatTagKey(key)}
                      </p>
                      <p className="text-sm text-foreground break-words">{String(value)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SimilarAssetTile({
  asset,
  onClick,
}: {
  asset: SimilarAsset;
  onClick: () => void;
}) {
  const typeMeta = getAssetTypeMeta(asset.asset_type);
  const thumbnailUrl = asset.thumbnail_url || '/placeholder-image.jpg';
  const similarityLabel = `${Math.round(asset.similarity)}%`;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative aspect-square rounded-xl overflow-hidden bg-background-secondary border border-white/10 hover:border-white/20 transition-colors text-left"
    >
      <img
        src={thumbnailUrl}
        alt=""
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
      />

      <div className="absolute top-2 left-2 w-7 h-7 rounded-full bg-black/35 backdrop-blur-sm border border-white/10 flex items-center justify-center">
        <typeMeta.Icon size={14} className={typeMeta.className} />
      </div>

      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
        <span className="px-2 py-1 rounded-lg bg-black/35 backdrop-blur-sm border border-white/10 text-xs text-white/90">
          {similarityLabel}
        </span>
        {asset.is_favorited && (
          <span className="px-2 py-1 rounded-lg bg-black/35 backdrop-blur-sm border border-white/10 text-xs text-white/90">
            已收藏
          </span>
        )}
      </div>
    </button>
  );
}

