'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  Plus,
  LayoutGrid,
  History,
} from 'lucide-react';
import { NoteGrid } from '@/components/notes/NoteGrid';
import { NoteTimeline } from '@/components/notes/NoteTimeline';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useGsapPressableScale } from '@/lib/hooks/useGsapPressableScale';
import { notesApi } from '@/lib/api/notes';
import type { Note } from '@/lib/api/notes';
import { toast } from 'sonner';

type ViewMode = 'grid' | 'timeline';

export default function NotesPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();
  const createButtonRef = useRef<HTMLButtonElement>(null);
  const createButtonHandlers = useGsapPressableScale(createButtonRef);

  const handleCreateNote = () => {
    router.push('/notes/new');
  };

  const handleNoteClick = (id: number) => {
    router.push(`/notes/${id}`);
  };

  const handleDeleteNote = (note: Note) => {
    setNoteToDelete(note);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!noteToDelete) return;

    setIsDeleting(true);
    try {
      await notesApi.deleteNote(noteToDelete.id);
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast.success('笔记已删除');
      setDeleteDialogOpen(false);
      setNoteToDelete(null);
    } catch (error) {
      console.error('删除笔记失败:', error);
      toast.error('删除失败，请重试');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setNoteToDelete(null);
  };

  return (
    <div className="min-h-screen py-12 px-8">
      <div className="max-w-[1920px] mx-auto">
        {/* 页面头部 */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-heading font-bold mb-2 flex items-center gap-3">
                <FileText size={40} className="text-primary" />
                笔记
              </h1>
              <p className="text-foreground-secondary">记录生活中的点点滴滴</p>
            </div>

            <div className="flex items-center gap-3">
              {/* 视图切换 */}
              <div className="flex items-center gap-1 p-1 bg-background-secondary rounded-xl">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-primary text-white'
                      : 'hover:bg-white/5 text-foreground-secondary'
                  }`}
                >
                  <LayoutGrid size={20} />
                  <span className="text-sm font-medium">网格</span>
                </button>
                <button
                  onClick={() => setViewMode('timeline')}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                    viewMode === 'timeline'
                      ? 'bg-primary text-white'
                      : 'hover:bg-white/5 text-foreground-secondary'
                  }`}
                >
                  <History size={20} />
                  <span className="text-sm font-medium">时间轴</span>
                </button>
              </div>

              {/* 创建按钮 */}
              <button
                ref={createButtonRef}
                onClick={handleCreateNote}
                {...createButtonHandlers}
                className="px-6 py-3 bg-primary hover:bg-primary-hover rounded-xl flex items-center gap-2 transition-colors"
              >
                <Plus size={20} />
                <span className="font-medium">写笔记</span>
              </button>
            </div>
          </div>
        </div>

        {/* 内容区域 */}
        <div>
          {viewMode === 'grid' ? (
            <NoteGrid onNoteClick={handleNoteClick} onNoteDelete={handleDeleteNote} />
          ) : (
            <NoteTimeline onNoteClick={handleNoteClick} onNoteDelete={handleDeleteNote} />
          )}
        </div>
      </div>

      {/* 删除确认对话框 */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="删除笔记"
        description={`确认删除笔记「${noteToDelete?.title || '无标题'}」吗？此操作无法撤销。`}
        confirmText="确认删除"
        cancelText="取消"
        confirmTone="danger"
        loading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  );
}
