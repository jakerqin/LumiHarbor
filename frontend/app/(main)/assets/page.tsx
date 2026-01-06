'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { gsap } from 'gsap';
import { AssetGrid } from '@/components/assets/AssetGrid';
import { AssetFilter } from '@/components/assets/AssetFilter';
import { assetsApi, type AssetsFilter } from '@/lib/api/assets';
import { Image } from 'lucide-react';

export default function AssetsPage() {
  const [filter, setFilter] = useState<AssetsFilter>({});
  const filterTagsRef = useRef<HTMLDivElement>(null);

  // 获取标签和地点列表
  const { data: tags = [] } = useQuery({
    queryKey: ['assets-tags'],
    queryFn: () => assetsApi.getTags(),
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['assets-locations'],
    queryFn: () => assetsApi.getLocations(),
  });

  const handleAssetClick = (id: number) => {
    // TODO: 打开素材详情模态框
    console.log('Open asset:', id);
  };

  // 活动筛选标签显示动画
  const hasActiveFilter = filter.type || filter.location || (filter.tags && filter.tags.length > 0);

  useEffect(() => {
    if (!filterTagsRef.current) return;

    if (hasActiveFilter) {
      filterTagsRef.current.style.display = 'flex';
      gsap.fromTo(
        filterTagsRef.current,
        { opacity: 0, y: -10 },
        { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }
      );
    } else {
      gsap.to(filterTagsRef.current, {
        opacity: 0,
        y: -10,
        duration: 0.2,
        ease: 'power2.in',
        onComplete: () => {
          if (filterTagsRef.current) {
            filterTagsRef.current.style.display = 'none';
          }
        },
      });
    }
  }, [hasActiveFilter, filter.type, filter.location, filter.tags]);

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

            {/* 筛选器 */}
            <AssetFilter filter={filter} onChange={setFilter} tags={tags} locations={locations} />
          </div>

          {/* 活动筛选标签 */}
          {hasActiveFilter && (
            <div
              ref={filterTagsRef}
              className="flex items-center gap-2 flex-wrap"
              style={{ opacity: 0, display: 'none' }}
            >
              <span className="text-sm text-foreground-secondary">当前筛选：</span>

              {filter.type && (
                <span className="px-3 py-1 bg-primary/20 text-primary rounded-lg text-sm">
                  {filter.type === 'image' ? '图片' : '视频'}
                </span>
              )}

              {filter.location && (
                <span className="px-3 py-1 bg-primary/20 text-primary rounded-lg text-sm">
                  {filter.location}
                </span>
              )}

              {filter.tags?.map((tag) => (
                <span key={tag} className="px-3 py-1 bg-primary/20 text-primary rounded-lg text-sm">
                  {tag}
                </span>
              ))}

              <button
                onClick={() => setFilter({})}
                className="text-sm text-foreground-secondary hover:text-primary transition-colors underline"
              >
                清除全部
              </button>
            </div>
          )}
        </div>

        {/* 素材网格 */}
        <AssetGrid filter={filter} onAssetClick={handleAssetClick} />
      </div>
    </div>
  );
}
