'use client';

import { useEffect, useRef, useState } from 'react';
import type { Footprint } from '@/lib/api/types';
import { wgs84ToGcj02 } from '@/lib/utils/coord';

interface Amap2DMapProps {
  footprints: Footprint[];
  selectedFootprintId: string | null;
  onFootprintClick: (footprint: Footprint) => void;
}

const PRIMARY = '#e23d6b';
const PRIMARY_SELECTED = '#c41e4a';
const MARKER_RING = '#ffffff';
const PRIMARY_GLOW = 'rgba(226,61,107,0.4)';

function hasAmapKey() {
  return Boolean(process.env.NEXT_PUBLIC_AMAP_KEY);
}

/** 高德 2D 足迹底图（中文标注）；API 坐标为 WGS84，展示前转 GCJ-02 */
export function Amap2DMap({
  footprints,
  selectedFootprintId,
  onFootprintClick,
}: Amap2DMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylineRef = useRef<any>(null);
  const clickRef = useRef(onFootprintClick);
  const [mapReady, setMapReady] = useState(false);
  clickRef.current = onFootprintClick;

  useEffect(() => {
    if (!containerRef.current || !hasAmapKey()) return;
    let cancelled = false;

    const init = async () => {
      try {
        const AMapLoader = (await import('@amap/amap-jsapi-loader')).default;
        (window as any)._AMapSecurityConfig = {
          securityJsCode: process.env.NEXT_PUBLIC_AMAP_SECURITY_CODE || '',
        };

        const AMap = await AMapLoader.load({
          key: process.env.NEXT_PUBLIC_AMAP_KEY || '',
          version: '2.0',
          plugins: [],
        });

        if (cancelled || !containerRef.current) return;

        const map = new AMap.Map(containerRef.current, {
          zoom: 4,
          center: [116.4, 35.0],
          viewMode: '2D',
          mapStyle: 'amap://styles/macaron',
        });
        mapRef.current = map;
        setMapReady(true);
      } catch (err) {
        console.error('高德地图加载失败:', err);
      }
    };

    init();

    return () => {
      cancelled = true;
      setMapReady(false);
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const AMap = (window as any).AMap;
    if (!mapReady || !map || !AMap) return;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    if (footprints.length === 0) return;

    const gcjPoints = footprints.map((fp) => {
      const [lng, lat] = wgs84ToGcj02(fp.longitude, fp.latitude);
      return { fp, lng, lat };
    });

    const markers = gcjPoints.map(({ fp, lng, lat }) => {
      const selected = fp.id === selectedFootprintId;
      const size = selected ? 14 : 10;
      const marker = new AMap.Marker({
        position: [lng, lat],
        offset: new AMap.Pixel(-size / 2, -size / 2),
        title: fp.location_city || fp.location_country || '',
        content: `<div style="
          width:${size}px;height:${size}px;border-radius:999px;
          background:${selected ? PRIMARY_SELECTED : PRIMARY};
          border:2px solid ${MARKER_RING};
          box-shadow:0 1px 5px rgba(80,20,40,0.35)${selected ? `,0 0 0 3px ${PRIMARY_GLOW}` : ''};
          cursor:pointer;
        "></div>`,
      });
      marker.on('click', () => clickRef.current(fp));
      marker.setMap(map);
      return marker;
    });
    markersRef.current = markers;

    if (gcjPoints.length >= 2) {
      const path = gcjPoints.map((p) => [p.lng, p.lat]);
      const line = new AMap.Polyline({
        path,
        strokeColor: PRIMARY,
        strokeOpacity: 0.8,
        strokeWeight: 3,
        lineJoin: 'round',
      });
      line.setMap(map);
      polylineRef.current = line;
    }
  }, [footprints, selectedFootprintId, mapReady]);

  // 仅足迹列表变化时自适应视野，避免选中时反复 setFitView
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || footprints.length === 0 || markersRef.current.length === 0) return;
    map.setFitView(
      markersRef.current,
      false,
      [80, 80, 80, 80],
      footprints.length === 1 ? 12 : undefined
    );
  }, [footprints, mapReady]);

  if (!hasAmapKey()) {
    return (
      <div className="w-full h-full flex items-center justify-center text-foreground-secondary px-6 text-center">
        <p className="text-sm">
          请配置 <code className="text-primary">NEXT_PUBLIC_AMAP_KEY</code> 与{' '}
          <code className="text-primary">NEXT_PUBLIC_AMAP_SECURITY_CODE</code>
        </p>
      </div>
    );
  }

  return <div ref={containerRef} className="w-full h-full" />;
}
