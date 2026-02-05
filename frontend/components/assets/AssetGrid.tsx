'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AssetMasonry } from './AssetMasonry';
import { assetsApi, type AssetsFilter, type AssetsResponse } from '@/lib/api/assets';
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll';
import type { Asset } from '@/lib/api/types';

interface AssetGridProps {
  filter?: AssetsFilter;
  onAssetClick?: (id: number) => void;
  onAssetSelect?: (asset: Asset) => void;
  selectionMode?: boolean;
  selectedAssetIds?: Set<number>;
  onSelectionToggle?: (asset: Asset) => void;
}

export function AssetGrid({
  filter,
  onAssetClick,
  onAssetSelect,
  selectionMode = false,
  selectedAssetIds,
  onSelectionToggle,
}: AssetGridProps) {
  const [page, setPage] = useState(1);
  const [allAssets, setAllAssets] = useState<Asset[]>([]);
  const pageSize = 30;
  const lastProcessedPageRef = useRef(0);
  const prevFilterRef = useRef<string>('');

  const { data, isLoading, error, isFetching } = useQuery<AssetsResponse>({
    queryKey: ['assets', page, pageSize, filter],
    queryFn: () => assetsApi.getAssets(page, pageSize, filter),
  });

  // 组件挂载时重置到第一页
  useEffect(() => {
    setPage(1);
    setAllAssets([]);
    lastProcessedPageRef.current = 0;
    prevFilterRef.current = JSON.stringify(filter);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 当数据更新时，更新 allAssets（确保每页只处理一次）
  useEffect(() => {
    if (data && page > lastProcessedPageRef.current) {
      if (page === 1) {
        setAllAssets(data.assets);
      } else {
        setAllAssets((prev) => [...prev, ...data.assets]);
      }
      lastProcessedPageRef.current = page;
    }
  }, [data, page]);

  // 当筛选条件内容真正变化时，重置页码和列表
  useEffect(() => {
    const currentFilter = JSON.stringify(filter);
    if (prevFilterRef.current && currentFilter !== prevFilterRef.current) {
      setPage(1);
      setAllAssets([]);
      lastProcessedPageRef.current = 0;
    }
    prevFilterRef.current = currentFilter;
  }, [filter]);

  // 无限滚动：距离底部 500px 时加载下一页
  useInfiniteScroll(
    () => {
      if (data?.has_more) {
        setPage((p) => p + 1);
      }
    },
    data?.has_more ?? false,
    isFetching,
    500
  );

  if ((isLoading || isFetching) && page === 1 && allAssets.length === 0) {
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

  if (allAssets.length === 0 && !isLoading && !isFetching) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <p className="text-xl text-foreground-secondary">暂无素材</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* 瀑布流网格 */}
      <AssetMasonry
        assets={allAssets}
        onAssetClick={(id) => onAssetClick?.(id)}
        onAssetSelect={onAssetSelect}
        selectionMode={selectionMode}
        selectedAssetIds={selectedAssetIds}
        onSelectionToggle={onSelectionToggle}
        disableHoverEffects={selectionMode}
      />

      {/* 加载更多提示 */}
      {isFetching && page > 1 && (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-2 mx-auto" />
            <p className="text-sm text-foreground-secondary">加载更多...</p>
          </div>
        </div>
      )}

      {/* 已加载全部提示 */}
      {!data?.has_more && allAssets.length > 0 && (
        <div className="flex items-center justify-center py-8">
          <p className="text-sm text-foreground-secondary">
            已加载全部 {data?.total} 个素材
          </p>
        </div>
      )}
    </div>
  );
}
