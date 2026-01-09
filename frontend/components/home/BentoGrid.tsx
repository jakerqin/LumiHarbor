'use client';

import { useQuery } from '@tanstack/react-query';
import { homeApi } from '@/lib/api/home';
import { BentoCard } from './BentoCard';
import { calculateBentoSize, getGridColumns } from '@/lib/utils/bento';

export function BentoGrid() {
  const { data, isLoading } = useQuery({
    queryKey: ['featured-assets'],
    queryFn: () => homeApi.getFeatured(9),
  });

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4 mx-auto" />
          <p className="text-foreground-secondary">加载精选内容中...</p>
        </div>
      </div>
    );
  }

  if (!data || data.assets.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-foreground-secondary">暂无精选内容</p>
          <p className="text-sm text-foreground-tertiary mt-2">
            去素材库收藏你喜欢的照片吧 ❤️
          </p>
        </div>
      </div>
    );
  }

  const { assets, total } = data;
  const gridCols = getGridColumns(assets.length);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-12">
        <h2 className="text-4xl font-heading font-bold mb-2">
          精选时光
        </h2>
        <p className="text-foreground-secondary">
          你收藏的 {total} 个美好瞬间
        </p>
      </div>

      <div className={`grid ${gridCols} gap-4 auto-rows-min`}>
        {assets.map((asset, index) => (
          <BentoCard
            key={asset.id}
            asset={asset}
            size={calculateBentoSize(asset.aspectRatio || 'square', index, assets.length)}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}
