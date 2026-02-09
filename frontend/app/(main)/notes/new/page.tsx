'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { NoteEditor, type NoteEditorRef } from '@/components/notes/NoteEditor';
import { NoteEditorNavbar } from '@/components/notes/NoteEditorNavbar';
import { notesApi } from '@/lib/api/notes';
import { toast } from 'sonner';
import type { JSONContent } from 'novel';

export default function NewNotePage() {
  const router = useRouter();
  const editorRef = useRef<NoteEditorRef>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [noteId, setNoteId] = useState<number | null>(null);

  const handleSave = async (data: {
    title: string;
    coverAssetId: number | null;
    content: JSONContent;
  }) => {
    try {
      if (noteId) {
        // 更新已存在的笔记
        await notesApi.updateNote(noteId, {
          title: data.title || '无标题',
          content: data.content,
          cover_asset_id: data.coverAssetId,
        });
      } else {
        // 创建新笔记
        const note = await notesApi.createNote({
          title: data.title || '无标题',
          content: data.content,
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

  const handleManualSave = async () => {
    if (editorRef.current) {
      await editorRef.current.triggerSave();
    }
  };

  return (
    <div className="min-h-screen relative">
      {/* 导航栏 */}
      <NoteEditorNavbar
        isSaving={isSaving}
        lastSaved={lastSaved}
        onSave={handleManualSave}
      />

      {/* 内容区域 */}
      <div className="relative z-10 pb-12 px-6">
        <NoteEditor
          ref={editorRef}
          onSave={handleSave}
          autoSave={true}
          onSavingChange={setIsSaving}
          onLastSavedChange={setLastSaved}
        />
      </div>
    </div>
  );
}
