'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapPin } from 'lucide-react';
import { mapApi } from '@/lib/api/map';
import type { Footprint } from '@/lib/api/types';
import { Amap2DMap } from '@/components/map/Amap2DMap';
import { FootprintDetail } from '@/components/map/FootprintDetail';
import { MapStatistics } from '@/components/map/MapStatistics';

export default function MapPage() {
  const [selectedFootprintId, setSelectedFootprintId] = useState<string | null>(null);
  const [deepLinkApplied, setDeepLinkApplied] = useState(false);

  const { data: footprintsData, isLoading: footprintsLoading } = useQuery({
    queryKey: ['footprints'],
    queryFn: () => mapApi.getFootprints(),
  });

  const { data: statistics, isLoading: statsLoading } = useQuery({
    queryKey: ['map-statistics'],
    queryFn: () => mapApi.getStatistics(),
    staleTime: 1000 * 60 * 60,
  });

  const footprints = footprintsData?.footprints ?? [];

  // 首页预览点进 /map?fp= 时自动打开对应足迹（只应用一次）
  useEffect(() => {
    if (deepLinkApplied || footprints.length === 0) return;
    const fp = new URLSearchParams(window.location.search).get('fp');
    if (fp && footprints.some((item) => item.id === fp)) {
      setSelectedFootprintId(fp);
    }
    setDeepLinkApplied(true);
  }, [footprints, deepLinkApplied]);

  const handleFootprintClick = (fp: Footprint) => {
    setSelectedFootprintId(fp.id);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-background">
      <div className="absolute top-6 left-6 right-6 z-10 flex items-start justify-between gap-4 pointer-events-none">
        <div className="pointer-events-auto max-w-full">
          <MapStatistics statistics={statistics} isLoading={statsLoading} />
        </div>
      </div>

      <div className="w-full h-full">
        <Amap2DMap
          footprints={footprints}
          selectedFootprintId={selectedFootprintId}
          onFootprintClick={handleFootprintClick}
        />
      </div>

      {footprintsLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
          <div className="rounded-2xl px-6 py-4 text-sm text-foreground-secondary bg-black/60 backdrop-blur-md">
            加载足迹数据中...
          </div>
        </div>
      )}

      {!footprintsLoading && footprints.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none px-6">
          <div className="max-w-sm pointer-events-auto rounded-2xl border border-[#e4d4bc] bg-[#fffaf3]/95 px-6 py-8 text-center shadow-lg shadow-stone-900/12 backdrop-blur-md">
            <MapPin className="mx-auto mb-3 h-8 w-8 text-[#a67c4a]" />
            <p className="mb-2 font-heading text-card-title text-[#3d3428]">还没有足迹</p>
            <p className="text-pretty text-sm text-[#8a7a66]">
              导入带 GPS 定位的照片后，会按地点自动聚合到这里。
            </p>
          </div>
        </div>
      )}

      {!selectedFootprintId && footprints.length > 0 && (
        <div className="absolute bottom-6 right-6 z-10 rounded-xl border border-[#e4d4bc] bg-[#fffaf3]/95 px-4 py-3 text-sm text-[#5c5246] shadow-md shadow-stone-900/10 backdrop-blur-md">
          <p>拖拽平移 · 滚轮缩放 · 点击足迹点查看照片</p>
        </div>
      )}

      <FootprintDetail
        footprintId={selectedFootprintId}
        onClose={() => setSelectedFootprintId(null)}
      />
    </div>
  );
}
