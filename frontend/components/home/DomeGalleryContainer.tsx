'use client';

import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { homeApi } from '@/lib/api/home';
import DomeGallery from './DomeGallery';

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

  // 加载中状态
  if (isLoading) {
    return (
      <div className="h-[600px] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4 mx-auto" />
          <p className="text-foreground-secondary">加载精选时光中...</p>
        </div>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className="h-[600px] flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-red-500 mb-2">加载失败</p>
          <p className="text-sm text-foreground-tertiary">
            {error instanceof Error ? error.message : '未知错误'}
          </p>
        </div>
      </div>
    );
  }

  // 空状态
  if (!data || uniqueAssets.length === 0) {
    return (
      <div className="h-[600px] flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-foreground-secondary">暂无精选内容</p>
          <p className="text-sm text-foreground-tertiary mt-2">
            去素材库收藏你喜欢的照片吧 ❤️
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* 标题区域 */}
      <div className="mb-12">
        <h2 className="text-4xl font-heading font-bold mb-2">
          精选时光
        </h2>
        
      </div>

      {/* Dome Gallery 3D 球形画廊 */}
      <div className="w-full h-[600px] relative">
        <DomeGallery
          images={uniqueAssets}
          onLoadMore={handleLoadMore}
          grayscale={false}
          overlayBlurColor="rgba(6, 0, 16, 0.8)"
          imageBorderRadius="16px"
          openedImageBorderRadius="24px"
          openedImageWidth="33vw"
          openedImageHeight="33vh"
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
