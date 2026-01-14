'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, FileText, AlertTriangle } from 'lucide-react';
import { notesApi } from '@/lib/api/notes';
import { NoteEditor, type NoteEditorValue } from '@/components/notes/NoteEditor';

export default function NoteEditPage() {
  const params = useParams<{ id?: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const noteId = useMemo(() => Number(params?.id), [params?.id]);
  const isValidId = Number.isFinite(noteId) && noteId > 0;
  const draftKey = isValidId ? `note-editor:draft:${noteId}:v1` : undefined;

  const noteQuery = useQuery({
    queryKey: ['note', noteId],
    queryFn: () => notesApi.getNote(noteId, { includeAssets: false }),
    enabled: isValidId,
  });

  const updateMutation = useMutation({
    mutationFn: async (value: NoteEditorValue) => {
      const trimmedTitle = value.title.trim();
      return notesApi.updateNote(noteId, {
        title: trimmedTitle ? trimmedTitle : null,
        content: value.content,
        cover_asset_id: value.cover_asset_id,
      });
    },
    onSuccess: async () => {
      setErrorMessage(null);
      if (draftKey) {
        try {
          window.localStorage.removeItem(draftKey);
        } catch {
          // ignore
        }
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['note', noteId] }),
        queryClient.invalidateQueries({ queryKey: ['notes'] }),
        queryClient.invalidateQueries({ queryKey: ['notes-timeline'] }),
      ]);

      router.push(`/notes/${noteId}`);
    },
    onError: (err: unknown) => {
      setErrorMessage(err instanceof Error ? err.message : '保存失败');
    },
  });

  if (!isValidId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="w-full max-w-md rounded-2xl bg-background-secondary border border-white/10 p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={26} className="text-foreground-secondary" />
          </div>
          <h1 className="text-2xl font-heading font-semibold mb-2">无效的笔记 ID</h1>
          <p className="text-sm text-foreground-secondary mb-6">请检查链接是否正确。</p>
          <button
            type="button"
            onClick={() => router.push('/notes')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white transition-colors"
          >
            返回笔记列表
          </button>
        </div>
      </div>
    );
  }

  if (noteQuery.isLoading) {
    return (
      <div className="min-h-screen py-10 px-6 md:px-8">
        <div className="max-w-[1920px] mx-auto">
          <div className="h-10 w-64 rounded-xl bg-background-secondary border border-white/10 animate-pulse mb-8" />
          <div className="h-[70vh] rounded-2xl bg-background-secondary border border-white/10 animate-pulse" />
        </div>
      </div>
    );
  }

  if (noteQuery.isError || !noteQuery.data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="w-full max-w-md rounded-2xl bg-background-secondary border border-white/10 p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={26} className="text-red-400" />
          </div>
          <h1 className="text-2xl font-heading font-semibold mb-2">加载失败</h1>
          <p className="text-sm text-foreground-secondary mb-6">笔记不存在或网络错误</p>
          <button
            type="button"
            onClick={() => router.push('/notes')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white transition-colors"
          >
            返回笔记列表
          </button>
        </div>
      </div>
    );
  }

  const note = noteQuery.data;

  return (
    <div className="min-h-screen py-10 px-6 md:px-8">
      <div className="max-w-[1920px] mx-auto">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <FileText size={34} className="text-primary" />
              <h1 className="text-3xl md:text-4xl font-heading font-bold">编辑笔记</h1>
            </div>
            <p className="text-foreground-secondary">编辑 Markdown 源码并实时预览。</p>
          </div>

          <button
            type="button"
            onClick={() => router.push(`/notes/${noteId}`)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
          >
            <ArrowLeft size={16} />
            返回详情
          </button>
        </div>

        <NoteEditor
          initialValue={{
            title: note.title ?? '',
            content: note.content,
            cover_asset_id: note.cover_asset_id ?? null,
          }}
          draftKey={draftKey}
          submitLabel="保存"
          submitting={updateMutation.isPending}
          errorMessage={errorMessage}
          onCancel={() => router.push(`/notes/${noteId}`)}
          onSubmit={(value) => updateMutation.mutate(value)}
        />
      </div>
    </div>
  );
}

