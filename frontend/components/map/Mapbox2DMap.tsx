'use client';

import { useCallback, useMemo } from 'react';
import Map, { Marker, Source, Layer, NavigationControl } from 'react-map-gl/mapbox';
import type { LayerProps } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Footprint } from '@/lib/api/types';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

interface Mapbox2DMapProps {
  footprints: Footprint[];
  onFootprintClick: (footprint: Footprint) => void;
}

/** 足迹连线样式 */
const lineLayer: LayerProps = {
  id: 'footprint-line',
  type: 'line',
  paint: {
    'line-color': '#3b82f6',
    'line-width': 2.5,
    'line-opacity': 0.7,
  },
};

export function Mapbox2DMap({ footprints, onFootprintClick }: Mapbox2DMapProps) {
  // 足迹连线 GeoJSON
  const lineGeoJSON = useMemo(() => ({
    type: 'Feature' as const,
    properties: {},
    geometry: {
      type: 'LineString' as const,
      coordinates: footprints.map((fp) => [fp.longitude, fp.latitude]),
    },
  }), [footprints]);

  // 计算初始视角（居中到足迹中心）
  const initialViewState = useMemo(() => {
    if (footprints.length === 0) {
      return { longitude: 116.4, latitude: 35.0, zoom: 3 };
    }
    const avgLat = footprints.reduce((s, f) => s + f.latitude, 0) / footprints.length;
    const avgLng = footprints.reduce((s, f) => s + f.longitude, 0) / footprints.length;
    return { longitude: avgLng, latitude: avgLat, zoom: 4 };
  }, [footprints]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="w-full h-full flex items-center justify-center text-foreground-secondary">
        <p className="text-sm">请在 .env.local 中配置 NEXT_PUBLIC_MAPBOX_TOKEN</p>
      </div>
    );
  }

  return (
    <Map
      initialViewState={initialViewState}
      mapboxAccessToken={MAPBOX_TOKEN}
      mapStyle="mapbox://styles/mapbox/dark-v11"
      style={{ width: '100%', height: '100%' }}
      minZoom={2}
      maxZoom={18}
    >
      <NavigationControl position="bottom-left" />

      {/* 足迹连线 */}
      {footprints.length >= 2 && (
        <Source id="footprint-line" type="geojson" data={lineGeoJSON}>
          <Layer {...lineLayer} />
        </Source>
      )}

      {/* 足迹标记 */}
      {footprints.map((fp) => (
        <Marker
          key={fp.id}
          longitude={fp.longitude}
          latitude={fp.latitude}
          anchor="center"
          onClick={(e) => {
            e.originalEvent.stopPropagation();
            onFootprintClick(fp);
          }}
        >
          <div
            className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow-lg cursor-pointer hover:scale-150 transition-transform"
            title={fp.location_city || fp.location_country || ''}
          />
        </Marker>
      ))}
    </Map>
  );
}
