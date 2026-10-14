'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ImagePlus, Loader2, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { AiPromptForm, canSubmitPrompt, type AiPromptValue } from '@/components/ai/AiPromptForm';
import { AssetPickerModal } from '@/components/common/AssetPickerModal';
import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageShell } from '@/components/layout/PageShell';
import { aiImageApi, type AiGenerateSize, type AiImageJob } from '@/lib/api/aiImage';
import { assetsApi } from '@/lib/api/assets';
import type { Asset } from '@/lib/api/types';
import { useAiImageStatus, useAiJob } from '@/lib/hooks/useAiImage';
import { cn } from '@/lib/utils/cn';
import { resolveMediaUrl } from '@/lib/utils/mediaUrl';

export const dynamic = 'force-dynamic';

const MAX_REFERENCES = 4;
const SIZES: { value: AiGenerateSize; label: string; box: string }[] = [
  { value: 'square', label: '方图', box: 'w-4 h-4' },
  { value: 'landscape', label: '横图', box: 'w-5 h-3.5' },
  { value: 'portrait', label: '竖图', box: 'w-3.5 h-5' },
];

const pill = (active: boolean) => cn(
  'px-3.5 h-9 inline-flex items-center gap-2 rounded-full text-sm border transition-colors',
  active ? 'bg-primary/15 text-primary border-primary/30' : 'bg-white/5 text-foreground-secondary border-white/10 hover:bg-white/10'
);

function ReferencePicker({ refs, onChange }: { refs: Asset[]; onChange: (refs: Asset[]) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-2">
      <p className="text-sm text-foreground-secondary">参考图（可选，最多 {MAX_REFERENCES} 张，例如让贺卡里出现家人）</p>
      <div className="flex flex-wrap gap-3">
        {refs.map((ref) => (
          <div key={ref.id} className="relative">
            <img src={resolveMediaUrl(ref.thumbnail_url, ref.thumbnail_path) || '/icon.svg'} alt="" className="w-20 h-20 rounded-xl object-cover" />
            <button type="button" onClick={() => onChange(refs.filter((r) => r.id !== ref.id))} aria-label="移除"
              className="absolute -top-1.5 -right-1.5 h-6 w-6 rounded-full bg-background border border-white/20 inline-flex items-center justify-center">
              <X size={12} />
            </button>
          </div>
        ))}
        {refs.length < MAX_REFERENCES && (
          <button type="button" onClick={() => setOpen(true)}
            className="w-20 h-20 rounded-xl border border-dashed border-white/20 hover:bg-white/5 inline-flex items-center justify-center text-foreground-secondary transition-colors">
            <ImagePlus size={20} />
          </button>
        )}
      </div>
      <AssetPickerModal
        open={open}
        multiSelect
        title="选择参考图"
        onClose={() => setOpen(false)}
        onMultiSelect={(picked) => {
          const merged = [...refs, ...picked.filter((p) => p.asset_type === 'image' && !refs.some((r) => r.id === p.id))];
          onChange(merged.slice(0, MAX_REFERENCES));
          setOpen(false);
        }}
      />
    </div>
  );
}

function GenerateResult({ job, onAgain }: { job: AiImageJob; onAgain: () => void }) {
  const { data: asset } = useQuery({
    queryKey: ['asset', job.result_asset_id],
    queryFn: () => assetsApi.getAsset(job.result_asset_id as number),
    enabled: job.result_asset_id !== null,
  });
  const url = asset ? resolveMediaUrl(asset.preview_url) || resolveMediaUrl(asset.original_url, asset.original_path) : null;
  return (
    <div className="space-y-4">
      {url ? <img src={url} alt="生成结果" className="w-full max-h-[70vh] object-contain rounded-2xl bg-black/30" />
        : <div className="h-72 rounded-2xl bg-background-secondary animate-pulse" />}
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onAgain}
          className="h-10 px-4 rounded-xl text-sm bg-white/5 hover:bg-white/10 border border-white/10 transition-colors">再生成一张</button>
        {job.result_asset_id && (
          <Link href={`/assets/${job.result_asset_id}`}
            className="h-10 px-5 rounded-xl text-sm bg-primary text-primary-foreground hover:bg-primary-hover inline-flex items-center transition-colors">
            查看素材
          </Link>
        )}
      </div>
    </div>
  );
}

