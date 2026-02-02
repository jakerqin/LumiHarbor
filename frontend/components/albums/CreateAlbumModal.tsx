'use client';

import { useState } from 'react';
import { X, Calendar, Image as ImageIcon } from 'lucide-react';
import { AssetPickerModal } from '@/components/common/AssetPickerModal';
import type { Asset } from '@/lib/api/types';

interface CreateAlbumModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateAlbumData) => void;
  loading?: boolean;
}

export interface CreateAlbumData {
  name: string;
  description: string;
  start_time?: string;
  end_time?: string;
  cover_asset_id?: number;
}

export function CreateAlbumModal({ open, onClose, onSubmit, loading }: CreateAlbumModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [coverAsset, setCoverAsset] = useState<Asset | null>(null);
  const [assetPickerOpen, setAssetPickerOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      window.alert('请输入相册名称');
      return;
    }

    onSubmit({
      name: name.trim(),
      description: description.trim(),
      start_time: startTime || undefined,
      end_time: endTime || undefined,
      cover_asset_id: coverAsset?.id,
    });
  };

  const handleClose = () => {
    if (loading) return;
    setName('');
    setDescription('');
    setStartTime('');
    setEndTime('');
    setCoverAsset(null);
    onClose();
  };

  const handleSelectCover = (asset: Asset) => {
    setCoverAsset(asset);
  };

  if (!open) return null;

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
            <h2 className="text-xl font-semibold">创建相册</h2>
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-1.5">
                  <Calendar size={14} className="text-foreground-secondary" />
                  开始时间
                </label>
                <input
                  type="date"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-1.5">
                  <Calendar size={14} className="text-foreground-secondary" />
                  结束时间
                </label>
                <input
                  type="date"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                  disabled={loading}
                />
              </div>
            </div>

            {/* 封面素材 */}
            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-1.5">
                <ImageIcon size={14} className="text-foreground-secondary" />
                封面素材
              </label>
              {coverAsset ? (
                <div className="relative group">
                  <img
                    src={coverAsset.thumbnail_url || '/placeholder-image.jpg'}
                    alt={coverAsset.original_path || '封面'}
                    className="w-full h-48 object-cover rounded-xl"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAssetPickerOpen(true)}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
                      disabled={loading}
                    >
                      更换
                    </button>
                    <button
                      type="button"
                      onClick={() => setCoverAsset(null)}
                      className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-sm transition-colors"
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
                className="px-6 py-2.5 rounded-xl text-sm bg-primary hover:bg-primary-hover text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '创建中...' : '创建相册'}
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
