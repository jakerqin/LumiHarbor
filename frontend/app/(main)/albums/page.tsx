'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlbumGrid } from '@/components/albums/AlbumGrid';
import { AlbumFilterBar, type AlbumsFilter } from '@/components/albums/AlbumFilterBar';
import { CreateAlbumModal, type CreateAlbumData } from '@/components/albums/CreateAlbumModal';
import { ImportAlbumModal, type ImportAlbumData } from '@/components/albums/ImportAlbumModal';
import { FolderOpen, FolderPlus, FolderInput } from 'lucide-react';
import { albumsApi } from '@/lib/api/albums';
import { toast } from 'sonner';

// 禁用静态生成，因为页面使用了浏览器 API
export const dynamic = 'force-dynamic';

export default function AlbumsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<AlbumsFilter>({});
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);

  const handleCreateAlbum = async (data: CreateAlbumData) => {
    if (creating) return;
    setCreating(true);
    try {
      await albumsApi.createAlbum(data);
      queryClient.invalidateQueries({ queryKey: ['albums'] });
      setCreateModalOpen(false);
      toast.success('相册创建成功');
    } catch (error) {
      console.error(error);
      toast.error('创建失败，请稍后重试');
    } finally {
      setCreating(false);
    }
  };

  const handleImportAlbum = async (data: ImportAlbumData) => {
    if (importing) return;
    setImporting(true);
    try {
      await albumsApi.importFromFolder(data);
      queryClient.invalidateQueries({ queryKey: ['albums'] });
      setImportModalOpen(false);
      toast.success('导入任务已启动，素材正在后台导入');
    } catch (error) {
      console.error(error);
      toast.error('导入失败，请检查路径是否正确');
    } finally {
      setImporting(false);
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
            {/* 从文件夹导入按钮 */}
            <button
              type="button"
              onClick={() => setImportModalOpen(true)}
              className="group relative h-11 w-11 rounded-xl bg-background-secondary hover:bg-background-tertiary border border-white/10 inline-flex items-center justify-center transition-colors"
              aria-label="从文件夹导入"
            >
              <FolderInput size={20} />
              <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-background-secondary border border-white/10 rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                从文件夹导入
              </span>
            </button>

            {/* 创建按钮 */}
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="group relative h-11 w-11 rounded-xl bg-background-secondary hover:bg-background-tertiary border border-white/10 inline-flex items-center justify-center transition-colors"
              aria-label="创建相册"
            >
              <FolderPlus size={20} />
              <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-background-secondary border border-white/10 rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                创建相册
              </span>
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

      {/* 从文件夹导入 Modal */}
      <ImportAlbumModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSubmit={handleImportAlbum}
        loading={importing}
      />
    </div>
  );
}
