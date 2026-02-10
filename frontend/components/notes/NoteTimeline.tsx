'use client';

import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { gsap } from 'gsap';
import { Calendar, MoreVertical, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { notesApi, type Note } from '@/lib/api/notes';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { resolveMediaUrl } from '@/lib/utils/mediaUrl';

interface NoteTimelineProps {
  onNoteClick?: (id: number) => void;
  onNoteDelete?: (note: Note) => void;
}

export function NoteTimeline({ onNoteClick, onNoteDelete }: NoteTimelineProps) {
  const [showMenuForNote, setShowMenuForNote] = useState<number | null>(null);
  const menuRefs = useRef(new Map<number, HTMLDivElement>());
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [allNotes, setAllNotes] = useState<Note[]>([]);
  const noteRefs = useRef(new Map<number, HTMLDivElement>());

  const { data, isLoading } = useQuery({
    queryKey: ['notes-timeline', page, pageSize],
    queryFn: () => notesApi.getNotes(page, pageSize),
  });

  // 点击外部关闭菜单
  useLayoutEffect(() => {
    if (showMenuForNote === null) return;

    const handleClickOutside = (e: MouseEvent) => {
      const menuEl = menuRefs.current.get(showMenuForNote);
      if (menuEl && !menuEl.contains(e.target as Node)) {
        setShowMenuForNote(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenuForNote]);

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
                    className="relative ml-20 cursor-pointer"
                    style={{ opacity: 0 }}
                  >
                    {/* 连接线 */}
                    <div className="absolute left-[-48px] top-6 w-8 h-0.5 bg-gradient-to-r from-primary/50 to-transparent" />

                    {/* 笔记卡片 */}
                    <div className="relative p-6 bg-background-secondary hover:bg-background-tertiary border border-white/10 hover:border-primary/50 rounded-xl transition-all">
                      {/* 左右布局：左侧封面图，右侧文案 */}
                      <div className="flex gap-6">
                        {/* 封面图区域（始终显示） */}
                        <div className="relative w-[400px] h-[400px] flex-shrink-0 rounded-lg overflow-hidden group">
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
                          <div
                            className="absolute top-3 right-3"
                            ref={(el) => {
                              if (el) {
                                menuRefs.current.set(note.id, el);
                                return;
                              }
                              menuRefs.current.delete(note.id);
                            }}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowMenuForNote(showMenuForNote === note.id ? null : note.id);
                              }}
                              className="p-1.5 bg-black/60 backdrop-blur-sm rounded-lg hover:bg-black/80 transition-colors"
                              aria-label="更多操作"
                            >
                              <MoreVertical size={16} className="text-white" />
                            </button>

                            {/* 下拉菜单 */}
                            {showMenuForNote === note.id && (
                              <div className="absolute top-full right-0 mt-2 w-32 rounded-lg bg-background-secondary/95 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden z-10">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowMenuForNote(null);
                                    onNoteDelete?.(note);
                                  }}
                                  className="w-full px-4 py-2.5 flex items-center gap-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                                >
                                  <Trash2 size={14} />
                                  <span>删除</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 右侧文案区域 */}
                        <div className="flex-1 flex flex-col">
                          {/* 日期 */}
                          <div className="flex items-center gap-2 text-xs text-foreground-tertiary mb-3">
                            <Calendar size={14} />
                            <span>{format(new Date(note.created_at), 'PPP', { locale: zhCN })}</span>
                          </div>

                          {/* 标题 */}
                          <h4 className="text-2xl font-heading font-semibold mb-3 text-primary transition-colors">
                            {note.title || '无标题'}
                          </h4>

                          {/* 内容预览 - 使用 CSS 限制行数，保留完整格式 */}
                          {note.excerpt ? (
                            <div className="text-foreground-secondary text-sm leading-relaxed prose prose-sm prose-invert max-w-none line-clamp-6">
                              <ReactMarkdown>{note.excerpt}</ReactMarkdown>
                            </div>
                          ) : (
                            <div className="text-foreground-tertiary text-sm italic">
                              暂无内容预览
                            </div>
                          )}
                        </div>
                      </div>
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
