'use client';

import { useRef } from 'react';
import { gsap } from 'gsap';
import { Calendar, Tag } from 'lucide-react';
import type { Note } from '@/lib/api/notes';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface NoteCardProps {
  note: Note;
  onClick?: () => void;
}

export function NoteCard({ note, onClick }: NoteCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

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
      {note.coverUrl && (
        <div className="relative aspect-video rounded-lg overflow-hidden mb-4 bg-background-tertiary">
          <img
            src={note.coverUrl}
            alt={note.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
        </div>
      )}

      {/* 标题 */}
      <h3 className="text-lg font-heading font-semibold mb-3 group-hover:text-primary transition-colors line-clamp-2">
        {note.title}
      </h3>

      {/* 内容预览 */}
      <p className="text-sm text-foreground-secondary line-clamp-3 mb-4">{note.content}</p>

      {/* 底部信息 */}
      <div className="flex items-center justify-between gap-4">
        {/* 日期 */}
        <div className="flex items-center gap-2 text-xs text-foreground-tertiary">
          <Calendar size={14} />
          <span>{format(new Date(note.createdAt), 'PPP', { locale: zhCN })}</span>
        </div>

        {/* 标签 */}
        {note.tags && note.tags.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {note.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-md flex items-center gap-1"
              >
                <Tag size={12} />
                {tag}
              </span>
            ))}
            {note.tags.length > 2 && (
              <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-md">
                +{note.tags.length - 2}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
