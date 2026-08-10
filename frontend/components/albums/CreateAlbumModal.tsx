'use client';

import { useEffect, useState } from 'react';
import { X, Calendar, Image as ImageIcon } from 'lucide-react';
import { AssetPickerModal } from '@/components/common/AssetPickerModal';
import { SingleDatePicker, type ActiveDatePicker } from '@/components/common/SingleDatePicker';
import { CoverFocalEditor } from '@/components/albums/CoverFocalEditor';
import type { Asset } from '@/lib/api/types';
import type { Album } from '@/lib/api/albums';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface CreateAlbumModalProps {
  open: boolean;
  mode?: 'create' | 'edit';
  initialData?: Album;
  onClose: () => void;
  onSubmit: (data: CreateAlbumData) => void;
  loading?: boolean;
}

export interface CreateAlbumData {
  name: string;
  description: string;
  start_time?: string;
  end_time?: string;
  cover_asset_id?: number | null;
  cover_position_x?: number;
  cover_position_y?: number;
}

function formatDate(date?: Date): string | undefined {
  if (!date) return undefined;
  return format(date, 'yyyy-MM-dd');
}

export function CreateAlbumModal({ open, mode = 'create', initialData, onClose, onSubmit, loading }: CreateAlbumModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [activePicker, setActivePicker] = useState<ActiveDatePicker>(null);
  const [coverAsset, setCoverAsset] = useState<Asset | null>(null);
  const [coverPositionX, setCoverPositionX] = useState(50);
  const [coverPositionY, setCoverPositionY] = useState(50);
  const [assetPickerOpen, setAssetPickerOpen] = useState(false);

  // 编辑模式下回显数据
  useEffect(() => {
    if (mode === 'edit' && initialData && open) {
      setName(initialData.name);
      setDescription(initialData.description || '');
      setStartDate(initialData.startTime ? new Date(initialData.startTime) : undefined);
      setEndDate(initialData.endTime ? new Date(initialData.endTime) : undefined);
      setCoverPositionX(initialData.coverPositionX ?? 50);
      setCoverPositionY(initialData.coverPositionY ?? 50);

      if (initialData.coverUrl && initialData.coverUrl !== '/icon.svg') {
        setCoverAsset({
          id: initialData.coverAssetId ?? 0,
          thumbnail_url: initialData.coverUrl,
          preview_url: initialData.coverPreviewUrl,
          original_url: initialData.coverOriginalUrl,
          original_path: initialData.name,
        } as Asset);
      } else {
        setCoverAsset(null);
      }
    } else if (mode === 'create' && open) {
      setName('');
      setDescription('');
      setStartDate(undefined);
      setEndDate(undefined);
      setCoverAsset(null);
      setCoverPositionX(50);
      setCoverPositionY(50);
    }
  }, [mode, initialData, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('请输入相册名称');
      return;
    }

    const coverId = coverAsset?.id && coverAsset.id > 0 ? coverAsset.id : null;
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      start_time: formatDate(startDate),
      end_time: formatDate(endDate),
      cover_asset_id: coverId,
      cover_position_x: coverPositionX,
      cover_position_y: coverPositionY,
    });
  };

  const handleClose = () => {
    if (loading) return;
    setName('');
    setDescription('');
    setStartDate(undefined);
    setEndDate(undefined);
    setActivePicker(null);
    setCoverAsset(null);
    setCoverPositionX(50);
    setCoverPositionY(50);
    onClose();
  };

  const handleSelectCover = (asset: Asset) => {
    setCoverAsset(asset);
    setCoverPositionX(50);
    setCoverPositionY(50);
  };

  if (!open) return null;

  const modalTitle = mode === 'edit' ? '编辑相册' : '创建相册';
  const submitButtonText = mode === 'edit' ? '保存' : '创建相册';
  const submitButtonLoadingText = mode === 'edit' ? '保存中...' : '创建中...';

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* 背景遮罩 */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        />

        {/* Modal 内容 */}
        <div className="relative w-full max-w-2xl mx-4 rounded-2xl bg-background-secondary/95 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden">
          {/* 头部 */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <h2 className="text-xl font-semibold">{modalTitle}</h2>
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors disabled:opacity-50"
              aria-label="关闭"
            >
              <X size={20} />
            </button>
          </div>

          {/* 表单 */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* 相册名称 */}
            <div>
              <label className="block text-sm font-medium mb-2">
                相册名称 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="输入相册名称..."
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm placeholder:text-foreground-secondary/50 focus:outline-none focus:border-primary/50 transition-colors"
                disabled={loading}
                autoFocus
              />
            </div>

            {/* 相册描述 */}
            <div>
              <label className="block text-sm font-medium mb-2">相册描述</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="输入相册描述..."
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm placeholder:text-foreground-secondary/50 focus:outline-none focus:border-primary/50 transition-colors resize-none"
                disabled={loading}
              />
            </div>

            {/* 时间范围 */}
            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-1.5">
                <Calendar size={14} className="text-foreground-secondary" />
                拍摄时间范围
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-foreground-secondary mb-2">
                    开始时间
                  </label>
                  <SingleDatePicker
                    pickerKey="start"
                    value={startDate}
                    activeKey={activePicker}
                    onActiveChange={setActivePicker}
                    onChange={setStartDate}
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-xs text-foreground-secondary mb-2">
                    结束时间
                  </label>
                  <SingleDatePicker
                    pickerKey="end"
                    value={endDate}
                    activeKey={activePicker}
                    onActiveChange={setActivePicker}
                    onChange={setEndDate}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* 封面素材 */}
            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-1.5">
                <ImageIcon size={14} className="text-foreground-secondary" />
                封面素材
              </label>
              {coverAsset ? (
                <div className="space-y-2">
                  <CoverFocalEditor
                    src={
                      coverAsset.preview_url ||
                      coverAsset.original_url ||
                      coverAsset.thumbnail_url ||
                      '/icon.svg'
                    }
                    alt={coverAsset.original_path || '封面'}
                    positionX={coverPositionX}
                    positionY={coverPositionY}
                    onChange={(x, y) => {
                      setCoverPositionX(x);
                      setCoverPositionY(y);
                    }}
                    disabled={loading}
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAssetPickerOpen(true)}
                      className="rounded-lg bg-white/10 px-3 py-1.5 text-sm transition-colors hover:bg-white/20"
                      disabled={loading}
                    >
                      更换
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCoverAsset(null);
                        setCoverPositionX(50);
                        setCoverPositionY(50);
                      }}
                      className="rounded-lg bg-red-500/20 px-3 py-1.5 text-sm transition-colors hover:bg-red-500/30"
                      disabled={loading}
                    >
                      移除
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAssetPickerOpen(true)}
                  className="w-full h-48 rounded-xl border-2 border-dashed border-white/10 hover:border-primary/30 hover:bg-white/5 transition-colors flex flex-col items-center justify-center gap-2 text-foreground-secondary"
                  disabled={loading}
                >
                  <ImageIcon size={32} />
                  <span className="text-sm">点击选择封面素材</span>
                </button>
              )}
            </div>

            {/* 操作按钮 */}
            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="px-6 py-2.5 rounded-xl text-sm text-foreground-secondary hover:text-foreground hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="px-6 py-2.5 rounded-xl text-sm bg-primary hover:bg-primary-hover text-primary-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? submitButtonLoadingText : submitButtonText}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* 素材选择器 */}
      <AssetPickerModal
        open={assetPickerOpen}
        onClose={() => setAssetPickerOpen(false)}
        onSelect={handleSelectCover}
      />
    </>
  );
}
