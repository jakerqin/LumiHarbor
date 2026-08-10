'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { type JSONContent } from 'novel';
import { notesApi } from '@/lib/api/notes';
import TailwindAdvancedEditor from '@/components/notes/novel-native/tailwind/advanced-editor';
import { CoverFocalEditor } from '@/components/albums/CoverFocalEditor';
import { NoteBackButton } from '@/components/notes/NoteBackButton';
import { NotePaperShell } from '@/components/notes/NotePaperShell';
import { resolveMediaUrl } from '@/lib/utils/mediaUrl';
import { jsonToMarkdown } from '@/lib/utils/jsonToMarkdown';

function formatModifiedLabel(iso: string): string {
  const date = new Date(iso);
  if (isToday(date)) return '今天修改';
  if (isYesterday(date)) return '昨天修改';
  return `${format(date, 'PPP', { locale: zhCN })}修改`;
}

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

  const [coverPositionX, setCoverPositionX] = useState(50);
  const [coverPositionY, setCoverPositionY] = useState(50);
  const positionSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncedNoteIdRef = useRef<number | null>(null);

  useEffect(() => {
    const note = noteQuery.data;
    if (!note || syncedNoteIdRef.current === note.id) return;
    syncedNoteIdRef.current = note.id;
    setCoverPositionX(note.cover_position_x ?? 50);
    setCoverPositionY(note.cover_position_y ?? 50);
  }, [noteQuery.data]);

  const updateMutation = useMutation({
    mutationFn: async (content: JSONContent) => {
      const markdown = jsonToMarkdown(content);
      return notesApi.updateNote(noteId, {
        content,
        content_markdown: markdown,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note', noteId] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });

  const saveCoverPosition = (x: number, y: number) => {
    setCoverPositionX(x);
    setCoverPositionY(y);
    if (positionSaveRef.current) clearTimeout(positionSaveRef.current);
    positionSaveRef.current = setTimeout(async () => {
      try {
        await notesApi.updateNote(noteId, {
          cover_position_x: x,
          cover_position_y: y,
        });
        queryClient.invalidateQueries({ queryKey: ['notes'] });
      } catch (error) {
        console.error('保存封面焦点失败:', error);
      }
    }, 500);
  };

  useEffect(() => {
    return () => {
      if (positionSaveRef.current) clearTimeout(positionSaveRef.current);
    };
  }, []);

  if (!isValidId) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center px-6">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-background-secondary p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
            <AlertTriangle size={26} className="text-foreground-secondary" />
          </div>
          <h1 className="mb-2 font-heading text-2xl font-semibold">无效的笔记 ID</h1>
          <p className="mb-6 text-sm text-foreground-secondary">请检查链接是否正确。</p>
          <button
            type="button"
            onClick={() => router.push('/notes')}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            返回笔记列表
          </button>
        </div>
      </div>
    );
  }

  if (noteQuery.isLoading) {
    return (
      <div className="relative min-h-dvh px-4 sm:px-6 pb-16 pt-20">
        <NoteBackButton />
        <div className="mx-auto max-w-3xl lg:max-w-4xl">
          <div className="h-[70vh] animate-pulse rounded-2xl bg-[#141210] border border-white/[0.06]" />
        </div>
      </div>
    );
  }

  if (noteQuery.isError || !noteQuery.data) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center px-6">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-background-secondary p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10">
            <AlertTriangle size={26} className="text-red-400" />
          </div>
          <h1 className="mb-2 font-heading text-2xl font-semibold">加载失败</h1>
          <p className="mb-6 text-sm text-foreground-secondary">笔记不存在或网络错误</p>
          <button
            type="button"
            onClick={() => router.push('/notes')}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            返回笔记列表
          </button>
        </div>
      </div>
    );
  }

  const note = noteQuery.data;
  const coverUrl =
    resolveMediaUrl(note.cover_preview_url, note.cover_preview_path) ||
    resolveMediaUrl(note.cover_original_url, note.cover_original_path) ||
    resolveMediaUrl(note.cover_thumbnail_url, note.cover_thumbnail_path);
  const modifiedLabel = formatModifiedLabel(note.updated_at || note.created_at);
  const shotAtText = note.shot_at
    ? format(new Date(note.shot_at), 'PPP', { locale: zhCN })
    : null;

  return (
    <div className="relative min-h-dvh bg-background">
      <NoteBackButton />

      <div className="relative z-10 px-4 sm:px-6 pb-16 pt-20">
        <div className="mx-auto max-w-3xl lg:max-w-4xl">
          <NotePaperShell>
            {coverUrl && (
              <CoverFocalEditor
                src={coverUrl}
                alt=""
                positionX={coverPositionX}
                positionY={coverPositionY}
                onChange={saveCoverPosition}
                className="aspect-[16/7] w-full rounded-none"
              />
            )}

            <div className="px-8 sm:px-12 pt-10 pb-2">
              <h1 className="font-heading text-4xl sm:text-5xl font-semibold tracking-tight text-white text-balance">
                {note.title || '无标题'}
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/40">
                <span>{modifiedLabel}</span>
                {shotAtText && (
                  <>
                    <span className="text-white/20" aria-hidden>
                      |
                    </span>
                    <span>叙事时间 {shotAtText}</span>
                  </>
                )}
              </div>
            </div>

            <TailwindAdvancedEditor
              initialContent={note.content}
              onSave={(content) => updateMutation.mutate(content)}
              autoSave={true}
            />
          </NotePaperShell>
        </div>
      </div>
    </div>
  );
}
