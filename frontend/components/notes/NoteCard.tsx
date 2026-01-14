'use client';

import { useRef } from 'react';
import { gsap } from 'gsap';
import { Calendar } from 'lucide-react';
import type { Note } from '@/lib/api/notes';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { resolveMediaUrl } from '@/lib/utils/mediaUrl';

interface NoteCardProps {
  note: Note;
  onClick?: () => void;
}

export function NoteCard({ note, onClick }: NoteCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const coverUrl = resolveMediaUrl(note.cover_thumbnail_url, note.cover_thumbnail_path);

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

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="group cursor-pointer p-6 bg-background-secondary hover:bg-background-tertiary border border-white/10 hover:border-primary/50 rounded-xl transition-all"
    >
      {/* 封面图（如果有） */}
      {coverUrl && (
        <div className="relative aspect-video rounded-lg overflow-hidden mb-4 bg-background-tertiary">
          <img
            src={coverUrl}
            alt={note.title ?? ''}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
        </div>
      )}

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
  );
}
