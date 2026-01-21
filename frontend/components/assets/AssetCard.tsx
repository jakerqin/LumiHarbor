'use client';

import { useEffect, useRef, useState } from 'react';
import { Video, Image as ImageIcon, Music, MapPin, Calendar, Heart, Check } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Asset } from '@/lib/api/types';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { motion, useMotionValue, useSpring } from 'motion/react';
import { assetsApi, type AssetsResponse } from '@/lib/api/assets';

interface AssetCardProps {
  asset: Asset;
  onClick?: () => void;
  disableEntryAnimation?: boolean;
  showSelectionIndicator?: boolean;
  isSelected?: boolean;
  disableHoverEffects?: boolean;
}

// 弹簧动画配置
const springConfig = { damping: 30, stiffness: 100, mass: 2 };

// 3D 倾斜幅度
const ROTATE_AMPLITUDE = 14;

export function AssetCard({
  asset,
  onClick,
  disableEntryAnimation = false,
  showSelectionIndicator = false,
  isSelected = false,
  disableHoverEffects = false,
}: AssetCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const [isFavorited, setIsFavorited] = useState(asset.is_favorited);

  // Motion 状态管理
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(0, springConfig);
  const rotateY = useSpring(0, springConfig);
  const scale = useSpring(1, springConfig);
  const overlayOpacity = useSpring(0, springConfig);

  useEffect(() => {
    if (!disableHoverEffects) return;
    scale.set(1);
    overlayOpacity.set(0);
    rotateX.set(0);
    rotateY.set(0);
  }, [disableHoverEffects, overlayOpacity, rotateX, rotateY, scale]);

  useEffect(() => {
    setIsFavorited(asset.is_favorited);
  }, [asset.id, asset.is_favorited]);

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

      queryClient.setQueriesData<AssetsResponse>(
        { queryKey: ['assets'] },
        (old) => {
          if (!old) return old;
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

  // 处理鼠标移动 - 3D 倾斜效果
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disableHoverEffects) return;
    if (!cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left - rect.width / 2;
    const offsetY = e.clientY - rect.top - rect.height / 2;

    const rotationX = (offsetY / (rect.height / 2)) * -ROTATE_AMPLITUDE;
    const rotationY = (offsetX / (rect.width / 2)) * ROTATE_AMPLITUDE;

    rotateX.set(rotationX);
    rotateY.set(rotationY);

    x.set(e.clientX - rect.left);
    y.set(e.clientY - rect.top);
  };

  // 处理鼠标进入
  const handleMouseEnter = () => {
    if (disableHoverEffects) return;
    scale.set(1.05);
    overlayOpacity.set(1);
  };

  // 处理鼠标离开
  const handleMouseLeave = () => {
    if (disableHoverEffects) return;
    scale.set(1);
    overlayOpacity.set(0);
    rotateX.set(0);
    rotateY.set(0);
  };

  // 处理收藏点击（阻止冒泡）
  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    favoriteMutation.mutate(!isFavorited);
  };

  // 处理卡片点击
  const handleCardClick = () => {
    if (!onClick) return;
    onClick();
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

  // 计算宽高比（用于确保容器高度正确）
  const aspectRatio = typeof asset.aspect_ratio === 'number' && asset.aspect_ratio > 0
    ? asset.aspect_ratio
    : 1;

  return (
    <motion.div
      ref={cardRef}
      onClick={handleCardClick}
      onMouseMove={disableHoverEffects ? undefined : handleMouseMove}
      onMouseEnter={disableHoverEffects ? undefined : handleMouseEnter}
      onMouseLeave={disableHoverEffects ? undefined : handleMouseLeave}
      className="group cursor-pointer"
      style={{ perspective: '1000px' }}
      initial={disableEntryAnimation ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
    >
      <motion.div
        className={`relative rounded-xl overflow-hidden bg-background-secondary ${
          isSelected ? 'ring-2 ring-primary/80' : ''
        }`}
        style={{
          rotateX,
          rotateY,
          scale,
          transformStyle: 'preserve-3d',
          aspectRatio: aspectRatio.toString(),
        }}
      >
        {showSelectionIndicator && (
          <div
            className="absolute top-3 left-3 z-10"
            style={{ transform: 'translateZ(30px)', transformStyle: 'preserve-3d' }}
          >
            <div
              className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${
                isSelected
                  ? 'bg-primary border-primary text-white'
                  : 'bg-black/30 border-white/40 text-transparent'
              }`}
            >
              <Check size={14} className={isSelected ? 'text-white' : 'text-transparent'} />
            </div>
          </div>
        )}
        {/* 图片：填充容器 */}
        <motion.img
          src={getThumbnailUrl()}
          alt=""
          className="w-full h-full object-cover transition-transform duration-300"
          style={{
            transform: 'translateZ(0)',
          }}
        />

        {/* 右上角：类型图标 + 收藏按钮（浮起层） */}
        <motion.div
          className="absolute top-3 right-3 flex items-center gap-2 cursor-default"
          style={{
            transform: 'translateZ(30px)',
            transformStyle: 'preserve-3d',
          }}
        >
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
        </motion.div>

        {/* Hover 信息覆盖层 */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent pointer-events-none"
          style={{
            opacity: overlayOpacity,
            transform: 'translateZ(0)',
          }}
        >
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
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
