'use client';

import { useEffect, useMemo, useState } from 'react';
import { Upload, X, MapPin } from 'lucide-react';

interface UploadAssetsModalProps {
  open: boolean;
  files: File[];
  locations: string[];
  uploading: boolean;
  onPickFiles: () => void;
  onClose: () => void;
  onSubmit: (payload: { files: File[]; locationPoi?: string }) => void;
}

export function UploadAssetsModal({
  open,
  files,
  locations,
  uploading,
  onPickFiles,
  onClose,
  onSubmit,
}: UploadAssetsModalProps) {
  const [locationPoi, setLocationPoi] = useState('');

  useEffect(() => {
    if (open) return;
    setLocationPoi('');
  }, [open]);

  const previewFiles = useMemo(() => files.slice(0, 5), [files]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-label="关闭"
        onClick={onClose}
      />

      <div className="absolute inset-0 flex items-start justify-center p-4 pt-24">
        <div className="w-full max-w-xl rounded-2xl bg-background border border-white/10 shadow-2xl overflow-hidden">
          <div className="flex items-start justify-between gap-4 p-5 border-b border-white/10">
            <div>
              <h2 className="text-lg font-heading font-semibold">上传素材</h2>
              <p className="mt-1 text-sm text-foreground-secondary">
                已选择 {files.length} 个文件
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-9 w-9 inline-flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
              aria-label="关闭"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-5 space-y-6">
            <div className="space-y-2">
              {previewFiles.map((file, index) => (
                <div
                  key={`${file.name}-${file.size}-${index}`}
                  className="text-sm text-foreground-secondary truncate"
                >
                  {file.name}
                </div>
              ))}
              {files.length > previewFiles.length && (
                <div className="text-xs text-foreground-tertiary">
                  还有 {files.length - previewFiles.length} 个文件未显示
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-foreground-secondary">
                <MapPin size={16} />
                <span>拍摄地点</span>
              </div>
              <input
                type="text"
                list="upload-location-options"
                value={locationPoi}
                onChange={(event) => setLocationPoi(event.target.value)}
                placeholder="输入或选择地标（可选）"
                className="w-full px-3 py-2 rounded-lg bg-background-tertiary border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <datalist id="upload-location-options">
                {locations.map((location) => (
                  <option key={location} value={location} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 p-5 border-t border-white/10">
            <button
              type="button"
              onClick={onPickFiles}
              className="px-4 py-2 rounded-lg bg-background-tertiary hover:bg-white/10 transition-colors text-sm"
            >
              重新选择
            </button>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-sm"
                disabled={uploading}
              >
                取消
              </button>
              <button
                type="button"
                onClick={() =>
                  onSubmit({
                    files,
                    locationPoi: locationPoi.trim() ? locationPoi.trim() : undefined,
                  })
                }
                disabled={files.length === 0 || uploading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload size={16} />
                {uploading ? '上传中...' : '开始上传'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
