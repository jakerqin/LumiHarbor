'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { MapPin } from 'lucide-react';
import type { LocationData } from '@/components/common/MapPicker';

const MapPicker = dynamic(
  () => import('@/components/common/MapPicker').then((mod) => mod.MapPicker),
  { ssr: false }
);

interface ShootLocationFieldProps {
  value: LocationData | null;
  onChange: (location: LocationData | null) => void;
  disabled?: boolean;
}

/** 拍摄地点：复用 MapPicker（与文件夹导入 / 素材上传弹窗同一套） */
export function ShootLocationField({ value, onChange, disabled }: ShootLocationFieldProps) {
  const [mapOpen, setMapOpen] = useState(false);
  const displayLocation = value
    ? value.formatted || value.poi || `${value.longitude.toFixed(6)}, ${value.latitude.toFixed(6)}`
    : '';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className="flex items-center gap-1.5 text-sm font-medium text-foreground-secondary">
          <MapPin size={14} />
          拍摄地点
        </label>
        {!disabled && (
          <button
            type="button"
            onClick={() => setMapOpen(true)}
            className="rounded-lg bg-primary/10 px-3 py-1.5 text-sm text-primary transition-colors hover:bg-primary/20"
          >
            {value ? '更换' : '在地图上选择'}
          </button>
        )}
      </div>

      {value ? (
        <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-start gap-2">
            <MapPin size={16} className="mt-0.5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-foreground">{displayLocation}</p>
              <p className="mt-0.5 text-xs text-foreground-tertiary tabular-nums">
                {value.longitude.toFixed(6)}, {value.latitude.toFixed(6)}
              </p>
            </div>
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="text-xs text-foreground-secondary transition-colors hover:text-foreground"
            >
              清除
            </button>
          )}
        </div>
      ) : (
        <p className="text-sm text-foreground-tertiary">未选择地点（可选；无 GPS 的素材会用该位置）</p>
      )}

      {disabled && value && (
        <p className="text-xs text-foreground-tertiary">上传中不可更改地点</p>
      )}

      <MapPicker
        open={mapOpen}
        defaultCenter={value ? [value.latitude, value.longitude] : undefined}
        onConfirm={(location) => {
          onChange(location);
          setMapOpen(false);
        }}
        onClose={() => setMapOpen(false)}
      />
    </div>
  );
}
