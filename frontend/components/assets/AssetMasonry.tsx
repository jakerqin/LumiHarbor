'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import type { Asset } from '@/lib/api/types';
import { AssetCard } from '@/components/assets/AssetCard';
import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion';
import './masonry.css';

const MASONRY_EASE = 'cubic-bezier(0.23, 1, 0.32, 1)';

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

/**
 * 响应式媒体查询 Hook
 */
const useMedia = (queries: string[], values: number[], defaultValue: number): number => {
  const [value, setValue] = useState<number>(() => {
    // 服务端渲染时直接返回默认值
    if (typeof window === 'undefined') return defaultValue;
    const index = queries.findIndex((q) => matchMedia(q).matches);
    return values[index] ?? defaultValue;
  });

  useEffect(() => {
    const get = () => {
      const index = queries.findIndex((q) => matchMedia(q).matches);
      return values[index] ?? defaultValue;
    };

    const handler = () => setValue(get);
    queries.forEach((q) => matchMedia(q).addEventListener('change', handler));
    return () => queries.forEach((q) => matchMedia(q).removeEventListener('change', handler));
  }, [queries, values, defaultValue]);

  return value;
};

/**
 * 容器尺寸测量 Hook
 */
const useMeasure = <T extends HTMLElement>() => {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  return [ref, size] as const;
};

/**
 * 预加载图片
 */
const preloadImages = async (urls: string[]): Promise<void> => {
  await Promise.all(
    urls.map(
      (src) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.src = src;
          img.onload = img.onerror = () => resolve();
        })
    )
  );
};

/**
 * 估算素材相对高度（基于宽高比）
 */
function estimateRelativeHeight(asset: Asset, columnWidth: number): number {
  const ratio = typeof asset.aspect_ratio === 'number' && asset.aspect_ratio > 0 ? asset.aspect_ratio : 1;
  return columnWidth / ratio;
}

// 瀑布流列间距（单位：px）
const GAP = 12;

