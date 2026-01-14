'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, FileText } from 'lucide-react';
import { notesApi } from '@/lib/api/notes';
import { NoteEditor, type NoteEditorValue } from '@/components/notes/NoteEditor';

const DRAFT_KEY = 'note-editor:draft:new:v1';

export default function NewNotePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: async (value: NoteEditorValue) => {
      const trimmedTitle = value.title.trim();
      return notesApi.createNote({
        title: trimmedTitle ? trimmedTitle : undefined,
        content: value.content,
        cover_asset_id: value.cover_asset_id ?? undefined,
      });
    },
    onSuccess: async (note) => {
      setErrorMessage(null);
      try {
        window.localStorage.removeItem(DRAFT_KEY);
      } catch {
        // ignore
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['notes'] }),
        queryClient.invalidateQueries({ queryKey: ['notes-timeline'] }),
      ]);

      router.push(`/notes/${note.id}`);
    },
    onError: (err: unknown) => {
      setErrorMessage(err instanceof Error ? err.message : '创建失败');
    },
  });

  return (
    <div className="min-h-screen py-10 px-6 md:px-8">
      <div className="max-w-[1920px] mx-auto">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <FileText size={34} className="text-primary" />
              <h1 className="text-3xl md:text-4xl font-heading font-bold">新建笔记</h1>
            </div>
            <p className="text-foreground-secondary">
              Markdown 源码编辑 + Streamdown 实时预览，支持插入素材引用与选择封面。
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push('/notes')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
          >
            <ArrowLeft size={16} />
            返回列表
          </button>
        </div>

        <NoteEditor
          initialValue={{ title: '', content: '', cover_asset_id: null }}
          draftKey={DRAFT_KEY}
          submitLabel="创建"
          submitting={createMutation.isPending}
          errorMessage={errorMessage}
          onCancel={() => router.push('/notes')}
          onSubmit={(value) => createMutation.mutate(value)}
        />
      </div>
    </div>
  );
}

