'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { Calendar, MoreVertical, Trash2 } from 'lucide-react';
import type { Note } from '@/lib/api/notes';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { resolveMediaUrl } from '@/lib/utils/mediaUrl';

interface NoteCardProps {
  note: Note;
  onClick?: () => void;
  onDelete?: (note: Note) => void;
}

export function NoteCard({ note, onClick, onDelete }: NoteCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [showMenu, setShowMenu] = useState(false);
  const coverUrl = resolveMediaUrl(note.cover_thumbnail_url, note.cover_thumbnail_path);

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
      y: -4,
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

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    onDelete?.(note);
  };

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="group cursor-pointer relative"
    >
      <div className="p-6 bg-background-secondary hover:bg-background-tertiary border border-white/10 hover:border-primary/50 rounded-xl transition-all">
        {/* 封面图区域（始终显示） */}
        <div className="relative aspect-video rounded-lg overflow-hidden mb-4">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={note.title ?? ''}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 via-primary/10 to-background-tertiary flex items-center justify-center">
              <Calendar size={48} className="text-primary/40" />
            </div>
          )}

          {/* 右上角三点菜单按钮 */}
          <div className="absolute top-3 right-3" ref={menuRef}>
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

        {/* 标题 */}
        <h3 className="text-lg font-heading font-semibold mb-3 group-hover:text-primary transition-colors line-clamp-2">
          {note.title || '无标题'}
        </h3>

        {/* 内容预览 */}
        <p className="text-sm text-foreground-secondary line-clamp-3 mb-4">
          {note.excerpt || ' '}
        </p>

        {/* 底部信息 */}
        <div className="flex items-center justify-between gap-4">
          {/* 日期 */}
          <div className="flex items-center gap-2 text-xs text-foreground-tertiary">
            <Calendar size={14} />
            <span>{format(new Date(note.created_at), 'PPP', { locale: zhCN })}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
