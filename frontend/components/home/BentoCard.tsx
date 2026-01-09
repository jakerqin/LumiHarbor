'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { gsap } from 'gsap';
import { Play, MapPin, Calendar } from 'lucide-react';
import { Asset } from '@/lib/api/types';
import { cn } from '@/lib/utils/cn';
import { FavoriteButton } from '@/components/assets/FavoriteButton';

interface BentoCardProps {
  asset: Asset;
  size: 'small' | 'medium' | 'large';
  index: number;
}

export function BentoCard({ asset, size, index }: BentoCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // 从 tags 对象中提取地点信息
  const locationName = asset.tags?.location_formatted || asset.tags?.location_city || asset.tags?.location_poi;

  // 从 tags 对象中提取设备信息作为标签
  const displayTags = [
    asset.tags?.device_model,
  ].filter(Boolean) as string[];

  const sizeClasses = {
    small: 'col-span-1 row-span-1 h-64',
    medium: 'col-span-1 row-span-2 h-[520px]',
    large: 'col-span-2 row-span-2 h-[520px]',
  };

  // 初始化淡入缩放动画
  useEffect(() => {
    if (!cardRef.current) return;

    gsap.fromTo(
      cardRef.current,
      { opacity: 0, scale: 0.9 },
      {
        opacity: 1,
        scale: 1,
        duration: 0.5,
        delay: index * 0.1,
        ease: 'power2.out',
      }
    );
  }, [index]);

  // Hover 遮罩层动画
  useEffect(() => {
    if (!overlayRef.current) return;

    gsap.to(overlayRef.current, {
      opacity: isHovered ? 1 : 0,
      duration: 0.3,
      ease: 'power2.out',
    });
  }, [isHovered]);

  return (
    <div
      ref={cardRef}
      className={cn(
        'relative overflow-hidden rounded-2xl cursor-pointer group',
        sizeClasses[size]
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ opacity: 0 }}
    >
      <div className="relative w-full h-full">
        <Image
          src={asset.thumbnailUrl}
          alt={asset.fileName}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-110"
          unoptimized
        />

        {/* 右上角操作按钮区域 */}
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          {/* 收藏按钮 */}
          <FavoriteButton
            assetId={asset.id}
            initialFavorited={asset.isFavorited}
          />

          {/* 视频播放图标 */}
          {asset.type === 'video' && (
            <div className="w-10 h-10 flex items-center justify-center rounded-full bg-black/60 backdrop-blur-sm">
              <Play size={20} fill="currentColor" className="text-white" />
            </div>
          )}
        </div>

        <div
          ref={overlayRef}
          className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"
          style={{ opacity: 0 }}
        >
          <div className="absolute bottom-0 left-0 right-0 p-6 space-y-2">
            {locationName && (
              <div className="flex items-center gap-2 text-white/90">
                <MapPin size={16} fill="currentColor" />
                <span className="text-sm font-medium">{locationName}</span>
              </div>
            )}

            <div className="flex items-center gap-2 text-white/70">
              <Calendar size={16} />
              <span className="text-sm">
                {new Date(asset.shotAt).toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>

            {displayTags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {displayTags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 text-xs bg-white/20 backdrop-blur-sm rounded-full text-white"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
