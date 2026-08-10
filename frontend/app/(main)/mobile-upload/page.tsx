'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Wifi, Copy, Check, FolderOpen, RotateCcw, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
import { ShootLocationField } from '@/components/common/ShootLocationField';
import type { LocationData } from '@/components/common/MapPicker';
import { MobileAssetPicker } from '@/components/upload/MobileAssetPicker';
import { AlbumTargetSection } from '@/components/upload/AlbumTargetSection';
import { useMobileUploadQueue } from '@/lib/hooks/useMobileUploadQueue';
import type { AlbumTarget } from '@/lib/api/ingestion';

// 禁用静态生成：页面依赖浏览器 File / localStorage API
export const dynamic = 'force-dynamic';

export default function MobileUploadPage() {
  const {
    items,
    summary,
    isUploading,
    albumResult,
    addFiles,
    removeItem,
    reset,
    startUpload,
    retryFailed,
  } = useMobileUploadQueue();
  const [albumTarget, setAlbumTarget] = useState<AlbumTarget>({ mode: 'none' });
  const [locationData, setLocationData] = useState<LocationData | null>(null);

  // 一旦有文件真正进入过上传流程（而不仅仅是被判定为“已传过”），相册/地点就锁定，
  // 避免和 useMobileUploadQueue 内部已解析的 albumId 产生歧义
  const hasStarted = items.some((item) => item.status === 'uploading' || item.status === 'success' || item.status === 'failed');
  const allSettled = items.length > 0 && summary.pending === 0 && !isUploading;

  const handleStartUpload = () => {
    if (summary.pending === 0 || isUploading) return;
    startUpload(albumTarget, locationData || undefined);
  };

  const handleReset = () => {
    reset();
    setLocationData(null);
  };

  return (
    <div
      className={
        summary.pending > 0
          ? 'min-h-screen pb-[calc(3.5rem+5.5rem+env(safe-area-inset-bottom))] md:pb-28'
          : 'min-h-screen pb-[calc(3.5rem+env(safe-area-inset-bottom)+1.5rem)] md:pb-28'
      }
    >
      <header className="sticky top-0 z-10 backdrop-blur-xl bg-background/80 border-b border-white/10 px-4 py-3 flex items-center gap-3">
        <Link
          href="/assets"
          className="h-9 w-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          aria-label="返回素材库"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-lg font-heading font-semibold">快速上传</h1>
          <p className="text-xs text-foreground-secondary">回家连 Wi-Fi，选好素材直接传</p>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4 py-5 space-y-6">
        <WifiHint />

        <MobileAssetPicker items={items} disabled={isUploading} onAddFiles={addFiles} onRemove={removeItem} />

        {items.length > 0 && <UploadSummaryBar summary={summary} />}

        <AlbumTargetSection disabled={hasStarted} onChange={setAlbumTarget} />

        <ShootLocationField
          value={locationData}
          onChange={setLocationData}
          disabled={hasStarted}
        />

        {allSettled && (
          <ResultPanel
            summary={summary}
            albumResult={albumResult}
            onRetryFailed={retryFailed}
            onReset={handleReset}
          />
        )}
      </div>

      {summary.pending > 0 && (
        // 移动端抬到底栏（h-14 + safe-area）之上；桌面无底栏，贴底
        <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))] z-40 border-t border-white/10 bg-background/90 p-4 backdrop-blur-xl md:bottom-0">
          <button
            type="button"
            onClick={handleStartUpload}
            disabled={isUploading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-medium transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            <UploadCloud size={18} />
            {isUploading ? '上传中...' : `开始上传（${summary.pending}）`}
          </button>
        </div>
      )}
    </div>
  );
}

function WifiHint() {
  const [origin, setOrigin] = useState('');
  const [isLoopback, setIsLoopback] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const { hostname, origin: pageOrigin } = window.location;
    setOrigin(`${pageOrigin}/mobile-upload`);
    setIsLoopback(hostname === 'localhost' || hostname === '127.0.0.1');
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(origin);
      setCopied(true);
      toast.success('已复制链接');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('复制失败，请手动复制地址栏链接');
    }
  };

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-primary/10 border border-primary/20 text-sm">
      <Wifi size={18} className="text-primary flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-foreground-secondary">确保手机和主机连接同一个 Wi‑Fi</p>
        {isLoopback && (
          <p className="mt-1 text-xs text-amber-300/90">
            当前是 localhost。请用电脑局域网 IP 在手机打开（本机可先执行 ipconfig getifaddr en0）
          </p>
        )}
        {origin && <p className="mt-1 text-xs text-foreground-tertiary truncate">{origin}</p>}
      </div>
      {origin && (
        <button
          type="button"
          onClick={handleCopy}
          className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors flex-shrink-0"
          aria-label="复制链接"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      )}
    </div>
  );
}

interface UploadSummaryBarProps {
  summary: { total: number; success: number; skipped: number; failed: number; pending: number };
}

function UploadSummaryBar({ summary }: UploadSummaryBarProps) {
  const done = summary.success + summary.skipped;
  const percent = useMemo(
    () => (summary.total === 0 ? 0 : Math.round((done / summary.total) * 100)),
    [done, summary.total]
  );

  return (
    <div className="space-y-1.5">
      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-xs text-foreground-secondary">
        成功 {summary.success} · 跳过 {summary.skipped} · 失败 {summary.failed} · 共 {summary.total}
      </p>
    </div>
  );
}

interface ResultPanelProps {
  summary: { total: number; success: number; skipped: number; failed: number };
  albumResult: { album_id: number; album_name: string; action: 'found' | 'created' } | null;
  onRetryFailed: () => void;
  onReset: () => void;
}

function ResultPanel({ summary, albumResult, onRetryFailed, onReset }: ResultPanelProps) {
  return (
    <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
      <p className="text-sm">
        本次共处理 <span className="font-medium">{summary.total}</span> 个文件，
        成功 <span className="text-emerald-400 font-medium">{summary.success}</span>，
        跳过 <span className="text-foreground-secondary">{summary.skipped}</span>，
        失败 <span className="text-red-400 font-medium">{summary.failed}</span>。
      </p>

      {albumResult && (
        <Link
          href={`/albums/${albumResult.album_id}`}
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          <FolderOpen size={14} />
          已导入到《{albumResult.album_name}》· 查看相册
        </Link>
      )}

      <div className="flex items-center gap-3">
        {summary.failed > 0 && (
          <button
            type="button"
            onClick={onRetryFailed}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm transition-colors"
          >
            <RotateCcw size={14} />
            重试失败项（{summary.failed}）
          </button>
        )}
        <button
          type="button"
          onClick={onReset}
          className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm transition-colors"
        >
          继续添加更多
        </button>
      </div>
    </div>
  );
}
