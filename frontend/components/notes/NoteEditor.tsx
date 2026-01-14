'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Image as ImageIcon, Paperclip, Save, XCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { Asset } from '@/lib/api/types';
import { assetsApi } from '@/lib/api/assets';
import { AssetPickerModal } from '@/components/assets/AssetPickerModal';
import { NoteMarkdown } from '@/components/notes/NoteMarkdown';
import { resolveMediaUrl } from '@/lib/utils/mediaUrl';

export type NoteEditorValue = {
  title: string;
  content: string;
  cover_asset_id: number | null;
};

export interface NoteEditorProps {
  initialValue: NoteEditorValue;
  draftKey?: string;
  submitLabel?: string;
  submitting?: boolean;
  errorMessage?: string | null;
  onSubmit: (value: NoteEditorValue) => void;
  onCancel?: () => void;
  onDraftRestored?: () => void;
}

type NoteEditorDraft = {
  v: 1;
  savedAt: number;
  value: {
    title: string;
    content: string;
    cover_asset_id: number | null;
  };
};

function readDraft(key: string): NoteEditorDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<NoteEditorDraft>;
    if (parsed?.v !== 1 || typeof parsed.savedAt !== 'number' || !parsed.value) return null;
    if (typeof parsed.value.title !== 'string' || typeof parsed.value.content !== 'string') return null;
    const coverId = parsed.value.cover_asset_id;
    if (coverId !== null && typeof coverId !== 'number') return null;
    return parsed as NoteEditorDraft;
  } catch {
    return null;
  }
}

function writeDraft(key: string, draft: NoteEditorDraft) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(draft));
  } catch {
    // localStorage 不可用/空间不足时，忽略
  }
}

export function NoteEditor({
  initialValue,
  draftKey,
  submitLabel = '保存',
  submitting = false,
  errorMessage,
  onSubmit,
  onCancel,
  onDraftRestored,
}: NoteEditorProps) {
  const [title, setTitle] = useState(initialValue.title);
  const [content, setContent] = useState(initialValue.content);
  const [coverAssetId, setCoverAssetId] = useState<number | null>(initialValue.cover_asset_id);
  const [coverAsset, setCoverAsset] = useState<Asset | null>(null);
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);
  const [insertPickerOpen, setInsertPickerOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const coverAssetQuery = useQuery({
    queryKey: ['asset', coverAssetId],
    queryFn: () => assetsApi.getAsset(coverAssetId as number),
    enabled: coverAssetId !== null && coverAsset === null,
  });

  const resolvedCoverAsset = coverAsset ?? coverAssetQuery.data ?? null;
  const previewAssets = useMemo(() => (resolvedCoverAsset ? [resolvedCoverAsset] : []), [resolvedCoverAsset]);

  // 草稿恢复（仅在首次挂载时执行）
  useEffect(() => {
    if (!draftKey) return;
    const draft = readDraft(draftKey);
    if (!draft) return;

    setTitle(draft.value.title);
    setContent(draft.value.content);
    setCoverAssetId(draft.value.cover_asset_id);
    setCoverAsset(null);

    onDraftRestored?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 自动保存草稿（debounce）
  useEffect(() => {
    if (!draftKey) return;
    const timer = window.setTimeout(() => {
      writeDraft(draftKey, {
        v: 1,
        savedAt: Date.now(),
        value: {
          title,
          content,
          cover_asset_id: coverAssetId,
        },
      });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [content, coverAssetId, draftKey, title]);

  const coverUrl = resolvedCoverAsset
    ? resolveMediaUrl(resolvedCoverAsset.thumbnail_url ?? null, resolvedCoverAsset.thumbnail_path)
    : null;

  const canSubmit = content.trim().length > 0 && !submitting;

  const insertAtCursor = (snippet: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setContent((prev) => prev + snippet);
      return;
    }

    const start = textarea.selectionStart ?? content.length;
    const end = textarea.selectionEnd ?? content.length;
    const next = content.slice(0, start) + snippet + content.slice(end);
    setContent(next);

    requestAnimationFrame(() => {
      textarea.focus();
      const nextPos = start + snippet.length;
      textarea.setSelectionRange(nextPos, nextPos);
    });
  };

  return (
    <div className="space-y-6">
      {/* 顶部工具栏 */}
      <div className="rounded-2xl bg-background-secondary border border-white/10 p-5">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <label className="block text-sm text-foreground-secondary mb-2">标题（可选）</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="无标题笔记…"
              className="w-full px-4 py-3 rounded-xl bg-background border border-white/10 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
            />

            {coverAssetId !== null && (
              <div className="mt-4 flex items-start gap-4">
                <div className="w-40 aspect-video rounded-xl overflow-hidden bg-background border border-white/10">
                  {coverUrl ? (
                    <img src={coverUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-foreground-secondary text-sm">
                      封面加载中…
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-sm text-foreground-secondary mb-2">封面素材</div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCoverPickerOpen(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                    >
                      <ImageIcon size={16} />
                      更换封面
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCoverAssetId(null);
                        setCoverAsset(null);
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-foreground-secondary"
                    >
                      <XCircle size={16} />
                      移除
                    </button>
                    {coverAssetId !== null && (
                      <span className="text-xs text-foreground-tertiary">ID: {coverAssetId}</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={() => setCoverPickerOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
            >
              <ImageIcon size={16} />
              {coverAsset ? '更换封面' : '选择封面'}
            </button>
            <button
              type="button"
              onClick={() => setInsertPickerOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
            >
              <Paperclip size={16} />
              插入素材
            </button>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-foreground-secondary"
              >
                取消
              </button>
            )}
            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => onSubmit({ title, content, cover_asset_id: coverAssetId })}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Save size={16} />
              {submitting ? '保存中…' : submitLabel}
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-300">
            {errorMessage}
          </div>
        )}
      </div>

      {/* 编辑区 / 预览区 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6">
          <div className="rounded-2xl bg-background-secondary border border-white/10 overflow-hidden">
            <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between">
              <div className="text-sm text-foreground-secondary">Markdown 源码</div>
              <div className="text-xs text-foreground-tertiary">
                插入素材建议用：<span className="font-mono">![](asset://123)</span>
              </div>
            </div>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="在这里写 Markdown…"
              className="w-full h-[60vh] px-5 py-4 bg-background text-foreground font-mono text-sm leading-6 outline-none resize-none"
            />
          </div>
        </div>

        <div className="lg:col-span-6">
          <div className="rounded-2xl bg-background-secondary border border-white/10 overflow-hidden">
            <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between">
              <div className="text-sm text-foreground-secondary">实时预览</div>
              <div className="text-xs text-foreground-tertiary">Streamdown</div>
            </div>
            <div className="p-5 max-h-[60vh] overflow-auto">
              <NoteMarkdown
                markdown={content || ' '}
                assets={previewAssets}
                className="space-y-4 text-foreground"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 选择封面 */}
      <AssetPickerModal
        open={coverPickerOpen}
        title="选择笔记封面"
        description="从素材库中选择一张图片/视频缩略图作为封面"
        onClose={() => setCoverPickerOpen(false)}
        onSelect={(asset) => {
          setCoverAssetId(asset.id);
          setCoverAsset(asset);
        }}
      />

      {/* 插入素材 */}
      <AssetPickerModal
        open={insertPickerOpen}
        title="插入素材到正文"
        description="点击素材卡片即可在光标处插入 asset:// 引用"
        onClose={() => setInsertPickerOpen(false)}
        onSelect={(asset) => {
          insertAtCursor(`![](asset://${asset.id})`);
        }}
      />
    </div>
  );
}
