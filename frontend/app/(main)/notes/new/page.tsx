'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, FileText, Save } from 'lucide-react';
import { type JSONContent } from 'novel';
import { notesApi } from '@/lib/api/notes';
import TailwindAdvancedEditor from '@/components/notes/novel-native/tailwind/advanced-editor';

export default function NewNotePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [content, setContent] = useState<JSONContent | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!content) {
        throw new Error('笔记内容不能为空');
      }
      return notesApi.createNote({
        title: null,
        content,
      });
    },
    onSuccess: async (note) => {
      setErrorMessage(null);

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

  const handleSave = () => {
    createMutation.mutate();
  };

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
              Notion 风格编辑器，支持富文本、代码块、图片等多种内容类型。
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={createMutation.isPending || !content}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save size={16} />
              {createMutation.isPending ? '保存中...' : '保存'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/notes')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
            >
              <ArrowLeft size={16} />
              返回
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
            {errorMessage}
          </div>
        )}

        <div className="flex justify-center">
          <TailwindAdvancedEditor
            initialContent={undefined}
            onSave={(json) => setContent(json)}
            autoSave={true}
          />
        </div>
      </div>
    </div>
  );
}

