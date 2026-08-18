'use client';

import { useEffect, useRef, useState } from 'react';
import { Video, Image as ImageIcon, Music, MapPin, Calendar, Heart, Check } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Asset } from '@/lib/api/types';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { gsap } from 'gsap';
import { assetsApi, type AssetsResponse } from '@/lib/api/assets';

interface AssetCardProps {
  asset: Asset;
  onClick?: () => void;
  disableEntryAnimation?: boolean;
  showSelectionIndicator?: boolean;
  isSelected?: boolean;
  disableHoverEffects?: boolean;
}

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
  const innerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const [isFavorited, setIsFavorited] = useState(asset.is_favorited);

  useEffect(() => {
    if (disableEntryAnimation || !cardRef.current) return;
    gsap.fromTo(
      cardRef.current,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }
    );
  }, [disableEntryAnimation]);

  useEffect(() => {
    if (!disableHoverEffects) return;
    if (innerRef.current) {
      gsap.set(innerRef.current, { rotateX: 0, rotateY: 0, scale: 1 });
    }
    if (overlayRef.current) {
      gsap.set(overlayRef.current, { opacity: 0 });
    }
  }, [disableHoverEffects]);

  useEffect(() => {
    setIsFavorited(asset.is_favorited);
  }, [asset.id, asset.is_favorited]);

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
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['featured-assets'] });
    },
  });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disableHoverEffects || !innerRef.current) return;
    const rect = innerRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left - rect.width / 2;
    const offsetY = e.clientY - rect.top - rect.height / 2;
    gsap.to(innerRef.current, {
      rotateX: (offsetY / (rect.height / 2)) * -ROTATE_AMPLITUDE,
      rotateY: (offsetX / (rect.width / 2)) * ROTATE_AMPLITUDE,
      scale: 1.05,
      duration: 0.3,
      overwrite: 'auto',
    });
  };

  const handleMouseEnter = () => {
    if (disableHoverEffects) return;
    if (overlayRef.current) {
      gsap.to(overlayRef.current, { opacity: 1, duration: 0.25, overwrite: 'auto' });
    }
  };

  const handleMouseLeave = () => {
    if (disableHoverEffects) return;
    if (innerRef.current) {
      gsap.to(innerRef.current, {
        rotateX: 0,
        rotateY: 0,
        scale: 1,
        duration: 0.4,
        overwrite: 'auto',
      });
    }
    if (overlayRef.current) {
      gsap.to(overlayRef.current, { opacity: 0, duration: 0.25, overwrite: 'auto' });
    }
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    favoriteMutation.mutate(!isFavorited);
  };

  const assetTypeMeta = (() => {
    switch (asset.asset_type) {
      case 'video':
        return { Icon: Video, label: '视频', className: 'text-primary' };
      case 'audio':
        return { Icon: Music, label: '音频', className: 'text-accent-green' };
      case 'image':
      default:
        return { Icon: ImageIcon, label: '图片', className: 'text-accent-blue' };
    }
  })();

  const getThumbnailUrl = () => {
    if (asset.thumbnail_url) return asset.thumbnail_url;
    if (asset.thumbnail_path) {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const normalizedBaseUrl = baseUrl.replace(/\/$/, '');
      const normalizedPath = asset.thumbnail_path.startsWith('/')
        ? asset.thumbnail_path
        : `/${asset.thumbnail_path}`;
      return `${normalizedBaseUrl}${normalizedPath}`;
    }
    return '/icon.svg';
  };

  const getLocationText = () => {
    if (asset.location_city && asset.location_poi) {
      return `${asset.location_city} · ${asset.location_poi}`;
    }
    return asset.location_city || asset.location_poi || null;
  };

  const locationText = getLocationText();
  const aspectRatio =
    typeof asset.aspect_ratio === 'number' && asset.aspect_ratio > 0 ? asset.aspect_ratio : 1;

  return (
    <div
      ref={cardRef}
      onClick={() => onClick?.()}
      onMouseMove={disableHoverEffects ? undefined : handleMouseMove}
      onMouseEnter={disableHoverEffects ? undefined : handleMouseEnter}
      onMouseLeave={disableHoverEffects ? undefined : handleMouseLeave}
      className="group cursor-pointer relative"
      style={{ perspective: '1000px' }}
    >
      <div
        ref={innerRef}
        className={`relative rounded-xl overflow-hidden bg-background-secondary ${
          isSelected ? 'ring-2 ring-primary/80' : ''
        }`}
        style={{ transformStyle: 'preserve-3d', aspectRatio: aspectRatio.toString() }}
      >
        {showSelectionIndicator && (
          <div
            className="absolute top-3 left-3 z-10"
            style={{ transform: 'translateZ(30px)', transformStyle: 'preserve-3d' }}
          >
            <div
              className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${
                isSelected
                  ? 'bg-primary border-primary text-primary-foreground'
                  : 'bg-black/30 border-white/40 text-transparent'
              }`}
            >
              <Check size={14} className={isSelected ? 'text-primary-foreground' : 'text-transparent'} />
            </div>
          </div>
        )}
        <img
          src={getThumbnailUrl()}
          alt=""
          className="w-full h-full object-cover"
          style={{ transform: 'translateZ(0)' }}
        />
        <div
          ref={overlayRef}
          className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent pointer-events-none opacity-0"
          style={{ transform: 'translateZ(0)' }}
        >
          <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
            {locationText && (
              <div className="flex items-center gap-2 text-white">
                <MapPin size={16} />
                <span className="text-sm font-medium">{locationText}</span>
              </div>
            )}
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

      <div className="absolute top-3 right-3 flex items-center gap-2 cursor-default z-10">
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
    </div>
  );
}
