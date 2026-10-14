'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { aiImageApi, type AiImageJob, type AiPreset } from '@/lib/api/aiImage';
import { useAiJob } from '@/lib/hooks/useAiImage';
import { cn } from '@/lib/utils/cn';
import { resolveMediaUrl } from '@/lib/utils/mediaUrl';
import { AiPromptForm, canSubmitPrompt, type AiPromptValue } from './AiPromptForm';
import { BeforeAfter } from './BeforeAfter';

interface AiEditPanelProps {
  open: boolean;
  assetId: number;
  /** 当前展示的图（修图就是在它基础上改） */
  beforeUrl: string;
  presets: AiPreset[];
  onClose: () => void;
}

const EMPTY: AiPromptValue = { presetCode: null, prompt: '', tier: 'standard' };

/** 详情页「AI 修图」弹窗：选预设/写描述 → 生成（轮询）→ 对比 → 设为当前 / 删除 */
export function AiEditPanel({ open, assetId, beforeUrl, presets, onClose }: AiEditPanelProps) {
  const [form, setForm] = useState<AiPromptValue>(EMPTY);
  const [jobId, setJobId] = useState<number | null>(null);
  const job = useAiJob(jobId).data;

  const createMutation = useMutation({
    mutationFn: () => aiImageApi.createJob({
      job_type: 'edit',
      asset_id: assetId,
      preset_code: form.presetCode ?? undefined,
      prompt: form.prompt.trim() || undefined,
      tier: form.tier,
    }),
    onSuccess: (created) => setJobId(created.id),
    onError: (error: Error) => toast.error(error.message || '发起失败'),
  });

  if (!open) return null;

  const busy = createMutation.isPending || job?.status === 'pending' || job?.status === 'running';
  const reset = () => setJobId(null);

  return (
    <div className="fixed inset-0 z-50">
      <button type="button" className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-label="关闭" onClick={onClose} />
      <div className="absolute inset-0 flex items-start justify-center p-4 pt-16 md:pt-24 overflow-y-auto">
        <div className={cn(
          'relative w-full rounded-2xl bg-background border border-white/10 shadow-2xl',
          // 出结果时加宽，两张图并排才看得清
          job?.status === 'success' ? 'max-w-5xl' : 'max-w-2xl'
        )}>
          <div className="flex items-start justify-between gap-4 p-5 border-b border-white/10">
            <div>
              <h2 className="text-lg font-heading font-semibold">AI 修图</h2>
              <p className="mt-1 text-sm text-foreground-secondary">
                图片会上传到 OpenAI 处理并按次计费；结果另存为新版本，原图不会改动。
              </p>
            </div>
            <button type="button" onClick={onClose} aria-label="关闭"
              className="h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors">
              <X size={18} />
            </button>
          </div>

          <div className="p-5">
            {job?.status === 'success' ? (
              <EditResult assetId={assetId} job={job} beforeUrl={beforeUrl} onDone={onClose} onAgain={reset} />
            ) : (
              <div className="space-y-5">
                <AiPromptForm presets={presets} value={form} onChange={setForm} disabled={busy}
                  freePlaceholder="描述想怎么改，例如「把背景里的电线去掉，天空更蓝一点」" />
                {job?.status === 'failed' && (
                  <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-3.5 py-2.5">
                    {job.error_message || '处理失败'}
                  </p>
                )}
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-foreground-tertiary">
                    {busy ? '生成中，通常 30–60 秒；可以关掉弹窗，完成后出现在版本条里' : ''}
                  </p>
                  <button type="button"
                    onClick={() => { reset(); createMutation.mutate(); }}
                    disabled={busy || !canSubmitPrompt(presets, form)}
                    className="h-10 px-5 rounded-xl bg-primary text-primary-foreground hover:bg-primary-hover inline-flex items-center gap-2 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    {busy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    {busy ? '生成中…' : job?.status === 'failed' ? '重试' : '开始'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EditResult({ assetId, job, beforeUrl, onDone, onAgain }: {
  assetId: number;
  job: AiImageJob;
  beforeUrl: string;
  onDone: () => void;
  onAgain: () => void;
}) {
  const queryClient = useQueryClient();
  const versionsQuery = useQuery({
    queryKey: ['asset-versions', assetId],
    queryFn: () => aiImageApi.getVersions(assetId),
  });
  const version = versionsQuery.data?.versions.find((v) => v.id === job.result_version_id);
  const afterUrl = resolveMediaUrl(version?.image_url);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['asset', assetId] });
    queryClient.invalidateQueries({ queryKey: ['asset-versions', assetId] });
    queryClient.invalidateQueries({ queryKey: ['assets'] });
  };
  const apply = useMutation({
    mutationFn: () => aiImageApi.setCurrentVersion(assetId, job.result_version_id),
    onSuccess: () => { refresh(); toast.success('已设为当前显示'); onDone(); },
    onError: () => toast.error('切换失败'),
  });
  const discard = useMutation({
    mutationFn: () => aiImageApi.deleteVersion(assetId, job.result_version_id as number),
    onSuccess: () => { refresh(); onAgain(); },
    onError: () => toast.error('删除失败'),
  });

  return (
    <div className="space-y-4">
      {afterUrl ? <BeforeAfter before={beforeUrl} after={afterUrl} /> : (
        <div className="h-64 rounded-xl bg-background-secondary animate-pulse" />
      )}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button type="button" onClick={() => discard.mutate()} disabled={discard.isPending}
          className="h-10 px-4 rounded-xl text-sm text-red-300 hover:bg-red-500/10 transition-colors disabled:opacity-50">
          不要了，删掉
        </button>
        <button type="button" onClick={onAgain}
          className="h-10 px-4 rounded-xl text-sm bg-white/5 hover:bg-white/10 border border-white/10 transition-colors">
          再改一次
        </button>
        <button type="button" onClick={() => apply.mutate()} disabled={apply.isPending}
          className="h-10 px-5 rounded-xl text-sm bg-primary text-primary-foreground hover:bg-primary-hover transition-colors disabled:opacity-50">
          设为当前显示
        </button>
      </div>
      <p className="text-xs text-foreground-tertiary text-right">不设为当前也会保留在版本条里，随时可以切换</p>
    </div>
  );
}
