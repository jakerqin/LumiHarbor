'use client';

import { useEffect, useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Image as ImageIcon,
  MoreVertical,
  Edit2,
  Trash2,
  FolderInput,
  ListChecks,
  X,
  FolderMinus,
} from 'lucide-react';
import { albumsApi } from '@/lib/api/albums';
import { assetsApi } from '@/lib/api/assets';
import { AssetMasonry } from '@/components/assets/AssetMasonry';
import { CreateAlbumModal, type CreateAlbumData } from '@/components/albums/CreateAlbumModal';
import { AssetPickerModal } from '@/components/common/AssetPickerModal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useToast } from '@/components/common/toast/ToastProvider';
import type { Asset } from '@/lib/api/types';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export default function AlbumDetailPage() {
  const router = useRouter();
  const params = useParams();
  const albumId = parseInt(params.id as string);
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const menuRef = useRef<HTMLDivElement>(null);

  // UI 状态
  const [showMenu, setShowMenu] = useState(false);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Modal 状态
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addAssetsModalOpen, setAddAssetsModalOpen] = useState(false);
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
  const [deleteAssetsConfirmOpen, setDeleteAssetsConfirmOpen] = useState(false);

  // Loading 状态
  const [removing, setRemoving] = useState(false);
  const [deletingAssets, setDeletingAssets] = useState(false);

  const { data: album, isLoading } = useQuery({
    queryKey: ['album', albumId],
    queryFn: () => albumsApi.getAlbum(albumId),
  });

  // 点击外部关闭菜单
  useEffect(() => {
    if (!showMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  // 更新相册 mutation
  const updateMutation = useMutation({
    mutationFn: async (data: CreateAlbumData) => {
      return albumsApi.updateAlbum(albumId, {
        name: data.name,
        description: data.description,
        start_time: data.start_time,
        end_time: data.end_time,
        cover_asset_id: data.cover_asset_id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['album', albumId] });
      showToast({ title: '相册更新成功', tone: 'success' });
      setEditModalOpen(false);
    },
    onError: (error: any) => {
      showToast({ title: error?.message || '相册更新失败', tone: 'error' });
    },
  });

  // 删除相册 mutation
  const deleteMutation = useMutation({
    mutationFn: () => albumsApi.deleteAlbum(albumId),
    onSuccess: () => {
      showToast({ title: '相册已删除', tone: 'success' });
      router.push('/albums');
    },
    onError: (error: any) => {
      showToast({ title: error?.message || '删除失败', tone: 'error' });
    },
  });

  // 批量添加素材 mutation
  const addAssetsMutation = useMutation({
    mutationFn: (assets: Asset[]) =>
      albumsApi.addAssetsToAlbum(
        albumId,
        assets.map((a) => a.id)
      ),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['album', albumId] });
      showToast({
        title: `成功添加 ${result.success_count} 项素材`,
        tone: 'success',
      });
      setAddAssetsModalOpen(false);
    },
    onError: (error: any) => {
      showToast({ title: error?.message || '添加失败', tone: 'error' });
    },
  });

  // 处理菜单点击
  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  const handleEdit = () => {
    setShowMenu(false);
    setEditModalOpen(true);
  };

  const handleDelete = () => {
    setShowMenu(false);
    setDeleteDialogOpen(true);
  };

  const handleAddAssets = () => {
    setShowMenu(false);
    setAddAssetsModalOpen(true);
  };

  const handleBatchMode = () => {
    setShowMenu(false);
    setIsBatchMode(true);
  };

  const handleExitBatchMode = () => {
    setIsBatchMode(false);
    setSelectedIds(new Set());
  };

  const handleAssetClick = (id: number) => {
    if (isBatchMode) return;
    router.push(`/assets/${id}`);
  };

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

  // 移出相册
  const handleRemoveFromAlbum = async () => {
    if (selectedIds.size === 0) return;
    setRemoveConfirmOpen(true);
  };

  const handleConfirmRemove = async () => {
    if (selectedIds.size === 0 || removing) {
      setRemoveConfirmOpen(false);
      return;
    }
    setRemoving(true);
    try {
      // 逐个移出素材
      await Promise.all(
        Array.from(selectedIds).map((assetId) =>
          albumsApi.removeAssetFromAlbum(albumId, assetId)
        )
      );
      queryClient.invalidateQueries({ queryKey: ['album', albumId] });
      showToast({ title: `已移出 ${selectedIds.size} 项素材`, tone: 'success' });
      handleExitBatchMode();
    } catch (error) {
      console.error(error);
      showToast({ title: '移出失败，请稍后重试', tone: 'error' });
    } finally {
      setRemoving(false);
      setRemoveConfirmOpen(false);
    }
  };

  // 删除素材
  const handleDeleteAssets = async () => {
    if (selectedIds.size === 0) return;
    setDeleteAssetsConfirmOpen(true);
  };

  const handleConfirmDeleteAssets = async () => {
    if (selectedIds.size === 0 || deletingAssets) {
      setDeleteAssetsConfirmOpen(false);
      return;
    }
    setDeletingAssets(true);
    try {
      await assetsApi.deleteAssets(Array.from(selectedIds));
      queryClient.invalidateQueries({ queryKey: ['album', albumId] });
      showToast({ title: `已删除 ${selectedIds.size} 项素材`, tone: 'success' });
      handleExitBatchMode();
    } catch (error) {
      console.error(error);
      showToast({ title: '删除失败，请稍后重试', tone: 'error' });
    } finally {
      setDeletingAssets(false);
      setDeleteAssetsConfirmOpen(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4 mx-auto" />
          <p className="text-foreground-secondary">加载相册中...</p>
        </div>
      </div>
    );
  }

  if (!album) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-foreground-secondary">相册不存在</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* 封面区域 */}
      <div className="relative h-[50vh] overflow-hidden">
        <img
          src={album.coverPreviewUrl || album.coverOriginalUrl || album.coverUrl}
          alt={album.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        {/* 返回按钮 */}
        <button
          onClick={() => router.back()}
          className="absolute top-8 left-8 p-3 bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-xl transition-colors flex items-center gap-2"
        >
          <ArrowLeft size={20} className="text-white" />
          <span className="text-white font-medium">返回</span>
        </button>

        {/* 更多操作 */}
        <div className="absolute top-8 right-8" ref={menuRef}>
          <button
            onClick={handleMenuClick}
            className="p-3 bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-xl transition-colors"
          >
            <MoreVertical size={24} className="text-white" />
          </button>

          {/* 下拉菜单 */}
          {showMenu && (
            <div className="absolute top-full right-0 mt-2 w-40 rounded-lg bg-background-secondary/95 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden z-10">
              <button
                onClick={handleEdit}
                className="w-full px-4 py-2.5 flex items-center gap-2 text-sm text-foreground hover:bg-white/5 transition-colors"
              >
                <Edit2 size={14} />
                <span>编辑</span>
              </button>
              <button
                onClick={handleDelete}
                className="w-full px-4 py-2.5 flex items-center gap-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 size={14} />
                <span>删除</span>
              </button>
              <button
                onClick={handleAddAssets}
                className="w-full px-4 py-2.5 flex items-center gap-2 text-sm text-foreground hover:bg-white/5 transition-colors"
              >
                <FolderInput size={14} />
                <span>素材入组</span>
              </button>
              <button
                onClick={handleBatchMode}
                className="w-full px-4 py-2.5 flex items-center gap-2 text-sm text-foreground hover:bg-white/5 transition-colors"
              >
                <ListChecks size={14} />
                <span>批量编辑</span>
              </button>
            </div>
          )}
        </div>

        {/* 相册信息 */}
        <div className="absolute bottom-0 left-0 right-0 p-12">
          <div className="max-w-[1920px] mx-auto">
            <h1 className="text-5xl font-heading font-bold text-white mb-4">{album.name}</h1>

            <p className="text-lg text-white/80 mb-6 max-w-2xl">{album.description}</p>

            <div className="flex items-center gap-6 text-white/90">
              {/* 日期 */}
              {album.startTime && album.endTime && (
                <div className="flex items-center gap-2">
                  <Calendar size={20} />
                  <span>
                    {format(new Date(album.startTime), 'yyyy.MM.dd', { locale: zhCN })} -{' '}
                    {format(new Date(album.endTime), 'yyyy.MM.dd', { locale: zhCN })}
                  </span>
                </div>
              )}

              {/* 数量 */}
              <div className="flex items-center gap-2">
                <ImageIcon size={20} />
                <span>{album.assetCount} 张照片</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 素材网格 */}
      <div className="py-12 px-8 bg-background">
        <div className="max-w-[1920px] mx-auto">
          {album.assets.length > 0 ? (
            <AssetMasonry
              assets={album.assets}
              onAssetClick={handleAssetClick}
              selectionMode={isBatchMode}
              selectedAssetIds={selectedIds}
              onSelectionToggle={handleSelectionToggle}
              disableHoverEffects={isBatchMode}
            />
          ) : (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <ImageIcon size={64} className="mx-auto mb-4 text-foreground-tertiary" />
                <p className="text-xl text-foreground-secondary">相册为空</p>
                <p className="text-sm text-foreground-tertiary mt-2">还没有添加照片</p>
              </div>
            </div>
          )}
        </div>
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

            {/* 移出相册按钮 */}
            <button
              type="button"
              onClick={handleRemoveFromAlbum}
              disabled={selectedIds.size === 0 || removing}
              className="group relative h-10 w-10 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 inline-flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="移出相册"
            >
              <FolderMinus size={18} className="text-orange-400" />
              <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-background-secondary border border-white/10 rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                {removing ? '移出中...' : '移出相册'}
              </span>
            </button>

            {/* 删除按钮 */}
            <button
              type="button"
              onClick={handleDeleteAssets}
              disabled={selectedIds.size === 0 || deletingAssets}
              className="group relative h-10 w-10 rounded-lg bg-red-500/10 hover:bg-red-500/20 inline-flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="删除选中素材"
            >
              <Trash2 size={18} className="text-red-400" />
              <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-background-secondary border border-white/10 rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                {deletingAssets ? '删除中...' : '删除'}
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

      {/* 编辑相册 Modal */}
      <CreateAlbumModal
        open={editModalOpen}
        mode="edit"
        initialData={album}
        onClose={() => setEditModalOpen(false)}
        onSubmit={(data) => updateMutation.mutate(data)}
        loading={updateMutation.isPending}
      />

      {/* 删除相册确认 Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="删除相册"
        description="删除相册也会删除相册下的所有素材及物理文件，此操作不可恢复，确定要继续吗？"
        confirmText="删除"
        cancelText="取消"
        confirmTone="danger"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setDeleteDialogOpen(false)}
      />

      {/* 素材入组 Modal */}
      <AssetPickerModal
        open={addAssetsModalOpen}
        title="选择素材"
        multiSelect
        onMultiSelect={(assets) => addAssetsMutation.mutate(assets)}
        onClose={() => setAddAssetsModalOpen(false)}
      />

      {/* 移出相册确认 Dialog */}
      <ConfirmDialog
        open={removeConfirmOpen}
        title="移出相册"
        description={`确定要将 ${selectedIds.size} 项素材移出相册吗？素材本身不会被删除。`}
        confirmText="移出"
        cancelText="取消"
        confirmTone="primary"
        loading={removing}
        onConfirm={handleConfirmRemove}
        onCancel={() => setRemoveConfirmOpen(false)}
      />

      {/* 删除素材确认 Dialog */}
      <ConfirmDialog
        open={deleteAssetsConfirmOpen}
        title="删除素材"
        description={`删除后素材将进入回收站，同时标记缩略图、预览图与相册关联为已删除。确定删除 ${selectedIds.size} 项素材吗？`}
        confirmText="删除"
        cancelText="取消"
        confirmTone="danger"
        loading={deletingAssets}
        onConfirm={handleConfirmDeleteAssets}
        onCancel={() => setDeleteAssetsConfirmOpen(false)}
      />
    </div>
  );
}
