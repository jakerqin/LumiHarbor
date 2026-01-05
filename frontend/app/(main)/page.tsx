'use client';

import { BentoGrid } from '@/components/home/BentoGrid';
import { MapView3D } from '@/components/home/MapView3D';
import { Timeline } from '@/components/home/Timeline';

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
