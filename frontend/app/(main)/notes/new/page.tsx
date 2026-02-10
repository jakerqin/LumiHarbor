'use client';

import { useState } from 'react';
import { NoteEditor } from '@/components/notes/NoteEditor';
import { NoteEditorNavbar } from '@/components/notes/NoteEditorNavbar';
import { notesApi } from '@/lib/api/notes';
import { toast } from 'sonner';
import type { JSONContent } from 'novel';

export default function NewNotePage() {
  const [noteId, setNoteId] = useState<number | null>(null);

  const handleSave = async (data: {
    title: string;
    coverAssetId: number | null;
    content: JSONContent;
    contentMarkdown: string;
  }) => {
    try {
      if (noteId) {
        // 更新已存在的笔记
        await notesApi.updateNote(noteId, {
          title: data.title || '无标题',
          content: data.content,
          content_markdown: data.contentMarkdown,
          cover_asset_id: data.coverAssetId,
        });
      } else {
        // 创建新笔记
        const note = await notesApi.createNote({
          title: data.title || '无标题',
          content: data.content,
          content_markdown: data.contentMarkdown,
          cover_asset_id: data.coverAssetId,
        });
        setNoteId(note.id);
      }
    } catch (error) {
      console.error('保存笔记失败:', error);
      toast.error('保存失败，请重试');
      throw error;
    }
  };

  return (
    <div className="min-h-screen relative">
      {/* 导航栏 */}
      <NoteEditorNavbar />

      {/* 内容区域 */}
      <div className="relative z-10 pb-12 px-6 pt-20">
        <NoteEditor
          onSave={handleSave}
          autoSave={true}
        />
      </div>
    </div>
  );
}