interface GridItem {
  asset: Asset;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** 入场初值：相对终态 ±12px，禁止飞出视口 */
function getInitialPosition(
  item: GridItem,
  animateFrom: AssetMasonryProps['animateFrom']
): { x: number; y: number } {
  let direction = animateFrom;
  if (animateFrom === 'random') {
    const directions = ['top', 'bottom', 'left', 'right'] as const;
    direction = directions[Math.floor(Math.random() * directions.length)];
  }
  switch (direction) {
    case 'top':
      return { x: item.x, y: item.y - 12 };
    case 'bottom':
      return { x: item.x, y: item.y + 12 };
    case 'left':
      return { x: item.x - 12, y: item.y };
    case 'right':
      return { x: item.x + 12, y: item.y };
    default:
      return { x: item.x, y: item.y };
  }
}

/** 尺寸立即 set；入场/重排只 tween transform + opacity */
function tweenMasonryItem(
  selector: string,
  item: GridItem,
  animateFrom: AssetMasonryProps['animateFrom'],
  opts: { duration: number; ease: string; delay: number; isEntry: boolean }
) {
  gsap.set(selector, { width: item.w, height: item.h, filter: 'none' });
  if (!opts.isEntry) {
    gsap.to(selector, {
      x: item.x,
      y: item.y,
      duration: 0.2,
      ease: MASONRY_EASE,
      overwrite: 'auto',
    });
    return;
  }
  const initialPos = getInitialPosition(item, animateFrom);
  gsap.fromTo(
    selector,
    { opacity: 0, x: initialPos.x, y: initialPos.y },
    {
      opacity: 1,
      x: item.x,
      y: item.y,
      duration: opts.duration,
      ease: opts.ease,
      delay: opts.delay,
      overwrite: 'auto',
    }
  );
}

/**
 * 获取缩略图 URL
 */
function getThumbnailUrl(asset: Asset): string {
  if (asset.thumbnail_url) {
    return asset.thumbnail_url;
  }
  if (asset.thumbnail_path) {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const normalizedBaseUrl = baseUrl.replace(/\/$/, '');
    const normalizedPath = asset.thumbnail_path.startsWith('/')
      ? asset.thumbnail_path
      : `/${asset.thumbnail_path}`;
    return `${normalizedBaseUrl}${normalizedPath}`;
  }
  return '/icon.svg';
}

export interface AssetMasonryProps {
  assets: Asset[];
  onAssetClick?: (id: number) => void;
  onAssetSelect?: (asset: Asset) => void;
  selectionMode?: boolean;
  selectedAssetIds?: Set<number>;
  onSelectionToggle?: (asset: Asset) => void;
  breakpointColumns?: BreakpointColumns;
  animateFrom?: 'bottom' | 'top' | 'left' | 'right' | 'center' | 'random';
  blurToFocus?: boolean;
  duration?: number;
  stagger?: number;
  ease?: string;
  disableHoverEffects?: boolean;
}

export function AssetMasonry({
  assets,
  onAssetClick,
  onAssetSelect,
  selectionMode = false,
  selectedAssetIds,
  onSelectionToggle,
  breakpointColumns = defaultBreakpointColumns,
  animateFrom = 'bottom',
  blurToFocus = false,
  duration = 0.2,
  stagger = 0.04,
  ease = 'cubic-bezier(0.23, 1, 0.32, 1)',
  disableHoverEffects = false,
}: AssetMasonryProps) {
  // 响应式列数（基于 breakpointColumns 动态生成媒体查询）
  const breakpoints = useMemo(() => {
    const numericBreakpoints = Object.keys(breakpointColumns)
      .filter((key) => key !== 'default')
      .map((key) => Number(key))
      .filter((value) => Number.isFinite(value))
      .sort((a, b) => b - a); // 从大到小排序

    const queries = numericBreakpoints.map((bp) => `(min-width: ${bp}px)`);
    const values = numericBreakpoints.map((bp) => breakpointColumns[bp]);

    return { queries, values, defaultValue: breakpointColumns.default };
  }, [breakpointColumns]);

  const columns = useMedia(breakpoints.queries, breakpoints.values, breakpoints.defaultValue);

  const [containerRef, { width }] = useMeasure<HTMLDivElement>();
  const [imagesReady, setImagesReady] = useState(false);
  const hasMounted = useRef(false);
  const reducedMotion = usePrefersReducedMotion();

  // 预加载图片
  useEffect(() => {
    const urls = assets.map((asset) => getThumbnailUrl(asset));
    preloadImages(urls).then(() => setImagesReady(true));
  }, [assets]);

  // 计算网格布局（最短列优先算法，考虑列间距）
  const grid = useMemo<GridItem[]>(() => {
    if (!width) return [];

    const colHeights = new Array(columns).fill(0);
    // 计算列宽：总宽度减去间距后平均分配
    const totalGap = (columns - 1) * GAP;
    const columnWidth = (width - totalGap) / columns;

    return assets.map((asset) => {
      const col = colHeights.indexOf(Math.min(...colHeights));
      // x 坐标 = 列宽 * 列索引 + 间距 * 列索引
      const x = columnWidth * col + GAP * col;
      const height = estimateRelativeHeight(asset, columnWidth);
      const y = colHeights[col];

      // 累加高度时包含底部间距
      colHeights[col] += height + GAP;

      return { asset, x, y, w: columnWidth, h: height };
    });
  }, [columns, assets, width]);

  // GSAP：减动直接落位；否则只 tween transform/opacity
  useLayoutEffect(() => {
    if (!imagesReady) return;

    grid.forEach((item, index) => {
      const selector = `[data-masonry-key="${item.asset.id}"]`;
      if (reducedMotion) {
        gsap.set(selector, {
          x: item.x,
          y: item.y,
          width: item.w,
          height: item.h,
          opacity: 1,
          filter: 'none',
        });
        return;
      }
      tweenMasonryItem(selector, item, animateFrom, {
        duration,
        ease,
        delay: index * stagger,
        isEntry: !hasMounted.current,
      });
    });

    hasMounted.current = true;
  }, [grid, imagesReady, stagger, animateFrom, blurToFocus, duration, ease, reducedMotion]);

  // 计算容器高度
  const containerHeight = useMemo(() => {
    if (grid.length === 0) return 0;
    return Math.max(...grid.map((item) => item.y + item.h));
  }, [grid]);

  return (
    <div ref={containerRef} className="masonry-container" style={{ height: containerHeight }}>
      {grid.map((item) => (
        <div
          key={item.asset.id}
          data-masonry-key={item.asset.id}
          className="masonry-item"
        >
          <AssetCard
            asset={item.asset}
            onClick={() => {
              if (selectionMode && onSelectionToggle) {
                onSelectionToggle(item.asset);
                return;
              }
              if (onAssetSelect) {
                onAssetSelect(item.asset);
                return;
              }
              onAssetClick?.(item.asset.id);
            }}
            showSelectionIndicator={selectionMode}
            isSelected={selectionMode ? selectedAssetIds?.has(item.asset.id) ?? false : false}
            disableHoverEffects={disableHoverEffects}
            disableEntryAnimation
          />
        </div>
      ))}
    </div>
  );
}
