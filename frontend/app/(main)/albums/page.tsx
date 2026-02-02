'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlbumGrid } from '@/components/albums/AlbumGrid';
import { AlbumFilterBar, type AlbumsFilter } from '@/components/albums/AlbumFilterBar';
import { CreateAlbumModal, type CreateAlbumData } from '@/components/albums/CreateAlbumModal';
import { FolderOpen, Plus } from 'lucide-react';
import { albumsApi } from '@/lib/api/albums';

// 禁用静态生成，因为页面使用了浏览器 API
export const dynamic = 'force-dynamic';

export default function AlbumsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<AlbumsFilter>({});
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleCreateAlbum = async (data: CreateAlbumData) => {
    if (creating) return;
    setCreating(true);
    try {
      await albumsApi.createAlbum(data);
      queryClient.invalidateQueries({ queryKey: ['albums'] });
      setCreateModalOpen(false);
      window.alert('相册创建成功！');
    } catch (error) {
      console.error(error);
      window.alert('创建失败，请稍后重试');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen py-12 px-8">
      <div className="max-w-[1920px] mx-auto">
        {/* 页面头部 */}
        <div className="mb-8">
          <div>
            <h1 className="text-4xl font-heading font-bold mb-2 flex items-center gap-3">
              <FolderOpen size={40} className="text-primary" />
              相册
            </h1>
            <p className="text-foreground-secondary">整理和管理你的照片集合</p>
          </div>
        </div>

        {/* 筛选栏和操作按钮 */}
        <div className="flex items-center justify-between gap-4">
          <AlbumFilterBar filter={filter} onChange={setFilter} />

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* 创建按钮 */}
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="group relative h-11 px-4 rounded-xl bg-primary hover:bg-primary-hover inline-flex items-center gap-2 transition-colors"
            >
              <Plus size={20} />
              <span className="font-medium">创建相册</span>
            </button>
          </div>
        </div>

        {/* 相册网格 */}
        <AlbumGrid filter={filter} />
      </div>

      {/* 创建相册 Modal */}
      <CreateAlbumModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={handleCreateAlbum}
        loading={creating}
      />
    </div>
  );
}
