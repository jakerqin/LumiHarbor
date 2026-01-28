'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AssetGrid } from '@/components/assets/AssetGrid';
import { AssetFilterBar } from '@/components/assets/AssetFilterBar';
import { UploadAssetsModal } from '@/components/assets/UploadAssetsModal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { assetsApi, type AssetsFilter } from '@/lib/api/assets';
import { ingestionApi } from '@/lib/api/ingestion';
import type { Asset } from '@/lib/api/types';
import { Image, ListChecks, Upload, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AssetsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [filter, setFilter] = useState<AssetsFilter>({});
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data: locations = [] } = useQuery({
    queryKey: ['asset-locations'],
    queryFn: () => assetsApi.getLocations(),
  });

  const handleAssetClick = (id: number) => {
    router.push(`/assets/${id}`);
  };

  useEffect(() => {
    if (!isBatchMode) return;
    setSelectedIds(new Set());
  }, [filter, isBatchMode]);

  const handleSelectionToggle = (asset: Asset) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(asset.id)) {
        next.delete(asset.id);
      } else {
        next.add(asset.id);
      }
      return next;
    });
  };

  const handleExitBatchMode = () => {
    setIsBatchMode(false);
    setSelectedIds(new Set());
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (selectedIds.size === 0 || deleting) {
      setDeleteConfirmOpen(false);
      return;
    }
    setDeleting(true);
    try {
      await assetsApi.deleteAssets(Array.from(selectedIds));
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      handleExitBatchMode();
    } catch (error) {
      console.error(error);
      window.alert('删除失败，请稍后重试');
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
    }
  };

  const handleUploadPick = () => {
    fileInputRef.current?.click();
  };

  const handleUploadFilesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length === 0) return;
    setPendingFiles(files);
    setUploadOpen(true);
  };

  const handleUploadClose = () => {
    if (uploading) return;
    setUploadOpen(false);
    setPendingFiles([]);
  };

  const handleUploadSubmit = async (payload: { files: File[]; locationPoi?: string }) => {
    if (uploading) return;
    setUploading(true);
    try {
      await ingestionApi.uploadAssets(payload.files, payload.locationPoi);
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setUploadOpen(false);
      setPendingFiles([]);
    } catch (error) {
      console.error(error);
      window.alert('上传失败，请稍后重试');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen py-12 px-8">
      <div className="max-w-[1920px] mx-auto">
        {/* 页面头部 */}
        <div className="mb-8">
          <div>
            <h1 className="text-4xl font-heading font-bold mb-2 flex items-center gap-3">
              <Image size={40} className="text-primary" />
              素材库
            </h1>
            <p className="text-foreground-secondary">浏览和管理所有照片、视频素材</p>
          </div>
        </div>

        {/* 筛选栏和操作按钮 */}
        <div className="flex items-center justify-between gap-4">
          <AssetFilterBar
            filter={filter}
            locations={locations}
            onChange={setFilter}
          />

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* 批量编辑按钮 */}
            <button
              type="button"
              onClick={() => setIsBatchMode(!isBatchMode)}
              className="group relative h-11 w-11 rounded-xl bg-background-secondary hover:bg-background-tertiary border border-white/10 inline-flex items-center justify-center transition-colors"
              aria-label="批量编辑"
            >
              <ListChecks size={20} className={isBatchMode ? 'text-primary' : ''} />
              <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-background-secondary border border-white/10 rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                批量编辑
              </span>
            </button>

            {/* 上传按钮 */}
            <button
              type="button"
              onClick={handleUploadPick}
              className="group relative h-11 w-11 rounded-xl bg-background-secondary hover:bg-background-tertiary border border-white/10 inline-flex items-center justify-center transition-colors"
              aria-label="上传素材"
            >
              <Upload size={20} />
              <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-background-secondary border border-white/10 rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                上传素材
              </span>
            </button>
          </div>
        </div>

        {/* 素材网格 */}
        <AssetGrid
          filter={filter}
          onAssetClick={handleAssetClick}
          selectionMode={isBatchMode}
          selectedAssetIds={selectedIds}
          onSelectionToggle={handleSelectionToggle}
        />
      </div>

      {/* 批量编辑浮动操作栏 */}
      {isBatchMode && (
        <div className="fixed left-1/2 bottom-32 -translate-x-1/2 z-50">
          <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-background-secondary/80 backdrop-blur-lg border border-white/10 shadow-2xl">
            {/* 选中数量 */}
            <div className="text-sm text-foreground-secondary px-3">
              已选择 <span className="text-foreground font-medium">{selectedIds.size}</span> 项
            </div>

            {/* 分隔线 */}
            <div className="h-6 w-px bg-white/10" />

            {/* 删除按钮 */}
            <button
              type="button"
              onClick={handleDeleteSelected}
              disabled={selectedIds.size === 0 || deleting}
              className="group relative h-10 w-10 rounded-lg bg-red-500/10 hover:bg-red-500/20 inline-flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="删除选中素材"
            >
              <Trash2 size={18} className="text-red-400" />
              <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-background-secondary border border-white/10 rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                {deleting ? '删除中...' : '删除'}
              </span>
            </button>

            {/* 取消按钮 */}
            <button
              type="button"
              onClick={handleExitBatchMode}
              className="group relative h-10 w-10 rounded-lg bg-background-tertiary hover:bg-white/10 inline-flex items-center justify-center transition-colors"
              aria-label="取消批量编辑"
            >
              <X size={18} />
              <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-background-secondary border border-white/10 rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                取消
              </span>
            </button>
          </div>
        </div>
      )}

      <UploadAssetsModal
        open={uploadOpen}
        files={pendingFiles}
        locations={locations}
        uploading={uploading}
        onPickFiles={handleUploadPick}
        onClose={handleUploadClose}
        onSubmit={handleUploadSubmit}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        title="删除素材"
        description="删除后素材将进入回收站，同时标记缩略图、预览图与相册关联为已删除。确定继续吗？"
        confirmText="删除"
        cancelText="取消"
        confirmTone="danger"
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirmOpen(false)}
      />

      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleUploadFilesChange}
        className="hidden"
      />
    </div>
  );
}