export default function AiCreatePage() {
  const queryClient = useQueryClient();
  const status = useAiImageStatus();
  const [form, setForm] = useState<AiPromptValue>({ presetCode: null, prompt: '', tier: 'standard' });
  const [size, setSize] = useState<AiGenerateSize>('square');
  const [refs, setRefs] = useState<Asset[]>([]);
  const [jobId, setJobId] = useState<number | null>(null);
  const job = useAiJob(jobId).data;

  const createMutation = useMutation({
    mutationFn: () => aiImageApi.createJob({
      job_type: 'generate', preset_code: form.presetCode ?? undefined, prompt: form.prompt.trim() || undefined,
      tier: form.tier, size, reference_asset_ids: refs.map((r) => r.id),
    }),
    onSuccess: (created) => setJobId(created.id),
    onError: (error: Error) => toast.error(error.message || '发起失败'),
  });

  // 生成成功后刷新素材库列表（新图已入库）
  const succeeded = job?.status === 'success';
  useEffect(() => {
    if (succeeded) queryClient.invalidateQueries({ queryKey: ['assets'] });
  }, [succeeded, queryClient]);
  const presets = status.data?.generate ?? [];
  const busy = createMutation.isPending || job?.status === 'pending' || job?.status === 'running';

  return (
    <PageShell narrow>
      <PageHeader
        title="AI 创作"
        description="用文字生成图片，可以拿已有素材当参考。生成结果会存进素材库并标上「AI」。"
        actions={<Link href="/assets" className="h-10 px-4 rounded-xl bg-background-secondary hover:bg-background-tertiary border border-white/10 inline-flex items-center gap-2 text-sm transition-colors"><ArrowLeft size={16} />素材库</Link>}
      />
      {status.data && !status.data.enabled ? (
        <EmptyState
          title="AI 创作未开启"
          description={status.data.configured ? '在「设置 → 任务」里打开「AI 修图与生图」。' : '需要先在后端 .env 配置 OPENAI_API_KEY。'}
          action={{ label: '去设置', href: '/settings/tasks' }}
        />
      ) : job?.status === 'success' ? (
        <GenerateResult job={job} onAgain={() => setJobId(null)} />
      ) : (
        <div className="space-y-6">
          <AiPromptForm presets={presets} value={form} onChange={setForm} disabled={busy}
            freePlaceholder="描述想要的画面，例如「一家三口在海边看日落，温暖的胶片风格」" />
          <div className="flex flex-wrap gap-2">
            {SIZES.map((item) => (
              <button key={item.value} type="button" onClick={() => setSize(item.value)} disabled={busy} className={pill(size === item.value)}>
                <span className={cn('rounded-sm border border-current', item.box)} />
                {item.label}
              </button>
            ))}
          </div>
          <ReferencePicker refs={refs} onChange={setRefs} />
          {job?.status === 'failed' && (
            <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-3.5 py-2.5">{job.error_message || '生成失败'}</p>
          )}
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-foreground-tertiary">{busy ? '生成中，通常 30–60 秒' : '会调用 OpenAI 并按次计费'}</p>
            <button type="button" onClick={() => { setJobId(null); createMutation.mutate(); }}
              disabled={busy || !canSubmitPrompt(presets, form)}
              className="h-10 px-5 rounded-xl bg-primary text-primary-foreground hover:bg-primary-hover inline-flex items-center gap-2 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {busy ? '生成中…' : '生成'}
            </button>
          </div>
        </div>
      )}
    </PageShell>
  );
}
