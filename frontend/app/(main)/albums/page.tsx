'use client';

import { useRef } from 'react';
import { AlbumGrid } from '@/components/albums/AlbumGrid';
import { FolderOpen, Plus } from 'lucide-react';
import { useGsapPressableScale } from '@/lib/hooks/useGsapPressableScale';

export default function AlbumsPage() {
  const createButtonRef = useRef<HTMLButtonElement>(null);
  const createButtonHandlers = useGsapPressableScale(createButtonRef);

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
                <FolderOpen size={40} className="text-primary" />
                相册
              </h1>
              <p className="text-foreground-secondary">整理和管理你的照片集合</p>
            </div>

            {/* 创建按钮 */}
            <button
              ref={createButtonRef}
              onClick={handleCreateAlbum}
              {...createButtonHandlers}
              className="px-6 py-3 bg-primary hover:bg-primary-hover rounded-xl flex items-center gap-2 transition-colors"
            >
              <Plus size={20} />
              <span className="font-medium">创建相册</span>
            </button>
          </div>
        </div>

        {/* 相册网格 */}
        <AlbumGrid />
      </div>
    </div>
  );
}
