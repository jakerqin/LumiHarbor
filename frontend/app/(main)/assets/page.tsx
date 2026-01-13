'use client';

import { AssetGrid } from '@/components/assets/AssetGrid';
import { Image } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AssetsPage() {
  const router = useRouter();

  const handleAssetClick = (id: number) => {
    router.push(`/assets/${id}`);
  };

  return (
    <div className="min-h-screen py-12 px-8">
      <div className="max-w-[1920px] mx-auto">
        {/* 页面头部 */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-heading font-bold mb-2 flex items-center gap-3">
                <Image size={40} className="text-primary" />
                素材库
              </h1>
              <p className="text-foreground-secondary">浏览和管理所有照片、视频素材</p>
            </div>

            {/* 筛选占位（后续实现） */}
            <div className="px-4 py-2 rounded-xl bg-background-secondary text-foreground-secondary border border-white/5">
              筛选功能建设中
            </div>
          </div>
        </div>

        {/* 素材网格 */}
        <AssetGrid onAssetClick={handleAssetClick} />
      </div>
    </div>
  );
}
