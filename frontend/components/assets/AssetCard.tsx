'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Video, Image as ImageIcon, Music, MapPin, Calendar, Heart } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Asset } from '@/lib/api/types';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { gsap } from 'gsap';
import { fadeIn, fadeOut } from '@/lib/utils/gsap';
import { assetsApi } from '@/lib/api/assets';

interface AssetCardProps {
  asset: Asset;
  onClick?: () => void;
}

export function AssetCard({ asset, onClick }: AssetCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const [isFavorited, setIsFavorited] = useState(asset.is_favorited);

  const isAnimatingOutRef = useRef(false);

  useEffect(() => {
    setIsFavorited(asset.is_favorited);
  }, [asset.id, asset.is_favorited]);

  useLayoutEffect(() => {
    const element = cardRef.current;
    if (!element) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        element,
        { ...fadeIn.from },
        { ...fadeIn.to, overwrite: 'auto' }
      );
    }, element);

    return () => ctx.revert();
  }, []);

  // 收藏/取消收藏 mutation
  const favoriteMutation = useMutation({
    mutationFn: async (nextFavorited: boolean) => {
      if (nextFavorited) {
        await assetsApi.favorite(asset.id);
        return;
      }
      await assetsApi.unfavorite(asset.id);
    },
    onMutate: async (nextFavorited: boolean) => {
      const previousFavorited = isFavorited;

      // 乐观更新：立即更新 UI
      setIsFavorited(nextFavorited);
      await queryClient.cancelQueries({ queryKey: ['assets'] });

      const previousQueriesData = queryClient.getQueriesData({ queryKey: ['assets'] });

      queryClient.setQueriesData(
        { queryKey: ['assets'] },
        (old: any) => {
          if (!old || !Array.isArray(old.assets)) return old;
          return {
            ...old,
            assets: old.assets.map((a: Asset) =>
              a.id === asset.id ? { ...a, is_favorited: nextFavorited } : a
            ),
          };
        }
      );

      return { previousFavorited, previousQueriesData };
    },
    onError: (_err, _variables, context) => {
      // 失败回滚
      if (context?.previousQueriesData) {
        context.previousQueriesData.forEach(([queryKey, queryData]) => {
          queryClient.setQueryData(queryKey, queryData);
        });
      }
      if (context?.previousFavorited !== undefined) {
        setIsFavorited(context.previousFavorited);
      }
    },
    onSettled: () => {
      // 刷新数据
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['featured-assets'] });
    },
  });

  // 处理收藏点击（阻止冒泡）
  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    favoriteMutation.mutate(!isFavorited);
  };

  const handleCardClick = () => {
    if (!onClick) return;
    if (isAnimatingOutRef.current) return;

    const element = cardRef.current;
    if (!element) {
      onClick();
      return;
    }

    isAnimatingOutRef.current = true;
    gsap.to(element, {
      ...fadeOut,
      overwrite: 'auto',
      onComplete: onClick,
    });
  };

  const handleMouseEnter = () => {
    if (isAnimatingOutRef.current) return;
    const element = cardRef.current;
    if (!element) return;
    gsap.to(element, { y: -4, duration: 0.3, ease: 'power2.out', overwrite: 'auto' });
  };

  const handleMouseLeave = () => {
    if (isAnimatingOutRef.current) return;
    const element = cardRef.current;
    if (!element) return;
    gsap.to(element, { y: 0, duration: 0.3, ease: 'power2.out', overwrite: 'auto' });
  };

  const assetTypeMeta = (() => {
    switch (asset.asset_type) {
      case 'video':
        return { Icon: Video, label: '视频', className: 'text-accent-purple' };
      case 'audio':
        return { Icon: Music, label: '音频', className: 'text-accent-green' };
      case 'image':
      default:
        return { Icon: ImageIcon, label: '图片', className: 'text-accent-blue' };
    }
  })();

  // 获取缩略图 URL
  const getThumbnailUrl = () => {
    if (asset.thumbnail_url) {
      return asset.thumbnail_url;
    }
    if (asset.thumbnail_path) {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const normalizedBaseUrl = baseUrl.replace(/\/$/, '');
      const normalizedPath = asset.thumbnail_path.startsWith('/')
        ? asset.thumbnail_path
        : `/${asset.thumbnail_path}`;
      return `${normalizedBaseUrl}${normalizedPath}`;
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

  const locationText = getLocationText();

  return (
    <div
      ref={cardRef}
      onClick={handleCardClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="group"
    >
      <div className="relative rounded-xl overflow-hidden bg-background-secondary">
        {/* 图片：自适应高度 */}
        <img
          src={getThumbnailUrl()}
          alt=""
          className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-110"
        />

        {/* 右上角：类型图标 + 收藏按钮（独立半透明） */}
        <div className="absolute top-3 right-3 flex items-center gap-2 cursor-default">
          <div
            className="w-7 h-7 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center"
            aria-hidden="true"
          >
            <assetTypeMeta.Icon size={14} className={assetTypeMeta.className} />
          </div>

          <button
            type="button"
            onClick={handleFavoriteClick}
            disabled={favoriteMutation.isPending}
            className={`group/fav w-7 h-7 rounded-full backdrop-blur-sm flex items-center justify-center cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
              isFavorited
                ? 'bg-red-500/10 hover:bg-red-500/20'
                : 'bg-black/20 hover:bg-black/35'
            }`}
            aria-label={isFavorited ? '取消收藏' : '收藏'}
          >
            <Heart
              size={14}
              className={`transition-all duration-200 ${
                isFavorited
                  ? 'fill-red-500 text-red-500'
                  : 'text-white group-hover/fav:scale-110'
              } ${favoriteMutation.isPending ? 'animate-pulse' : ''}`}
            />
          </button>
        </div>

        {/* Hover 信息覆盖层 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
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
