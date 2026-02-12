'use client';

import { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { useQuery } from '@tanstack/react-query';
import { Globe as GlobeIcon, Map as MapIcon } from 'lucide-react';
import { mapApi } from '@/lib/api/map';
import { Footprint } from '@/lib/api/types';
import { Globe3DMap } from '@/components/map/Globe3DMap';
import { Mapbox2DMap } from '@/components/map/Mapbox2DMap';
import { FootprintDetail } from '@/components/map/FootprintDetail';
import { MapStatistics } from '@/components/map/MapStatistics';

export default function MapPage() {
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');
  const [selectedFootprintId, setSelectedFootprintId] = useState<string | null>(null);

  // 获取足迹点数据
  const { data: footprintsData, isLoading: footprintsLoading } = useQuery({
    queryKey: ['footprints'],
    queryFn: () => mapApi.getFootprints(),
  });

  // 获取统计数据（1小时缓存）
  const { data: statistics, isLoading: statsLoading } = useQuery({
    queryKey: ['map-statistics'],
    queryFn: () => mapApi.getStatistics(),
    staleTime: 1000 * 60 * 60,
  });

  const footprints = footprintsData?.footprints ?? [];

  const handleFootprintClick = (fp: Footprint) => {
    setSelectedFootprintId(fp.id);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      {/* 顶部工具栏 */}
      <div className="absolute top-6 left-6 right-6 z-10 flex items-center justify-between">
        {/* 统计面板 */}
        <div
          className="rounded-2xl px-5 py-3"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <MapStatistics statistics={statistics} isLoading={statsLoading} />
        </div>

        {/* 视图切换 */}
        <div
          className="flex items-center rounded-xl overflow-hidden"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <button
            onClick={() => setViewMode('3d')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm transition-colors cursor-pointer ${
              viewMode === '3d'
                ? 'bg-blue-500/20 text-blue-400'
                : 'text-foreground-secondary hover:text-foreground'
            }`}
          >
            <GlobeIcon className="w-4 h-4" />
            3D 地球
          </button>
          <button
            onClick={() => setViewMode('2d')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm transition-colors cursor-pointer ${
              viewMode === '2d'
                ? 'bg-blue-500/20 text-blue-400'
                : 'text-foreground-secondary hover:text-foreground'
            }`}
          >
            <MapIcon className="w-4 h-4" />
            2D 地图
          </button>
        </div>
      </div>

      {/* 地图容器 */}
      <div className="w-full h-full">
        {viewMode === '3d' ? (
          <Canvas
            camera={{ position: [0, 0, 5], fov: 45 }}
            style={{ width: '100%', height: '100%' }}
          >
            <Suspense fallback={null}>
              <Globe3DMap
                footprints={footprints}
                onFootprintClick={handleFootprintClick}
              />
            </Suspense>
          </Canvas>
        ) : (
          <Mapbox2DMap
            footprints={footprints}
            onFootprintClick={handleFootprintClick}
          />
        )}
      </div>

      {/* 加载提示 */}
      {footprintsLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
          <div
            className="rounded-2xl px-6 py-4 text-sm text-foreground-secondary"
            style={{
              background: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(10px)',
            }}
          >
            加载足迹数据中...
          </div>
        </div>
      )}

      {/* 操作提示 */}
      <div
        className="absolute bottom-6 right-6 z-10 rounded-xl px-4 py-3 text-sm text-foreground-secondary"
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <p>拖拽旋转 · 滚轮缩放 · 点击光点查看详情</p>
      </div>

      {/* 足迹点详情弹窗 */}
      <FootprintDetail
        footprintId={selectedFootprintId}
        onClose={() => setSelectedFootprintId(null)}
      />
    </div>
  );
}
