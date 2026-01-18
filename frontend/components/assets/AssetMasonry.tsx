'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
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

/**
 * 响应式媒体查询 Hook
 */
const useMedia = (queries: string[], values: number[], defaultValue: number): number => {
  const [value, setValue] = useState<number>(() => {
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
  return '/placeholder-image.jpg';
}

export interface AssetMasonryProps {
  assets: Asset[];
  onAssetClick?: (id: number) => void;
  onAssetSelect?: (asset: Asset) => void;
  breakpointColumns?: BreakpointColumns;
  animateFrom?: 'bottom' | 'top' | 'left' | 'right' | 'center' | 'random';
  blurToFocus?: boolean;
  duration?: number;
  stagger?: number;
  ease?: string;
}

export function AssetMasonry({
  assets,
  onAssetClick,
  onAssetSelect,
  breakpointColumns = defaultBreakpointColumns,
  animateFrom = 'bottom',
  blurToFocus = true,
  duration = 0.8,
  stagger = 0.05,
  ease = 'power3.out',
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

  // GSAP 动画处理
  useLayoutEffect(() => {
    if (!imagesReady) return;

    // 获取初始位置（根据 animateFrom 参数）
    const getInitialPosition = (item: GridItem) => {
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (!containerRect) return { x: item.x, y: item.y };

      let direction = animateFrom;

      if (animateFrom === 'random') {
        const directions = ['top', 'bottom', 'left', 'right'];
        direction = directions[Math.floor(Math.random() * directions.length)] as typeof animateFrom;
      }

      switch (direction) {
        case 'top':
          return { x: item.x, y: -200 };
        case 'bottom':
          return { x: item.x, y: window.innerHeight + 200 };
        case 'left':
          return { x: -200, y: item.y };
        case 'right':
          return { x: window.innerWidth + 200, y: item.y };
        case 'center':
          return {
            x: containerRect.width / 2 - item.w / 2,
            y: containerRect.height / 2 - item.h / 2,
          };
        default:
          return { x: item.x, y: item.y };
      }
    };

    grid.forEach((item, index) => {
      const selector = `[data-masonry-key="${item.asset.id}"]`;
      const animationProps = {
        x: item.x,
        y: item.y,
        width: item.w,
        height: item.h,
      };

      if (!hasMounted.current) {
        // 首次加载：入场动画
        const initialPos = getInitialPosition(item);
        const initialState = {
          opacity: 0,
          x: initialPos.x,
          y: initialPos.y,
          width: item.w,
          height: item.h,
          ...(blurToFocus && { filter: 'blur(10px)' }),
        };

        gsap.fromTo(
          selector,
          initialState,
          {
            opacity: 1,
            ...animationProps,
            ...(blurToFocus && { filter: 'blur(0px)' }),
            duration,
            ease,
            delay: index * stagger,
          }
        );
      } else {
        // 响应式调整：平滑过渡
        gsap.to(selector, {
          ...animationProps,
          duration: 0.6,
          ease: 'power3.out',
          overwrite: 'auto',
        });
      }
    });

    hasMounted.current = true;
  }, [grid, imagesReady, stagger, animateFrom, blurToFocus, duration, ease, containerRef]);

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
              if (onAssetSelect) {
                onAssetSelect(item.asset);
                return;
              }
              onAssetClick?.(item.asset.id);
            }}
            disableEntryAnimation
          />
        </div>
      ))}
    </div>
  );
}
