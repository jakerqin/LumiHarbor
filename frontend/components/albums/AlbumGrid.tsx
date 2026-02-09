'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlbumMasonry } from './AlbumMasonry';
import { albumsApi, type Album } from '@/lib/api/albums';
import { useRouter } from 'next/navigation';
import type { AlbumsFilter } from './AlbumFilterBar';
import { CreateAlbumModal, type CreateAlbumData } from './CreateAlbumModal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { toast } from 'sonner';

interface AlbumGridProps {
  filter?: AlbumsFilter;
}

export function AlbumGrid({ filter = {} }: AlbumGridProps) {
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const router = useRouter();
  const queryClient = useQueryClient();

  // 编辑/删除状态
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);
  const [deletingAlbum, setDeletingAlbum] = useState<Album | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // 筛选变化时重置页码
  useEffect(() => {
    setPage(1);
  }, [filter]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['albums', page, pageSize, filter],
    queryFn: () => albumsApi.getAlbums(page, pageSize, filter),
  });

  const handleAlbumClick = (id: number) => {
    router.push(`/albums/${id}`);
  };

  // 编辑相册
  const handleEdit = (album: Album) => {
    setEditingAlbum(album);
    setEditModalOpen(true);
  };

  // 删除相册
  const handleDelete = (album: Album) => {
    setDeletingAlbum(album);
    setDeleteDialogOpen(true);
  };

  // 更新相册 mutation
  const updateMutation = useMutation({
    mutationFn: async (data: { id: number; updateData: CreateAlbumData }) => {
      return albumsApi.updateAlbum(data.id, {
        name: data.updateData.name,
        description: data.updateData.description,
        start_time: data.updateData.start_time,
        end_time: data.updateData.end_time,
        cover_asset_id: data.updateData.cover_asset_id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['albums'] });
      toast.success('相册更新成功');
      setEditModalOpen(false);
      setEditingAlbum(null);
    },
    onError: (error: any) => {
      toast.error(error?.message || '相册更新失败');
    },
  });

  // 删除相册 mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => albumsApi.deleteAlbum(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['albums'] });
      toast.success('相册已删除');
      setDeleteDialogOpen(false);
      setDeletingAlbum(null);
    },
    onError: (error: any) => {
      toast.error(error?.message || '删除失败');
    },
  });

  // 提交编辑
  const handleEditSubmit = (data: CreateAlbumData) => {
    if (!editingAlbum) return;
    updateMutation.mutate({ id: editingAlbum.id, updateData: data });
  };

  // 确认删除
  const handleConfirmDelete = () => {
    if (!deletingAlbum) return;
    deleteMutation.mutate(deletingAlbum.id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4 mx-auto" />
          <p className="text-foreground-secondary">加载相册中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <p className="text-xl text-red-500 mb-2">加载失败</p>
          <p className="text-foreground-secondary">请刷新页面重试</p>
        </div>
      </div>
    );
  }

  if (!data || data.albums.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <p className="text-xl text-foreground-secondary">暂无相册</p>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(data.total / pageSize);

  return (
    <div>
      {/* 相册瀑布流 */}
      <AlbumMasonry
        albums={data.albums}
        onAlbumClick={handleAlbumClick}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="mt-12 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-background-secondary hover:bg-background-tertiary rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            上一页
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-10 h-10 rounded-lg transition-colors ${
                    page === pageNum
                      ? 'bg-primary text-white'
                      : 'bg-background-secondary hover:bg-background-tertiary'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 bg-background-secondary hover:bg-background-tertiary rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            下一页
          </button>

          <span className="ml-4 text-sm text-foreground-secondary">
            共 {data.total} 个相册
          </span>
        </div>
      )}

      {/* 编辑相册 Modal */}
      <CreateAlbumModal
        open={editModalOpen}
        mode="edit"
        initialData={editingAlbum || undefined}
        onClose={() => {
          setEditModalOpen(false);
          setEditingAlbum(null);
        }}
        onSubmit={handleEditSubmit}
        loading={updateMutation.isPending}
      />

      {/* 删除确认 Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="删除相册"
        description="删除相册也会删除相册下的所有素材及物理文件，此操作不可恢复，确定要继续吗？"
        confirmText="删除"
        cancelText="取消"
        confirmTone="danger"
        loading={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setDeletingAlbum(null);
        }}
      />
    </div>
  );
}
