'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Asset } from '@/lib/api/types';
import { AssetCard } from '@/components/assets/AssetCard';
import './masonry.css';

type BreakpointColumns = {
  default: number;
  [breakpoint: number]: number;
};

// 瀑布流断点配置（与现有页面保持一致）
const defaultBreakpointColumns: BreakpointColumns = {
  default: 5,
  1536: 4,
  1280: 3,
  1024: 3,
  768: 2,
  640: 1,
};

function getColumnCount(width: number, breakpoints: BreakpointColumns): number {
  const numericBreakpoints = Object.keys(breakpoints)
    .filter((key) => key !== 'default')
    .map((key) => Number(key))
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);

  for (const breakpoint of numericBreakpoints) {
    if (width <= breakpoint) {
      return Math.max(1, breakpoints[breakpoint] ?? breakpoints.default);
    }
  }
  return Math.max(1, breakpoints.default);
}

function estimateRelativeHeight(asset: Asset): number {
  const ratio = typeof asset.aspect_ratio === 'number' && asset.aspect_ratio > 0 ? asset.aspect_ratio : 1;
  return 1 / ratio;
}

function distributeShortestColumnFirst(assets: Asset[], columnCount: number): Asset[][] {
  const safeColumnCount = Math.max(1, Math.min(columnCount, assets.length || 1));
  const columns: Asset[][] = Array.from({ length: safeColumnCount }, () => []);
  const columnHeights = Array.from({ length: safeColumnCount }, () => 0);

  for (const asset of assets) {
    let minIndex = 0;
    for (let i = 1; i < columnHeights.length; i += 1) {
      if (columnHeights[i] < columnHeights[minIndex]) {
        minIndex = i;
      }
    }
    columns[minIndex].push(asset);
    columnHeights[minIndex] += estimateRelativeHeight(asset);
  }

  return columns;
}

export interface AssetMasonryProps {
  assets: Asset[];
  onAssetClick?: (id: number) => void;
  breakpointColumns?: BreakpointColumns;
}

export function AssetMasonry({
  assets,
  onAssetClick,
  breakpointColumns = defaultBreakpointColumns,
}: AssetMasonryProps) {
  const [columnCount, setColumnCount] = useState(breakpointColumns.default);

  useEffect(() => {
    const handleResize = () => {
      setColumnCount(getColumnCount(window.innerWidth, breakpointColumns));
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [breakpointColumns]);

  const columns = useMemo(
    () => distributeShortestColumnFirst(assets, columnCount),
    [assets, columnCount]
  );

  return (
    <div className="masonry-grid">
      {columns.map((columnAssets, columnIndex) => (
        <div key={columnIndex} className="masonry-grid-column">
          {columnAssets.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              onClick={() => onAssetClick?.(asset.id)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
