'use client';

import { useQuery } from '@tanstack/react-query';
import { AssetCard } from './AssetCard';
import { assetsApi, type AssetsFilter } from '@/lib/api/assets';
import { useState } from 'react';

interface AssetGridProps {
  filter?: AssetsFilter;
  onAssetClick?: (id: number) => void;
}

export function AssetGrid({ filter, onAssetClick }: AssetGridProps) {
  const [page, setPage] = useState(1);
  const pageSize = 30;

  const { data, isLoading, error } = useQuery({
    queryKey: ['assets', page, pageSize, filter],
    queryFn: () => assetsApi.getAssets(page, pageSize, filter),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4 mx-auto" />
          <p className="text-foreground-secondary">加载素材中...</p>
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

  if (!data || data.assets.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <p className="text-xl text-foreground-secondary">暂无素材</p>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(data.total / pageSize);

  return (
    <div>
      {/* 素材网格 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {data.assets.map((asset) => (
          <AssetCard key={asset.id} asset={asset} onClick={() => onAssetClick?.(asset.id)} />
        ))}
      </div>

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
            共 {data.total} 个素材
          </span>
        </div>
      )}
    </div>
  );
}
