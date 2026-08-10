'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { MapPin } from 'lucide-react';
import { mapApi } from '@/lib/api/map';
import type { Footprint } from '@/lib/api/types';

const Amap2DMap = dynamic(
  () => import('@/components/map/Amap2DMap').then((mod) => mod.Amap2DMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full animate-pulse bg-background-tertiary/60" />
    ),
  }
);

/** 首页足迹地图预览：视口内再拉数据与挂高德，点击进 /map */
export function HomeFootprintPreview() {
  const sectionRef = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '240px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['footprints'],
    queryFn: () => mapApi.getFootprints(),
    enabled: inView,
  });

  const footprints = data?.footprints ?? [];

  const handleFootprintClick = (fp: Footprint) => {
    router.push(`/map?fp=${encodeURIComponent(fp.id)}`);
  };

  return (
    <section
      ref={sectionRef}
      className="w-full py-16 sm:py-20 px-4 sm:px-8 bg-background-secondary"
    >
      <div className="max-w-[1400px] mx-auto">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <div className="max-w-md">
            <h2 className="text-section font-heading mb-2">足迹地图</h2>
            <p className="text-foreground-secondary">探索你走过的每一个角落</p>
          </div>
          <Link
            href="/map"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary-hover text-sm transition-colors self-start sm:self-auto"
          >
            打开地图
          </Link>
        </div>

        <div className="relative h-[min(68vh,640px)] min-h-[420px] overflow-hidden rounded-2xl border border-border/60 bg-background">
          {inView && !isLoading && !isError && footprints.length > 0 && (
            <Amap2DMap
              footprints={footprints}
              selectedFootprintId={null}
              onFootprintClick={handleFootprintClick}
              variant="preview"
            />
          )}

          {inView && isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-sm text-foreground-secondary">加载足迹中…</p>
            </div>
          )}

          {inView && !isLoading && (isError || footprints.length === 0) && (
            <div className="absolute inset-0 flex items-center justify-center px-6">
              <div className="max-w-sm text-center">
                <MapPin className="mx-auto mb-3 h-7 w-7 text-foreground-tertiary" />
                <p className="mb-1 font-heading text-card-title">还没有足迹</p>
                <p className="text-sm text-foreground-secondary text-pretty">
                  导入带 GPS 定位的照片后，轨迹会显示在这里。
                </p>
              </div>
            </div>
          )}

          {!inView && (
            <div className="absolute inset-0 animate-pulse bg-background-tertiary/40" />
          )}
        </div>
      </div>
    </section>
  );
}
