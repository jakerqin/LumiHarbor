'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AssetGrid } from '@/components/assets/AssetGrid';
import { AssetFilterBar } from '@/components/assets/AssetFilterBar';
import { UploadAssetsModal } from '@/components/assets/UploadAssetsModal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { assetsApi, type AssetsFilter } from '@/lib/api/assets';
import { templatesApi } from '@/lib/api/templates';
import { ingestionApi } from '@/lib/api/ingestion';
import { notifyImportResult } from '@/lib/utils/importToast';
import type { Asset } from '@/lib/api/types';
import { ListChecks, Upload, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PageShell } from '@/components/layout/PageShell';
import { PageHeader } from '@/components/layout/PageHeader';

// 禁用静态生成，因为页面使用了浏览器 API
export const dynamic = 'force-dynamic';

export default function AssetsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [filter, setFilter] = useState<AssetsFilter>({});
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [removedIds, setRemovedIds] = useState<Set<number>>(new Set());

  const { data: locations = [] } = useQuery({
    queryKey: ['asset-locations'],
    queryFn: () => assetsApi.getLocations(),
    staleTime: 5 * 60 * 1000, // 5 分钟缓存（地点数据相对静态）
  });
  const { data: filterTemplate } = useQuery({
    queryKey: ['template-resolve', 'filter'],
    queryFn: () => templatesApi.resolve('filter'),
    staleTime: 5 * 60 * 1000,
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
      const ids = Array.from(selectedIds);
      const result = await assetsApi.deleteAssets(ids);
      setRemovedIds((prev) => new Set([...prev, ...ids]));
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['trash'] });
      handleExitBatchMode();
      toast.success(`已将 ${result.deleted} 个素材移到回收站`, {
        action: { label: '查看', onClick: () => router.push('/assets/trash') },
      });
    } catch (error) {
      console.error(error);
      toast.error('删除失败，请稍后重试');
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

  const handleUploadSubmit = async (payload: { files: File[]; locationData?: import('@/components/common/MapPicker').LocationData }) => {
    if (uploading) return;
    setUploading(true);
    setUploadProgress({ done: 0, total: payload.files.length });
    try {
      // 逐个文件上传：单个大请求会超时，且一个失败全部白传
      const result = await ingestionApi.uploadFilesSequentially(payload.files, {
        locationData: payload.locationData,
        onFileDone: (done, total) => setUploadProgress({ done, total }),
      });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setUploadOpen(false);
      setPendingFiles([]);
      notifyImportResult(result);
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="素材库"
        description="浏览和管理所有照片、视频素材"
      />

      <div className="flex items-center justify-between gap-4 mb-6">
        <AssetFilterBar
          filter={filter}
          locations={locations}
          fields={filterTemplate?.fields}
          onChange={setFilter}
        />

        <div className="flex items-center gap-2 flex-shrink-0">
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

          <Link
            href="/assets/trash"
            className="group relative h-11 w-11 rounded-xl bg-background-secondary hover:bg-background-tertiary border border-white/10 inline-flex items-center justify-center transition-colors"
            aria-label="回收站"
          >
            <Trash2 size={20} />
            <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-background-secondary border border-white/10 rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              回收站
            </span>
          </Link>

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

      <AssetGrid
        filter={filter}
        onAssetClick={handleAssetClick}
        selectionMode={isBatchMode}
        selectedAssetIds={selectedIds}
        onSelectionToggle={handleSelectionToggle}
        onUploadClick={handleUploadPick}
        removedIds={removedIds}
      />

      {isBatchMode && (
        <div className="fixed left-1/2 bottom-24 md:bottom-10 -translate-x-1/2 z-50">
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
        progress={uploadProgress}
        onPickFiles={handleUploadPick}
        onClose={handleUploadClose}
        onSubmit={handleUploadSubmit}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        title="删除素材"
        description="删除后素材会移到回收站，从相册中移出，收藏也会取消。到期前可以在回收站恢复（收藏不会恢复）。确定继续吗？"
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
    </PageShell>
  );
}
