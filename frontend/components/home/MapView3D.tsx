'use client';

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { useQuery } from '@tanstack/react-query';
import { homeApi } from '@/lib/api/home';
import { Globe3D } from './Globe3D';
import { Location } from '@/lib/api/types';

export function MapView3D() {
  const { data: locationsData } = useQuery({
    queryKey: ['locations'],
    queryFn: homeApi.getLocations,
  });

  const locations = locationsData || [];

  const handleLocationClick = (location: Location) => {
    console.log('点击地点:', location);
  };

  return (
    <div className="relative w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        style={{ width: '100%', height: '100%' }}
      >
        <Suspense fallback={null}>
          <Globe3D locations={locations} onLocationClick={handleLocationClick} />
        </Suspense>
      </Canvas>

      {locationsData && locationsData.length > 0 && (
        <div className="absolute top-6 left-6 glass rounded-xl p-4 max-w-xs">
          <h3 className="font-heading font-semibold mb-3 text-lg">足迹统计</h3>
          <div className="space-y-2 text-sm text-foreground-secondary">
            <div className="flex items-center justify-between">
              <span>🌍 访问国家</span>
              <span className="font-semibold text-foreground">
                {Array.from(new Set(locations.map((l) => l.country))).length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>🏙️ 访问城市</span>
              <span className="font-semibold text-foreground">
                {locations.length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>📸 拍摄素材</span>
              <span className="font-semibold text-foreground">
                {locations.reduce((sum, l) => sum + l.assetCount, 0)}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="absolute bottom-6 right-6 glass rounded-xl p-4 text-sm text-foreground-secondary">
        <p>🖱️ 拖拽旋转 · 滚轮缩放</p>
        <p>🎯 点击光点查看详情</p>
      </div>
    </div>
  );
}
