'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AssetGrid } from '@/components/assets/AssetGrid';
import { AssetFilterPanel } from '@/components/assets/AssetFilterPanel';
import { UploadAssetsModal } from '@/components/assets/UploadAssetsModal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { assetsApi, type AssetsFilter } from '@/lib/api/assets';
import { ingestionApi } from '@/lib/api/ingestion';
import type { Asset } from '@/lib/api/types';
import { Image, MoreVertical } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AssetsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
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
    if (!menuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (menuRef.current.contains(event.target as Node)) return;
      setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

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
        <div className="mb-12">
          <div className="flex items-start justify-between gap-6 mb-6">
            <div>
              <h1 className="text-4xl font-heading font-bold mb-2 flex items-center gap-3">
                <Image size={40} className="text-primary" />
                素材库
              </h1>
              <p className="text-foreground-secondary">浏览和管理所有照片、视频素材</p>
            </div>

            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                className="h-11 w-11 rounded-xl bg-background-secondary hover:bg-background-tertiary border border-white/10 inline-flex items-center justify-center transition-colors"
                aria-label="素材操作菜单"
              >
                <MoreVertical size={20} />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-3 w-48 rounded-xl bg-background-secondary border border-white/10 shadow-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => {
                      setFilterOpen(true);
                      setMenuOpen(false);
                    }}
                    className="w-full px-4 py-3 text-left text-sm hover:bg-white/5 transition-colors"
                  >
                    筛选
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (isBatchMode) {
                        handleExitBatchMode();
                      } else {
                        setIsBatchMode(true);
                      }
                      setMenuOpen(false);
                    }}
                    className="w-full px-4 py-3 text-left text-sm hover:bg-white/5 transition-colors"
                  >
                    {isBatchMode ? '退出批量编辑' : '批量编辑'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      handleUploadPick();
                    }}
                    className="w-full px-4 py-3 text-left text-sm hover:bg-white/5 transition-colors"
                  >
                    上传文件
                  </button>
                </div>
              )}
            </div>
          </div>

          {isBatchMode && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-background-secondary border border-white/10 px-4 py-3">
              <div className="text-sm text-foreground-secondary">
                已选择 {selectedIds.size} 项
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  disabled={selectedIds.size === 0 || deleting}
                  className="px-4 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting ? '删除中...' : '删除'}
                </button>
                <button
                  type="button"
                  onClick={handleExitBatchMode}
                  className="px-4 py-2 rounded-lg bg-background-tertiary hover:bg-white/10 transition-colors text-sm"
                >
                  取消
                </button>
              </div>
            </div>
          )}
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

      <AssetFilterPanel
        open={filterOpen}
        filter={filter}
        locations={locations}
        onChange={setFilter}
        onClose={() => setFilterOpen(false)}
      />

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
