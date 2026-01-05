'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { NoteCard } from './NoteCard';
import { notesApi } from '@/lib/api/notes';

interface NoteGridProps {
  onNoteClick?: (id: number) => void;
}

export function NoteGrid({ onNoteClick }: NoteGridProps) {
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading, error } = useQuery({
    queryKey: ['notes', page, pageSize],
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

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <p className="text-xl text-red-500 mb-2">加载失败</p>
          <p className="text-foreground-secondary">请刷新页面重试</p>
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

  const totalPages = Math.ceil(data.total / pageSize);

  return (
    <div>
      {/* 笔记网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.notes.map((note) => (
          <NoteCard key={note.id} note={note} onClick={() => onNoteClick?.(note.id)} />
        ))}
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="mt-12 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-background-secondary hover:bg-background-tertiary rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            上一页
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-10 h-10 rounded-lg transition-colors ${
                    page === pageNum
                      ? 'bg-primary text-white'
                      : 'bg-background-secondary hover:bg-background-tertiary'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 bg-background-secondary hover:bg-background-tertiary rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            下一页
          </button>

          <span className="ml-4 text-sm text-foreground-secondary">
            共 {data.total} 篇笔记
          </span>
        </div>
      )}
    </div>
  );
}
