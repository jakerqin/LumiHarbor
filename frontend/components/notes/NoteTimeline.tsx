'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { gsap } from 'gsap';
import { Calendar } from 'lucide-react';
import { notesApi, type Note } from '@/lib/api/notes';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { resolveMediaUrl } from '@/lib/utils/mediaUrl';

interface NoteTimelineProps {
  onNoteClick?: (id: number) => void;
}

export function NoteTimeline({ onNoteClick }: NoteTimelineProps) {
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [allNotes, setAllNotes] = useState<Note[]>([]);
  const noteRefs = useRef(new Map<number, HTMLDivElement>());

  const { data, isLoading } = useQuery({
    queryKey: ['notes-timeline', page, pageSize],
    queryFn: () => notesApi.getNotes(page, pageSize),
  });

  // 累积分页数据（用于时间轴“加载更多”）
  useEffect(() => {
    if (!data) return;
    if (page === 1) {
      setAllNotes(data.notes);
      return;
    }
    setAllNotes((prev) => [...prev, ...data.notes]);
  }, [data, page]);

  // 笔记卡片淡入动画
  useEffect(() => {
    if (!data) return;
    allNotes.forEach((note, index) => {
      const noteEl = noteRefs.current.get(note.id);
      if (!noteEl) return;
      gsap.fromTo(
        noteEl,
        { opacity: 0, x: -20 },
        {
          opacity: 1,
          x: 0,
          duration: 0.4,
          delay: index * 0.1,
          ease: 'power2.out',
        }
      );
    });
  }, [allNotes, data]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4 mx-auto" />
          <p className="text-foreground-secondary">加载笔记中...</p>
        </div>
      </div>
    );
  }

  if (!data || allNotes.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <p className="text-xl text-foreground-secondary">暂无笔记</p>
        </div>
      </div>
    );
  }

  // 按月份分组
  const notesByMonth = allNotes.reduce((acc, note) => {
    const month = format(new Date(note.created_at), 'yyyy年MM月', { locale: zhCN });
    if (!acc[month]) {
      acc[month] = [];
    }
    acc[month].push(note);
    return acc;
  }, {} as Record<string, Note[]>);

  const months = Object.keys(notesByMonth);

  return (
    <div className="relative">
      {/* 时间轴线 */}
      <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/50 via-primary/30 to-transparent" />

      {/* 时间轴内容 */}
      <div className="space-y-12">
        {months.map((month) => (
          <div key={month}>
            {/* 月份标题 */}
            <div className="relative mb-6">
              <div className="absolute left-8 top-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-primary border-4 border-background" />
              <h3 className="ml-20 text-2xl font-heading font-bold text-primary">{month}</h3>
            </div>

            {/* 笔记列表 */}
            <div className="space-y-6">
              {notesByMonth[month].map((note) => {
                const coverUrl = resolveMediaUrl(note.cover_thumbnail_url, note.cover_thumbnail_path);

                return (
                  <div
                    key={note.id}
                    ref={(el) => {
                      if (el) {
                        noteRefs.current.set(note.id, el);
                        return;
                      }
                      noteRefs.current.delete(note.id);
                    }}
                    onClick={() => onNoteClick?.(note.id)}
                    className="relative ml-20 group cursor-pointer"
                    style={{ opacity: 0 }}
                  >
                    {/* 连接线 */}
                    <div className="absolute left-[-48px] top-6 w-8 h-0.5 bg-gradient-to-r from-primary/50 to-transparent" />

                    {/* 笔记卡片 */}
                    <div className="p-6 bg-background-secondary hover:bg-background-tertiary border border-white/10 hover:border-primary/50 rounded-xl transition-all">
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

                      {/* 日期 */}
                      <div className="flex items-center gap-2 text-xs text-foreground-tertiary mb-3">
                        <Calendar size={14} />
                        <span>{format(new Date(note.created_at), 'PPP', { locale: zhCN })}</span>
                      </div>

                      {/* 标题 */}
                      <h4 className="text-xl font-heading font-semibold mb-3 group-hover:text-primary transition-colors">
                        {note.title || '无标题'}
                      </h4>

                      {/* 内容预览 */}
                      <p className="text-foreground-secondary line-clamp-3 mb-4">
                        {note.excerpt || ' '}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 加载更多 */}
      {data.hasMore && (
        <div className="mt-12 flex justify-center">
          <button
            onClick={() => setPage((p) => p + 1)}
            className="px-6 py-3 bg-background-secondary hover:bg-background-tertiary border border-white/10 hover:border-primary/50 rounded-xl transition-all"
          >
            加载更多
          </button>
        </div>
      )}
    </div>
  );
}
