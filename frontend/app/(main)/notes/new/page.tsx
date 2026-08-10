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
    coverPositionX: number;
    coverPositionY: number;
    content: JSONContent;
    contentMarkdown: string;
  }) => {
    try {
      if (noteId) {
        await notesApi.updateNote(noteId, {
          title: data.title || '无标题',
          content: data.content,
          content_markdown: data.contentMarkdown,
          cover_asset_id: data.coverAssetId,
          cover_position_x: data.coverPositionX,
          cover_position_y: data.coverPositionY,
        });
      } else {
        const note = await notesApi.createNote({
          title: data.title || '无标题',
          content: data.content,
          content_markdown: data.contentMarkdown,
          cover_asset_id: data.coverAssetId,
          cover_position_x: data.coverPositionX,
          cover_position_y: data.coverPositionY,
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
    <div className="relative min-h-dvh bg-background">
      <NoteEditorNavbar />
      <div className="relative z-10 px-4 sm:px-6 pb-16 pt-20">
        <NoteEditor onSave={handleSave} autoSave={true} />
      </div>
    </div>
  );
}
