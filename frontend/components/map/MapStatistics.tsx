'use client';

import { Globe, Building2, Route, Calendar } from 'lucide-react';
import { MapStatistics as MapStatisticsType } from '@/lib/api/types';

interface MapStatisticsProps {
  statistics: MapStatisticsType | undefined;
  isLoading: boolean;
}

const items = [
  { icon: Globe, label: '国家', key: 'country' as const },
  { icon: Building2, label: '城市', key: 'city' as const },
  { icon: Route, label: '里程', key: 'distance' as const },
  { icon: Calendar, label: '天数', key: 'days' as const },
];

function formatValue(
  key: (typeof items)[number]['key'],
  statistics: MapStatisticsType | undefined
) {
  if (!statistics) {
    if (key === 'distance') return '0 km';
    return 0;
  }
  if (key === 'country') return statistics.country_count;
  if (key === 'city') return statistics.city_count;
  if (key === 'days') return statistics.total_days;
  return `${Math.round(statistics.total_distance_km).toLocaleString()} km`;
}

/** 浅色底图上的统计条：不透明暖色底，保证对比度 */
export function MapStatistics({ statistics, isLoading }: MapStatisticsProps) {
  return (
    <div className="flex flex-wrap items-stretch rounded-2xl border border-[#e4d4bc] bg-[#fffaf3]/95 px-1.5 py-1.5 shadow-lg shadow-stone-900/12 backdrop-blur-md">
      {items.map((item, index) => (
        <div key={item.label} className="flex items-center">
          {index > 0 && (
            <div className="mx-0.5 hidden h-8 w-px bg-[#e4d4bc] sm:block" aria-hidden />
          )}
          <div className="flex items-center gap-2.5 px-3 py-1.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#f0e4d0]">
              <item.icon className="h-4 w-4 text-[#a67c4a]" strokeWidth={2} />
            </div>
            <div className="min-w-0 leading-tight">
              {isLoading ? (
                <div className="h-4 w-10 animate-pulse rounded bg-[#e4d4bc]/80" />
              ) : (
                <p className="font-heading text-sm font-semibold tabular-nums text-[#3d3428]">
                  {formatValue(item.key, statistics)}
                </p>
              )}
              <p className="text-xs text-[#8a7a66]">{item.label}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
