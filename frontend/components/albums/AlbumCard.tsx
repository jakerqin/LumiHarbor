'use client';

import { useRef } from 'react';
import { gsap } from 'gsap';
import { Image as ImageIcon, Calendar } from 'lucide-react';
import type { Album } from '@/lib/api/albums';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface AlbumCardProps {
  album: Album;
  onClick?: () => void;
}

export function AlbumCard({ album, onClick }: AlbumCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (!cardRef.current) return;
    gsap.to(cardRef.current, {
      y: -8,
      duration: 0.3,
      ease: 'power2.out',
    });
  };

  const handleMouseLeave = () => {
    if (!cardRef.current) return;
    gsap.to(cardRef.current, {
      y: 0,
      duration: 0.3,
      ease: 'power2.out',
    });
  };

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="group cursor-pointer"
    >
      {/* 封面图 */}
      <div className="relative aspect-[16/10] rounded-xl overflow-hidden bg-background-secondary mb-4">
        <img
          src={album.coverUrl}
          alt={album.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />

        {/* 数量标识 */}
        <div className="absolute top-3 right-3 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-lg flex items-center gap-2">
          <ImageIcon size={16} className="text-white" />
          <span className="text-sm text-white font-medium">{album.assetCount}</span>
        </div>

        {/* Hover 遮罩 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      {/* 信息 */}
      <div className="space-y-2">
        <h3 className="text-lg font-heading font-semibold group-hover:text-primary transition-colors">
          {album.name}
        </h3>

        {album.description && (
          <p className="text-sm text-foreground-secondary line-clamp-2">{album.description}</p>
        )}

        <div className="flex items-center gap-2 text-xs text-foreground-tertiary">
          <Calendar size={14} />
          <span>
            {album.startTime && album.endTime
              ? `${format(new Date(album.startTime), 'yyyy.MM.dd', { locale: zhCN })} - ${format(
                  new Date(album.endTime),
                  'MM.dd',
                  { locale: zhCN }
                )}`
              : format(new Date(album.createdAt), 'PPP', { locale: zhCN })}
          </span>
        </div>
      </div>
    </div>
  );
}
