'use client';

import dynamic from 'next/dynamic';
import { BentoGrid } from '@/components/home/BentoGrid';

// 动态导入重量级组件，提升首屏加载速度
const MapView3D = dynamic(
  () => import('@/components/home/MapView3D').then((mod) => mod.MapView3D),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[600px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4 mx-auto" />
          <p className="text-foreground-secondary">加载 3D 地图中...</p>
        </div>
      </div>
    ),
  }
);

const Timeline = dynamic(
  () => import('@/components/home/Timeline').then((mod) => mod.Timeline),
  {
    loading: () => (
      <div className="flex items-center justify-center h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4 mx-auto" />
          <p className="text-foreground-secondary">加载时间轴中...</p>
        </div>
      </div>
    ),
  }
);

export default function HomePage() {
  return (
    <main className="w-full">
      {/* 精选照片墙区域 */}
      <section className="min-h-screen w-full py-20 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12">
            <h1 className="text-5xl font-heading font-bold mb-4 bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
              拾光坞
            </h1>
            <p className="text-xl text-foreground-secondary">
              记录生活，珍藏回忆
            </p>
          </div>
          <BentoGrid />
        </div>
      </section>

      {/* 3D 足迹地图区域 */}
      <section className="min-h-screen w-full py-20 px-8 bg-background-secondary">
        <div className="max-w-7xl mx-auto mb-12">
          <h2 className="text-4xl font-heading font-bold mb-2">足迹地图</h2>
          <p className="text-foreground-secondary">探索你走过的每一个角落</p>
        </div>
        <MapView3D />
      </section>

      {/* 大事记时间轴区域 */}
      <section className="min-h-screen w-full py-20">
        <Timeline />
      </section>
    </main>
  );
}
