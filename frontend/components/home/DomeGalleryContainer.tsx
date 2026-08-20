'use client';

import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { homeApi } from '@/lib/api/home';
import DomeGallery from './DomeGallery';
import { EmptyState } from '@/components/common/EmptyState';
import { MasonrySkeleton } from '@/components/common/MasonrySkeleton';

/**
 * DomeGalleryContainer - 容器组件
 *
 * 负责数据获取、动态加载、状态管理
 */
export function DomeGalleryContainer() {
  const [loadedCount, setLoadedCount] = useState(50); // 当前已加载数量
  const MAX_ASSETS = 150; // 最大加载数量

  // 获取精选素材数据
  const { data, isLoading, error } = useQuery({
    queryKey: ['featured-assets-dome', loadedCount],
    queryFn: () => homeApi.getFeatured(loadedCount),
  });

  // 加载更多回调
  const handleLoadMore = useCallback(() => {
    if (!data) return;
    if (loadedCount >= MAX_ASSETS) return;
    if (loadedCount >= data.total) return; // 已加载全部

    // 每次加载额外 30 张
    const nextCount = Math.min(loadedCount + 30, MAX_ASSETS, data.total);
    setLoadedCount(nextCount);
  }, [data, loadedCount]);

  // 去重后的素材列表
  const uniqueAssets = useMemo(() => {
    if (!data?.assets) return [];
    const seen = new Set<number>();
    return data.assets.filter(asset => {
      if (seen.has(asset.id)) return false;
      seen.add(asset.id);
      return true;
    });
  }, [data?.assets]);

  if (isLoading) {
    return (
      <div className="min-h-[320px]">
        <div className="h-8 w-36 rounded bg-background-tertiary animate-pulse mb-8" />
        <MasonrySkeleton count={8} />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="精选加载失败"
        description={error instanceof Error ? error.message : '请稍后重试'}
        action={{ label: '刷新', onClick: () => window.location.reload() }}
      />
    );
  }

  if (!data || uniqueAssets.length === 0) {
    return (
      <EmptyState
        title="还没有精选"
        description="在素材库收藏喜欢的照片，它们会出现在这里。"
        action={{ label: '去素材库', href: '/assets' }}
        secondaryAction={{ label: '手机快传', href: '/mobile-upload' }}
      />
    );
  }

  return (
    <>
      <div className="mb-8">
        <h2 className="text-section font-heading">精选时光</h2>
      </div>

      {/* Dome Gallery 3D 球形画廊 */}
      <div className="w-full h-[600px] relative">
        <DomeGallery
          images={uniqueAssets}
          onLoadMore={handleLoadMore}
          grayscale={false}
          overlayBlurColor="rgba(22, 20, 15, 0.4)"
          imageBorderRadius="16px"
          openedImageBorderRadius="24px"
          openedImageWidth="auto"
          openedImageHeight="auto"
        />
        {/* 加载进度提示 */}
        {loadedCount < data.total && loadedCount < MAX_ASSETS && (
          <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full text-sm text-white/80">
            已加载 {loadedCount} / {Math.min(data.total, MAX_ASSETS)} 张
          </div>
        )}
      </div>
    </>
  );
}
