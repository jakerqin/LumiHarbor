'use client';

import { useRef, useState } from 'react';
import { Video, MapPin, Calendar, Heart } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Asset } from '@/lib/api/types';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { createHoverLiftHandlers } from '@/lib/utils/gsap';
import { assetsApi } from '@/lib/api/assets';

interface AssetCardProps {
  asset: Asset;
  onClick?: () => void;
}

export function AssetCard({ asset, onClick }: AssetCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const [isHovered, setIsHovered] = useState(false);

  const hoverHandlers = createHoverLiftHandlers(cardRef.current);

  // 收藏/取消收藏 mutation
  const favoriteMutation = useMutation({
    mutationFn: async () => {
      if (asset.is_favorited) {
        await assetsApi.unfavorite(asset.id);
      } else {
        await assetsApi.favorite(asset.id);
      }
    },
    onMutate: async () => {
      // 乐观更新：立即更新 UI
      await queryClient.cancelQueries({ queryKey: ['assets'] });

      const previousData = queryClient.getQueryData(['assets']);

      queryClient.setQueriesData(
        { queryKey: ['assets'] },
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            assets: old.assets.map((a: Asset) =>
              a.id === asset.id ? { ...a, is_favorited: !a.is_favorited } : a
            ),
          };
        }
      );

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      // 失败回滚
      if (context?.previousData) {
        queryClient.setQueryData(['assets'], context.previousData);
      }
    },
    onSettled: () => {
      // 刷新数据
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });

  // 处理收藏点击（阻止冒泡）
  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    favoriteMutation.mutate();
  };

  // 获取文件格式标签
  const getFormatLabel = () => {
    if (!asset.mime_type) return null;
    const mimeType = asset.mime_type.toLowerCase();
    if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'JPEG';
    if (mimeType.includes('png')) return 'PNG';
    if (mimeType.includes('heic')) return 'HEIC';
    if (mimeType.includes('mp4')) return 'MP4';
    if (mimeType.includes('mov')) return 'MOV';
    return asset.mime_type.split('/')[1]?.toUpperCase();
  };

  // 获取缩略图 URL
  const getThumbnailUrl = () => {
    if (asset.thumbnail_path) {
      return `${process.env.NEXT_PUBLIC_API_URL}${asset.thumbnail_path}`;
    }
    return '/placeholder-image.jpg'; // 占位图
  };

  // 获取地点显示文本
  const getLocationText = () => {
    if (asset.location_city && asset.location_poi) {
      return `${asset.location_city} · ${asset.location_poi}`;
    }
    return asset.location_city || asset.location_poi || null;
  };

  const formatLabel = getFormatLabel();
  const locationText = getLocationText();

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...hoverHandlers}
      className="group cursor-pointer"
    >
      <div className="relative rounded-xl overflow-hidden bg-background-secondary">
        {/* 图片：自适应高度 */}
        <img
          src={getThumbnailUrl()}
          alt=""
          className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-110"
        />

        {/* 右上角：文件格式标签 + 收藏按钮 */}
        <div className="absolute top-3 right-3 flex items-center gap-2">
          {/* 文件格式标签 */}
          {formatLabel && (
            <div className="px-2 py-1 bg-black/60 backdrop-blur-sm rounded-lg">
              <span className="text-xs text-white font-medium">{formatLabel}</span>
            </div>
          )}

          {/* 收藏按钮 */}
          <button
            onClick={handleFavoriteClick}
            className={`p-2 rounded-lg backdrop-blur-sm transition-all ${
              asset.is_favorited
                ? 'bg-red-500/90 hover:bg-red-600/90'
                : 'bg-black/40 hover:bg-black/60'
            }`}
          >
            <Heart
              size={16}
              className={`transition-all ${
                asset.is_favorited
                  ? 'fill-white text-white'
                  : 'text-white'
              }`}
            />
          </button>
        </div>

        {/* 视频标识 */}
        {asset.asset_type === 'video' && (
          <div className="absolute top-3 left-3 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-lg flex items-center gap-1">
            <Video size={16} className="text-accent-purple" />
            <span className="text-xs text-white">视频</span>
          </div>
        )}

        {/* Hover 信息覆盖层 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
            {/* 地点 */}
            {locationText && (
              <div className="flex items-center gap-2 text-white">
                <MapPin size={16} />
                <span className="text-sm font-medium">{locationText}</span>
              </div>
            )}

            {/* 日期 */}
            {asset.shot_at && (
              <div className="flex items-center gap-2 text-white/80">
                <Calendar size={16} />
                <span className="text-xs">
                  {format(new Date(asset.shot_at), 'PPP', { locale: zhCN })}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
