'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { facesApi } from '@/lib/api/faces';

type Scope = 'range' | 'all';

interface ScanHistoryModalProps {
  open: boolean;
  subjectName: string;
  onDone: () => void;
}

export function ScanHistoryModal({ open, subjectName, onDone }: ScanHistoryModalProps) {
  const [scope, setScope] = useState<Scope>('range');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setScope('range');
    setFrom('');
    setTo('');
    setLoading(false);
  }, [open]);

  if (!open) return null;

  const canStart = scope === 'all' || Boolean(from || to);

  const start = async () => {
    if (!canStart || loading) return;
    if (from && to && from > to) {
      toast.error('开始日期不能晚于结束日期');
      return;
    }
    setLoading(true);
    try {
      const result = await facesApi.backfill({
        missing_only: false,
        limit: 10000,
        shot_at_from: scope === 'range' && from ? from : undefined,
        shot_at_to: scope === 'range' && to ? to : undefined,
      });
      toast.success(result.queued ? `已排队检查 ${result.queued} 张历史素材` : '这个范围内没有可检查的素材');
      onDone();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : '补算失败，请确认 Worker 已启动');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/60 p-4 pt-24">
      <div className="w-full max-w-md rounded-2xl bg-background border border-white/10 shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-white/10">
          <h2 className="text-lg font-heading font-semibold">扫描历史素材？</h2>
          <p className="mt-1 text-sm text-foreground-secondary">
            刚添加了「{subjectName}」。可以对已有照片重新检脸，对得上才会留下。
          </p>
        </div>
        <div className="p-5 space-y-3">
          <label className="flex items-start gap-3 rounded-xl border border-white/10 p-3">
            <input
              type="radio"
              name="scan-scope"
              checked={scope === 'range'}
              onChange={() => setScope('range')}
              className="mt-1"
            />
            <span className="flex-1">
              <span className="block text-sm">按拍摄日期</span>
              <span className="mt-2 grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm"
                />
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm"
                />
              </span>
            </span>
          </label>
          <label className="flex items-center gap-3 rounded-xl border border-white/10 p-3">
            <input
              type="radio"
              name="scan-scope"
              checked={scope === 'all'}
              onChange={() => setScope('all')}
            />
            <span className="text-sm">全部素材</span>
          </label>
        </div>
        <div className="flex items-center justify-end gap-3 p-5 pt-0">
          <button
            type="button"
            onClick={onDone}
            disabled={loading}
            className="px-6 py-2.5 rounded-xl text-sm text-foreground-secondary hover:text-foreground hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            暂不扫描
          </button>
          <button
            type="button"
            onClick={start}
            disabled={loading || !canStart}
            className="px-6 py-2.5 rounded-xl text-sm bg-primary hover:bg-primary-hover text-primary-foreground transition-colors disabled:opacity-50"
          >
            {loading ? '排队中…' : '开始扫描'}
          </button>
        </div>
      </div>
    </div>
  );
}
