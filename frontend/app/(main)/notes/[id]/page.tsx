'use client';

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, FileText, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { type JSONContent } from 'novel';
import { notesApi } from '@/lib/api/notes';
import TailwindAdvancedEditor from '@/components/notes/novel-native/tailwind/advanced-editor';
import { resolveMediaUrl } from '@/lib/utils/mediaUrl';

export default function NoteDetailPage() {
  const params = useParams<{ id?: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const noteId = useMemo(() => Number(params?.id), [params?.id]);
  const isValidId = Number.isFinite(noteId) && noteId > 0;

  const noteQuery = useQuery({
    queryKey: ['note', noteId],
    queryFn: () => notesApi.getNote(noteId),
    enabled: isValidId,
  });

  const updateMutation = useMutation({
    mutationFn: async (content: JSONContent) => {
      return notesApi.updateNote(noteId, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note', noteId] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
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
        <div className="max-w-5xl mx-auto">
          <div className="h-10 w-56 rounded-xl bg-background-secondary border border-white/10 animate-pulse mb-4" />
          <div className="h-6 w-80 rounded-xl bg-background-secondary border border-white/10 animate-pulse mb-8" />
          <div className="h-[60vh] rounded-2xl bg-background-secondary border border-white/10 animate-pulse" />
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
  // 详情页封面：优先使用预览图（用于 HEIC 等格式），否则使用原图
  const coverUrl = resolveMediaUrl(note.cover_preview_url, note.cover_preview_path)
    || resolveMediaUrl(note.cover_original_url, note.cover_original_path)
    || resolveMediaUrl(note.cover_thumbnail_url, note.cover_thumbnail_path);
  const createdAtText = format(new Date(note.created_at), 'PPP', { locale: zhCN });
  const shotAtText = note.shot_at ? format(new Date(note.shot_at), 'PPP', { locale: zhCN }) : null;

  return (
    <div className="min-h-screen py-10 px-6 md:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-start justify-between gap-4 mb-8">
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <FileText size={34} className="text-primary" />
              <h1 className="text-3xl md:text-4xl font-heading font-bold truncate">
                {note.title || '无标题'}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-foreground-secondary">
              <span>创建于 {createdAtText}</span>
              {shotAtText && <span>叙事时间 {shotAtText}</span>}
            </div>
          </div>

          <button
            type="button"
            onClick={() => router.push('/notes')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
          >
            <ArrowLeft size={16} />
            返回
          </button>
        </div>

        {coverUrl && (
          <div className="relative aspect-[16/7] rounded-2xl overflow-hidden border border-white/10 bg-background-secondary mb-8">
            <img src={coverUrl} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        <div className="flex justify-center">
          <TailwindAdvancedEditor
            initialContent={note.content}
            onSave={(content) => updateMutation.mutate(content)}
            autoSave={true}
          />
        </div>
      </div>
    </div>
  );
}

