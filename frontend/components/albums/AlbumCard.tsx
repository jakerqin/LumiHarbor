'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { Image as ImageIcon, Calendar, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import type { Album } from '@/lib/api/albums';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { fadeIn } from '@/lib/utils/gsap';

interface AlbumCardProps {
  album: Album;
  onClick?: () => void;
  onEdit?: (album: Album) => void;
  onDelete?: (album: Album) => void;
  disableEntryAnimation?: boolean;
}

export function AlbumCard({ album, onClick, onEdit, onDelete, disableEntryAnimation = false }: AlbumCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [showMenu, setShowMenu] = useState(false);

  // 入场动画
  useLayoutEffect(() => {
    // 如果禁用入场动画（由父组件控制动画），则跳过
    if (disableEntryAnimation) return;

    const element = cardRef.current;
    if (!element) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(element, { ...fadeIn.from }, { ...fadeIn.to, overwrite: 'auto' });
    }, element);

    return () => ctx.revert();
  }, [disableEntryAnimation]);

  // 点击外部关闭菜单
  useLayoutEffect(() => {
    if (!showMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

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

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    onEdit?.(album);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    onDelete?.(album);
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

        {/* 右上角标识区 */}
        <div className="absolute top-3 right-3 flex items-center gap-2">
          {/* 数量标识 */}
          <div className="px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-lg flex items-center gap-2">
            <ImageIcon size={16} className="text-white" />
            <span className="text-sm text-white font-medium">{album.assetCount}</span>
          </div>

          {/* 三点菜单按钮 */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={handleMenuClick}
              className="p-1.5 bg-black/60 backdrop-blur-sm rounded-lg hover:bg-black/80 transition-colors"
              aria-label="更多操作"
            >
              <MoreVertical size={16} className="text-white" />
            </button>

            {/* 下拉菜单 */}
            {showMenu && (
              <div className="absolute top-full right-0 mt-2 w-32 rounded-lg bg-background-secondary/95 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden z-10">
                <button
                  onClick={handleEdit}
                  className="w-full px-4 py-2.5 flex items-center gap-2 text-sm text-foreground hover:bg-white/5 transition-colors"
                >
                  <Edit2 size={14} />
                  <span>编辑</span>
                </button>
                <button
                  onClick={handleDelete}
                  className="w-full px-4 py-2.5 flex items-center gap-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 size={14} />
                  <span>删除</span>
                </button>
              </div>
            )}
          </div>
        </div>
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
