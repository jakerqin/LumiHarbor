'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Calendar, Tag } from 'lucide-react';
import { notesApi, type Note } from '@/lib/api/notes';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface NoteTimelineProps {
  onNoteClick?: (id: number) => void;
}

export function NoteTimeline({ onNoteClick }: NoteTimelineProps) {
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['notes-timeline', page, pageSize],
    queryFn: () => notesApi.getNotes(page, pageSize),
  });

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

  if (!data || data.notes.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <p className="text-xl text-foreground-secondary">暂无笔记</p>
        </div>
      </div>
    );
  }

  // 按月份分组
  const notesByMonth = data.notes.reduce((acc, note) => {
    const month = format(new Date(note.createdAt), 'yyyy年MM月', { locale: zhCN });
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
              {notesByMonth[month].map((note, index) => (
                <motion.div
                  key={note.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => onNoteClick?.(note.id)}
                  className="relative ml-20 group cursor-pointer"
                >
                  {/* 连接线 */}
                  <div className="absolute left-[-48px] top-6 w-8 h-0.5 bg-gradient-to-r from-primary/50 to-transparent" />

                  {/* 笔记卡片 */}
                  <div className="p-6 bg-background-secondary hover:bg-background-tertiary border border-white/10 hover:border-primary/50 rounded-xl transition-all">
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

                    {/* 日期 */}
                    <div className="flex items-center gap-2 text-xs text-foreground-tertiary mb-3">
                      <Calendar size={14} />
                      <span>{format(new Date(note.createdAt), 'PPP', { locale: zhCN })}</span>
                    </div>

                    {/* 标题 */}
                    <h4 className="text-xl font-heading font-semibold mb-3 group-hover:text-primary transition-colors">
                      {note.title}
                    </h4>

                    {/* 内容预览 */}
                    <p className="text-foreground-secondary line-clamp-3 mb-4">{note.content}</p>

                    {/* 标签 */}
                    {note.tags && note.tags.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        {note.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-lg flex items-center gap-1"
                          >
                            <Tag size={14} />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 加载更多 */}
      {data.total > data.notes.length * page && (
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
