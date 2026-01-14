'use client';

import { useMemo, type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  Download,
  ExternalLink,
  Hash,
  Heart,
  Image as ImageIcon,
  Info,
  Music,
  RefreshCw,
  Video,
} from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { assetsApi, type SimilarAsset } from '@/lib/api/assets';
import type { Asset } from '@/lib/api/types';
import { useTagDefinitions } from '@/lib/hooks/useTagDefinitions';
import { cn } from '@/lib/utils/cn';
import { ImageViewer } from '@/components/assets/ImageViewer';

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

function resolveMediaUrl(url?: string | null, path?: string | null) {
  const cleanedUrl = url?.trim();
  if (cleanedUrl) return cleanedUrl;

  const cleanedPath = path?.trim();
  if (!cleanedPath) return null;
  if (/^https?:\/\//i.test(cleanedPath)) return cleanedPath;

  const baseUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
  const normalizedPath = cleanedPath.startsWith('/') ? cleanedPath : `/${cleanedPath}`;
  return `${baseUrl}${normalizedPath}`;
}

/**
 * 获取用于显示的媒体 URL
 * 优先使用预览图（用于 HEIC 等浏览器不支持的格式），否则使用原图
 */
function getDisplayUrl(asset: Asset): string {
  // 优先使用预览图（如果存在，说明原图是 HEIC 等浏览器不支持的格式）
  const previewUrl = resolveMediaUrl(asset.preview_url, null);
  if (previewUrl) return previewUrl;

  // 否则使用原图
  const originalUrl = resolveMediaUrl(asset.original_url, asset.original_path);
  if (originalUrl) return originalUrl;

  // 最后回退到缩略图
  return resolveMediaUrl(asset.thumbnail_url, asset.thumbnail_path) || '/placeholder-image.jpg';
}

function Pill({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs text-foreground-secondary border border-white/10',
        className
      )}
    >
      {children}
    </span>
  );
}

function AssetDetailSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1920px] mx-auto px-6 md:px-8 py-10 pb-24">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="h-10 w-24 rounded-xl bg-background-secondary border border-white/10 animate-pulse" />
            <div className="space-y-2">
              <div className="h-8 w-56 rounded-lg bg-background-secondary border border-white/10 animate-pulse" />
              <div className="flex items-center gap-2">
                <div className="h-6 w-20 rounded-full bg-background-secondary border border-white/10 animate-pulse" />
                <div className="h-6 w-32 rounded-full bg-background-secondary border border-white/10 animate-pulse" />
                <div className="h-6 w-28 rounded-full bg-background-secondary border border-white/10 animate-pulse" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 justify-end">
            <div className="h-10 w-10 rounded-xl bg-background-secondary border border-white/10 animate-pulse" />
            <div className="h-10 w-24 rounded-xl bg-background-secondary border border-white/10 animate-pulse" />
            <div className="h-10 w-24 rounded-xl bg-background-secondary border border-white/10 animate-pulse" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-8">
            <div className="h-[62vh] rounded-2xl bg-background-secondary border border-white/10 animate-pulse" />
            <div>
              <div className="h-6 w-36 rounded-lg bg-background-secondary border border-white/10 animate-pulse mb-4" />
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-square rounded-xl bg-background-secondary border border-white/5 animate-pulse"
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="h-72 rounded-2xl bg-background-secondary border border-white/10 animate-pulse" />
            <div className="h-[520px] rounded-2xl bg-background-secondary border border-white/10 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AssetDetailPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const idParam = Array.isArray(params.id) ? params.id[0] : params.id;
  const assetId = Number(idParam);

  const favoriteMutation = useMutation({
    mutationFn: async (nextFavorited: boolean) => {
      if (!Number.isFinite(assetId)) return;
      if (nextFavorited) {
        await assetsApi.favorite(assetId);
        return;
      }
      await assetsApi.unfavorite(assetId);
    },
    onMutate: async (nextFavorited: boolean) => {
      await queryClient.cancelQueries({ queryKey: ['asset', assetId] });
      const previousAsset = queryClient.getQueryData<Asset>(['asset', assetId]);

      if (previousAsset) {
        queryClient.setQueryData<Asset>(['asset', assetId], {
          ...previousAsset,
          is_favorited: nextFavorited,
        });
      }

      return { previousAsset };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousAsset) {
        queryClient.setQueryData(['asset', assetId], context.previousAsset);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['asset', assetId] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['featured-assets'] });
    },
  });

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

  const tagDefinitionsQuery = useTagDefinitions();

  const similarQuery = useQuery({
    queryKey: ['asset-similar', assetId],
    queryFn: () => assetsApi.getSimilarAssets(assetId, { limit: 12 }),
    enabled: Number.isFinite(assetId),
  });

  const asset = assetQuery.data;

  const tagsEntries = useMemo(() => {
    const tags = tagsQuery.data ?? {};
    const tagNameByKey = tagDefinitionsQuery.tagNameByKey;
    return Object.entries(tags)
      .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== '')
      .map(([key, value]) => ({
        key,
        name: tagNameByKey.get(key) ?? formatTagKey(key),
        value: String(value),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));
  }, [tagDefinitionsQuery.tagNameByKey, tagsQuery.data]);

  const similarAssets = similarQuery.data?.assets ?? [];

  if (!Number.isFinite(assetId)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="w-full max-w-md rounded-2xl bg-background-secondary border border-white/10 p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={26} className="text-foreground-secondary" />
          </div>
          <h1 className="text-2xl font-heading font-semibold mb-2">无效的素材 ID</h1>
          <p className="text-sm text-foreground-secondary mb-6">请检查链接是否正确。</p>

          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => router.push('/assets')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              返回素材库
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
            >
              <ArrowLeft size={16} />
              返回
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (assetQuery.isLoading) {
    return <AssetDetailSkeleton />;
  }

  if (assetQuery.isError || !asset) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="w-full max-w-md rounded-2xl bg-background-secondary border border-white/10 p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={26} className="text-red-400" />
          </div>
          <h1 className="text-2xl font-heading font-semibold mb-2">加载失败</h1>
          <p className="text-sm text-foreground-secondary mb-6">素材不存在或网络错误</p>

          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => assetQuery.refetch()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <RefreshCw size={16} />
              重试
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
            >
              <ArrowLeft size={16} />
              返回
            </button>
          </div>
        </div>
      </div>
    );
  }

  const typeMeta = getAssetTypeMeta(asset.asset_type);
  const shotAtDate = asset.shot_at ? new Date(asset.shot_at) : null;
  const shotAtText = shotAtDate ? format(shotAtDate, 'PPP p', { locale: zhCN }) : '-';
  const createdAtText = format(new Date(asset.created_at), 'PPP p', { locale: zhCN });
  const displayUrl = getDisplayUrl(asset);
  const originalUrl =
    resolveMediaUrl(asset.original_url, asset.original_path) ||
    resolveMediaUrl(asset.thumbnail_url, asset.thumbnail_path) ||
    '/placeholder-image.jpg';
  const thumbnailUrl =
    resolveMediaUrl(asset.thumbnail_url, asset.thumbnail_path) || '/placeholder-image.jpg';
  const locationText = [asset.location_city, asset.location_poi].filter(Boolean).join(' · ');
  const canOpenOriginal = originalUrl !== '/placeholder-image.jpg';
  const headerTitle =
    locationText ||
    (shotAtDate ? format(shotAtDate, 'PPP', { locale: zhCN }) : `${typeMeta.label}详情`);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1920px] mx-auto px-6 md:px-8 py-10 pb-24">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
            >
              <ArrowLeft size={18} />
              返回
            </button>

            <div className="min-w-0">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <typeMeta.Icon size={18} className={typeMeta.className} />
                </div>
                <div className="min-w-0">
                  <h1 className="text-2xl md:text-3xl font-heading font-bold leading-tight truncate">
                    {headerTitle}
                  </h1>
                  <p className="mt-1 text-sm text-foreground-secondary truncate">
                    {typeMeta.label} · {formatFileSize(asset.file_size)} ·{' '}
                    {shotAtDate ? `拍摄于 ${shotAtText}` : `创建于 ${createdAtText}`}
                  </p>
                </div>
              </div>

              {asset.is_favorited && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Pill className="text-red-300 border-red-500/20 bg-red-500/10">
                    <Heart size={14} className="fill-red-500 text-red-500" />
                    已收藏
                  </Pill>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={() => favoriteMutation.mutate(!asset.is_favorited)}
              disabled={favoriteMutation.isPending}
              className={cn(
                'inline-flex items-center justify-center w-10 h-10 rounded-xl border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-60 disabled:cursor-not-allowed',
                asset.is_favorited
                  ? 'bg-red-500/10 hover:bg-red-500/20 border-red-500/20'
                  : 'bg-white/5 hover:bg-white/10 border-white/10'
              )}
              aria-label={asset.is_favorited ? '取消收藏' : '收藏'}
            >
              <Heart
                size={18}
                className={cn(
                  'transition-colors',
                  asset.is_favorited ? 'fill-red-500 text-red-500' : 'text-foreground-secondary'
                )}
              />
            </button>

            <a
              href={canOpenOriginal ? originalUrl : undefined}
              target="_blank"
              rel="noreferrer"
              className={cn(
                'inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30',
                !canOpenOriginal && 'pointer-events-none opacity-50'
              )}
            >
              <ExternalLink size={18} className="text-foreground-secondary" />
              <span className="text-sm hidden sm:inline">打开</span>
            </a>

            <a
              href={canOpenOriginal ? originalUrl : undefined}
              download
              className={cn(
                'inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30',
                !canOpenOriginal && 'pointer-events-none opacity-50'
              )}
            >
              <Download size={18} className="text-foreground-secondary" />
              <span className="text-sm hidden sm:inline">下载</span>
            </a>
          </div>
        </div>

        {/* Main */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Media */}
          <div className="lg:col-span-8">
            <div className="rounded-2xl overflow-hidden bg-black/30 border border-white/10 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
              {asset.asset_type === 'video' ? (
                <video
                  key={originalUrl}
                  src={originalUrl}
                  poster={thumbnailUrl !== '/placeholder-image.jpg' ? thumbnailUrl : undefined}
                  controls
                  playsInline
                  className="w-full max-h-[72vh] bg-black"
                />
              ) : asset.asset_type === 'audio' ? (
                <div className="p-8 bg-gradient-to-b from-black/30 to-black/10">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                      <Music size={18} className="text-accent-green" />
                    </div>
                    <div>
                      <p className="text-foreground font-medium leading-tight">音频播放</p>
                      <p className="text-xs text-foreground-tertiary">支持后台播放与快进/快退</p>
                    </div>
                  </div>
                  <audio key={originalUrl} src={originalUrl} controls className="w-full" />
                </div>
              ) : (
                <ImageViewer
                  src={displayUrl}
                  alt={`素材 ${asset.id}`}
                />
              )}
            </div>

            {/* Similar */}
            <div className="mt-10">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Hash size={18} className="text-foreground-secondary" />
                  <h2 className="text-lg font-heading font-semibold">相似推荐</h2>
                  <span className="text-sm text-foreground-tertiary">（基于 phash）</span>
                </div>
                {!similarQuery.isLoading && !similarQuery.isError && similarAssets.length > 0 && (
                  <span className="text-xs text-foreground-tertiary">
                    {similarAssets.length} 个结果
                  </span>
                )}
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
              ) : similarQuery.isError ? (
                <div className="rounded-2xl bg-background-secondary border border-white/10 p-6">
                  <p className="text-sm text-foreground-secondary">相似推荐加载失败，请稍后重试。</p>
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
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-10 h-fit">
            {/* Info */}
            <div className="rounded-2xl bg-background-secondary border border-white/10 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Info size={18} className="text-foreground-secondary" />
                <h2 className="text-lg font-heading font-semibold">素材信息</h2>
              </div>

              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <dt className="text-xs text-foreground-tertiary">类型</dt>
                  <dd className="text-foreground">{typeMeta.label}</dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-xs text-foreground-tertiary">大小</dt>
                  <dd className="text-foreground">{formatFileSize(asset.file_size)}</dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-xs text-foreground-tertiary">拍摄时间</dt>
                  <dd className="text-foreground">{shotAtText}</dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-xs text-foreground-tertiary">创建时间</dt>
                  <dd className="text-foreground">{createdAtText}</dd>
                </div>
                {locationText && (
                  <div className="space-y-1 sm:col-span-2">
                    <dt className="text-xs text-foreground-tertiary">地点</dt>
                    <dd className="text-foreground break-words">{locationText}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Tags */}
            <div className="rounded-2xl bg-background-secondary border border-white/10 p-6">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Hash size={18} className="text-foreground-secondary" />
                  <h2 className="text-lg font-heading font-semibold">标签</h2>
                </div>
                {!tagsQuery.isLoading && !tagsQuery.isError && tagsEntries.length > 0 && (
                  <span className="text-xs text-foreground-tertiary">
                    {tagsEntries.length} 条
                  </span>
                )}
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
              ) : tagsQuery.isError ? (
                <p className="text-sm text-foreground-secondary">标签加载失败，请稍后重试。</p>
              ) : tagsEntries.length === 0 ? (
                <p className="text-sm text-foreground-secondary">暂无标签信息</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {tagsEntries.map((tag) => (
                    <div
                      key={tag.key}
                      className="rounded-xl bg-background-tertiary border border-white/5 p-3"
                    >
                      <p className="text-xs text-foreground-tertiary mb-1">
                        {tag.name}
                      </p>
                      <p className="text-sm text-foreground break-words">{tag.value}</p>
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
  const thumbnailUrl =
    resolveMediaUrl(asset.thumbnail_url, asset.thumbnail_path) || '/placeholder-image.jpg';
  const similarityLabel = `${Math.round(asset.similarity)}%`;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative aspect-square rounded-xl overflow-hidden bg-background-secondary border border-white/10 hover:border-white/20 hover:shadow-[0_18px_48px_rgba(0,0,0,0.35)] transition-[border-color,box-shadow] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      aria-label={`查看相似素材 #${asset.id}`}
    >
      <img
        src={thumbnailUrl}
        alt={`相似素材 ${asset.id}`}
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        loading="lazy"
      />

      <div className="absolute top-2 left-2 w-7 h-7 rounded-full bg-black/35 backdrop-blur-sm border border-white/10 flex items-center justify-center">
        <typeMeta.Icon size={14} className={typeMeta.className} />
      </div>

      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
        <span className="px-2 py-1 rounded-lg bg-black/35 backdrop-blur-sm border border-white/10 text-xs text-white/90">
          {similarityLabel}
        </span>
        {asset.is_favorited && (
          <span className="px-2 py-1 rounded-lg bg-black/35 backdrop-blur-sm border border-white/10 text-xs text-white/90 inline-flex items-center gap-1">
            <Heart size={12} className="fill-red-500 text-red-500" />
            已收藏
          </span>
        )}
      </div>
    </button>
  );
}
