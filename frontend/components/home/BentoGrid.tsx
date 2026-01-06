'use client';

import { useQuery } from '@tanstack/react-query';
import { homeApi } from '@/lib/api/home';
import { BentoCard } from './BentoCard';

const bentoSizes = [
  'large',
  'medium',
  'small',
  'small',
  'medium',
  'small',
  'small',
  'small',
  'small',
] as const;

export function BentoGrid() {
  const { data: assets, isLoading } = useQuery({
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

  if (!assets || assets.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-foreground-secondary">暂无精选内容</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-12">
        <h2 className="text-4xl font-heading font-bold mb-2">
          精选时光
        </h2>
        <p className="text-foreground-secondary">
          AI 为你挑选的高光时刻
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 auto-rows-min">
        {assets.map((asset, index) => (
          <BentoCard
            key={asset.id}
            asset={asset}
            size={bentoSizes[index]}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}
