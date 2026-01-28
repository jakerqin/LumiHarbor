'use client';

import { useEffect, useMemo, useState } from 'react';
import { Upload, X, MapPin } from 'lucide-react';
import { MapPicker, type LocationData } from '@/components/common/MapPicker';

interface UploadAssetsModalProps {
  open: boolean;
  files: File[];
  locations: string[];
  uploading: boolean;
  onPickFiles: () => void;
  onClose: () => void;
  onSubmit: (payload: {
    files: File[];
    locationData?: LocationData;
  }) => void;
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
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);

  useEffect(() => {
    if (open) return;
    setSelectedLocation(null);
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-foreground-secondary">
                  <MapPin size={16} />
                  <span>拍摄地点</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMapPickerOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-sm transition-colors"
                >
                  在地图上选择
                </button>
              </div>

              {selectedLocation ? (
                <div className="p-3 rounded-lg bg-background-tertiary border border-white/10 space-y-2">
                  <div className="text-sm">
                    <span className="text-foreground-secondary">经纬度：</span>
                    <span className="text-foreground">{selectedLocation.longitude.toFixed(6)}, {selectedLocation.latitude.toFixed(6)}</span>
                  </div>
                  {selectedLocation.formatted && (
                    <div className="text-sm">
                      <span className="text-foreground-secondary">地址：</span>
                      <span className="text-foreground">{selectedLocation.formatted}</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedLocation(null)}
                    className="text-xs text-foreground-secondary hover:text-foreground transition-colors"
                  >
                    清除
                  </button>
                </div>
              ) : (
                <div className="text-sm text-foreground-secondary">
                  未选择地点（可选）
                </div>
              )}
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
                    locationData: selectedLocation || undefined,
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

      {/* 地图选择器 */}
      <MapPicker
        open={mapPickerOpen}
        onConfirm={(location) => {
          setSelectedLocation(location);
          setMapPickerOpen(false);
        }}
        onClose={() => setMapPickerOpen(false)}
      />
    </div>
  );
}
