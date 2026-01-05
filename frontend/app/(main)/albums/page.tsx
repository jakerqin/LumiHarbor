'use client';

import { AlbumGrid } from '@/components/albums/AlbumGrid';
import { FolderOpen, Plus } from '@phosphor-icons/react/dist/ssr';
import { motion } from 'framer-motion';

export default function AlbumsPage() {
  const handleCreateAlbum = () => {
    // TODO: 打开创建相册对话框
    console.log('Create album');
  };

  return (
    <div className="min-h-screen py-12 px-8">
      <div className="max-w-[1920px] mx-auto">
        {/* 页面头部 */}
        <div className="mb-12">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-heading font-bold mb-2 flex items-center gap-3">
                <FolderOpen size={40} weight="duotone" className="text-primary" />
                相册
              </h1>
              <p className="text-foreground-secondary">整理和管理你的照片集合</p>
            </div>

            {/* 创建按钮 */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleCreateAlbum}
              className="px-6 py-3 bg-primary hover:bg-primary-hover rounded-xl flex items-center gap-2 transition-colors"
            >
              <Plus size={20} weight="bold" />
              <span className="font-medium">创建相册</span>
            </motion.button>
          </div>
        </div>

        {/* 相册网格 */}
        <AlbumGrid />
      </div>
    </div>
  );
}
