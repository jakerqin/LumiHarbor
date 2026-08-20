'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Upload, X, Check, AlertCircle, Clock } from 'lucide-react';
import type { UploadItem } from '@/lib/hooks/useMobileUploadQueue';

// 圆形进度环周长（半径 16 的圆），用于 strokeDasharray 计算
const RING_CIRCUMFERENCE = 100.5;

interface MobileAssetPickerProps {
  items: UploadItem[];
  disabled?: boolean;
  onAddFiles: (files: File[]) => void;
  onRemove: (id: string) => void;
}

export function MobileAssetPicker({ items, disabled, onAddFiles, onRemove }: MobileAssetPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handlePick = () => inputRef.current?.click();

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length > 0) onAddFiles(files);
  };

  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <button
          type="button"
          onClick={handlePick}
          className="w-full h-40 rounded-2xl border-2 border-dashed border-white/15 hover:border-primary/40 active:scale-[0.97] transition-[border-color,transform] duration-200 flex flex-col items-center justify-center gap-2 text-foreground-secondary"
        >
          <Upload size={32} />
          <span className="text-base font-medium">选择照片 / 视频</span>
          <span className="text-xs text-foreground-tertiary">可从相册多选</span>
        </button>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            {items.map((item) => (
              <AssetThumb key={item.id} item={item} disabled={disabled} onRemove={onRemove} />
            ))}
          </div>
          <button
            type="button"
            onClick={handlePick}
            disabled={disabled}
            className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm transition-colors disabled:opacity-50"
          >
            + 添加更多
          </button>
        </>
      )}

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
}

interface AssetThumbProps {
  item: UploadItem;
  disabled?: boolean;
  onRemove: (id: string) => void;
}

function AssetThumb({ item, disabled, onRemove }: AssetThumbProps) {
  const previewUrl = useMemo(() => URL.createObjectURL(item.file), [item.file]);

  useEffect(() => {
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const isVideo = item.file.type.startsWith('video/');
  const canRemove = item.status === 'pending' && !disabled;

  return (
    <div className="relative aspect-square rounded-xl overflow-hidden bg-background-tertiary border border-white/10">
      {isVideo ? (
        <video src={previewUrl} className="w-full h-full object-cover" muted />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={previewUrl} alt={item.file.name} className="w-full h-full object-cover" />
      )}

      <StatusBadge item={item} />

      {canRemove && (
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 flex items-center justify-center"
          aria-label="移除"
        >
          <X size={14} className="text-white" />
        </button>
      )}
    </div>
  );
}

function StatusBadge({ item }: { item: UploadItem }) {
  if (item.status === 'uploading') {
    return (
      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
        <div className="relative h-8 w-8">
          <svg className="h-8 w-8 -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="3" />
            <circle
              cx="18"
              cy="18"
              r="16"
              fill="none"
              stroke="white"
              strokeWidth="3"
              strokeDasharray={`${(item.progress / 100) * RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-medium">
            {item.progress}%
          </span>
        </div>
      </div>
    );
  }

  if (item.status === 'success') {
    return (
      <div className="absolute bottom-1 right-1 h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center">
        <Check size={12} className="text-white" />
      </div>
    );
  }

  if (item.status === 'skipped') {
    return (
      <div className="absolute inset-x-0 bottom-0 bg-black/60 text-[10px] text-white text-center py-0.5">
        已传过，自动跳过
      </div>
    );
  }

  if (item.status === 'failed') {
    return (
      <div className="absolute inset-0 bg-red-500/30 flex items-center justify-center">
        <AlertCircle size={20} className="text-white" />
      </div>
    );
  }

  return (
    <div className="absolute bottom-1 right-1 h-5 w-5 rounded-full bg-white/20 flex items-center justify-center">
      <Clock size={12} className="text-white/80" />
    </div>
  );
}
