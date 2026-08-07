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
const START = '#0d9488';
const START_SELECTED = '#0f766e';
const MARKER_RING = '#ffffff';
const PRIMARY_GLOW = 'rgba(226,61,107,0.4)';
const START_GLOW = 'rgba(13,148,136,0.45)';

type MarkerRole = 'start' | 'mid';

function hasAmapKey() {
  return Boolean(process.env.NEXT_PUBLIC_AMAP_KEY);
}

/** 足迹点标签：网格内首次拍摄日 YYYY.MM.DD */
function formatFirstShotDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}

function footprintPlaceName(fp: Footprint): string {
  return fp.location_poi || fp.location_city || fp.location_country || '';
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function markerColors(role: MarkerRole, selected: boolean) {
  if (role === 'start') {
    return {
      fill: selected ? START_SELECTED : START,
      glow: selected ? `,0 0 0 3px ${START_GLOW}` : '',
      border: 'rgba(13,148,136,0.35)',
      dateColor: selected ? START_SELECTED : '#0f766e',
    };
  }
  return {
    fill: selected ? PRIMARY_SELECTED : PRIMARY,
    glow: selected ? `,0 0 0 3px ${PRIMARY_GLOW}` : '',
    border: 'rgba(226,61,107,0.28)',
    dateColor: selected ? PRIMARY_SELECTED : '#3d3428',
  };
}

function markerSize(role: MarkerRole, selected: boolean) {
  if (role === 'start') return selected ? 20 : 16;
  return selected ? 14 : 10;
}

function buildMarkerContent(opts: {
  role: MarkerRole;
  selected: boolean;
  size: number;
  dateLabel: string;
  placeName: string;
}): string {
  const { role, selected, size, dateLabel, placeName } = opts;
  const colors = markerColors(role, selected);
  const roleTag =
    role === 'start'
      ? `<div style="color:${START};font-weight:700;font-size:10px;letter-spacing:0.04em;">起点</div>`
      : '';
  const lines = [
    roleTag,
    dateLabel
      ? `<div style="font-variant-numeric:tabular-nums;color:${colors.dateColor};font-weight:${selected || role === 'start' ? 600 : 500};">${escapeHtml(dateLabel)}</div>`
      : '',
    placeName
      ? `<div style="color:#5c5246;font-weight:500;max-width:7.5em;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(placeName)}</div>`
      : '',
  ].filter(Boolean);
  // 外层固定为圆点尺寸，offset 才能对准地理坐标；标签绝对定位溢出，不拉偏锚点
  const label = lines.length
    ? `<div style="
        position:absolute;left:${size + 5}px;top:50%;transform:translateY(-50%);
        padding:3px 7px;border-radius:6px;
        background:rgba(255,250,243,0.94);border:1px solid ${colors.border};
        font-size:11px;line-height:1.35;white-space:nowrap;
        box-shadow:0 1px 3px rgba(80,20,40,0.12);
      ">${lines.join('')}</div>`
    : '';
  return `<div style="position:relative;width:${size}px;height:${size}px;cursor:pointer;">
    <div style="
      width:${size}px;height:${size}px;border-radius:999px;
      background:${colors.fill};
      border:2px solid ${MARKER_RING};
      box-shadow:0 1px 5px rgba(80,20,40,0.35)${colors.glow};
    "></div>${label}
  </div>`;
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

    const markers = gcjPoints.map(({ fp, lng, lat }, index) => {
      const selected = fp.id === selectedFootprintId;
      const role: MarkerRole = index === 0 ? 'start' : 'mid';
      const size = markerSize(role, selected);
      const dateLabel = formatFirstShotDate(fp.first_shot_at);
      const placeName = footprintPlaceName(fp);
      const marker = new AMap.Marker({
        position: [lng, lat],
        offset: new AMap.Pixel(-size / 2, -size / 2),
        zIndex: role === 'start' ? 120 : selected ? 110 : 100,
        title: [role === 'start' ? '起点' : '', placeName, dateLabel]
          .filter(Boolean)
          .join(' · '),
        content: buildMarkerContent({ role, selected, size, dateLabel, placeName }),
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
        strokeOpacity: 0.85,
        strokeWeight: 7,
        lineJoin: 'round',
        showDir: true,
        dirColor: '#fffaf3',
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
