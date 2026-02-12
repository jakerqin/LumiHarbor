'use client';

import { Globe, Building2, Route, Calendar } from 'lucide-react';
import { MapStatistics as MapStatisticsType } from '@/lib/api/types';

interface MapStatisticsProps {
  statistics: MapStatisticsType | undefined;
  isLoading: boolean;
}

export function MapStatistics({ statistics, isLoading }: MapStatisticsProps) {
  const items = [
    {
      icon: Globe,
      label: '国家',
      value: statistics?.country_count ?? 0,
    },
    {
      icon: Building2,
      label: '城市',
      value: statistics?.city_count ?? 0,
    },
    {
      icon: Route,
      label: '里程',
      value: statistics ? `${Math.round(statistics.total_distance_km).toLocaleString()} km` : '0 km',
    },
    {
      icon: Calendar,
      label: '天数',
      value: statistics?.total_days ?? 0,
    },
  ];

  return (
    <div className="flex items-center gap-5">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <item.icon className="w-4 h-4 text-blue-400" />
          <div className="text-sm">
            {isLoading ? (
              <div className="h-4 w-8 bg-white/10 rounded animate-pulse" />
            ) : (
              <span className="font-semibold text-foreground">{item.value}</span>
            )}
            <span className="text-foreground-secondary ml-1">{item.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
