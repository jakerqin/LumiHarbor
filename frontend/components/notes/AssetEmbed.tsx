'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Image as ImageIcon, Music, Video, ExternalLink } from 'lucide-react';
import { assetsApi } from '@/lib/api/assets';
import type { Asset } from '@/lib/api/types';
import { resolveMediaUrl } from '@/lib/utils/mediaUrl';

export interface AssetEmbedProps {
  assetId: number;
  caption?: string;
  asset?: Asset | null;
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

export function AssetEmbed({ assetId, caption, asset: initialAsset }: AssetEmbedProps) {
  const assetQuery = useQuery({
    queryKey: ['asset', assetId],
    queryFn: () => assetsApi.getAsset(assetId),
    enabled: !initialAsset && Number.isFinite(assetId),
  });

  const asset = initialAsset ?? assetQuery.data ?? null;

  if (!Number.isFinite(assetId)) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-foreground-secondary">
        无效的素材引用
      </div>
    );
  }

  if (!asset && assetQuery.isLoading) {
    return (
      <div className="rounded-xl border border-white/10 bg-background-secondary p-4 animate-pulse">
        <div className="h-4 w-40 rounded bg-white/10 mb-3" />
        <div className="h-48 rounded-lg bg-white/5" />
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300">
        素材不存在或加载失败（ID: {assetId}）
      </div>
    );
  }

  const typeMeta = getAssetTypeMeta(asset.asset_type);
  const thumbnailUrl = resolveMediaUrl(asset.thumbnail_url ?? null, asset.thumbnail_path);
  const originalUrl = resolveMediaUrl(asset.original_url ?? null, asset.original_path);
  const mediaUrl = originalUrl ?? thumbnailUrl;

  return (
    <figure className="rounded-2xl border border-white/10 bg-background-secondary overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2 min-w-0">
          <typeMeta.Icon size={16} className={typeMeta.className} />
          <span className="text-sm text-foreground-secondary truncate">
            {typeMeta.label} · #{assetId}
          </span>
        </div>
        <Link
          href={`/assets/${assetId}`}
          className="inline-flex items-center gap-1 text-xs text-foreground-secondary hover:text-foreground transition-colors"
        >
          <ExternalLink size={14} />
          打开
        </Link>
      </div>

      <div className="p-4">
        {asset.asset_type === 'image' && mediaUrl && (
          <img
            src={mediaUrl}
            alt={caption ?? ''}
            loading="lazy"
            className="w-full h-auto rounded-xl border border-white/10 bg-black/10"
          />
        )}

        {asset.asset_type === 'video' && originalUrl && (
          <video
            className="w-full rounded-xl border border-white/10 bg-black/20"
            controls
            preload="metadata"
            poster={thumbnailUrl ?? undefined}
          >
            <source src={originalUrl} />
          </video>
        )}

        {asset.asset_type === 'audio' && originalUrl && (
          <div className="space-y-3">
            {thumbnailUrl && (
              <img
                src={thumbnailUrl}
                alt=""
                className="w-full h-auto rounded-xl border border-white/10 bg-black/10"
              />
            )}
            <audio className="w-full" controls preload="metadata" src={originalUrl} />
          </div>
        )}

        {!mediaUrl && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-foreground-secondary">
            暂无可用的媒体链接
          </div>
        )}

        {caption && (
          <figcaption className="mt-3 text-xs text-foreground-tertiary">
            {caption}
          </figcaption>
        )}
      </div>
    </figure>
  );
}

