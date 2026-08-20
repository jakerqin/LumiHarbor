'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import type { Album } from '@/lib/api/albums';
import { AlbumCard } from '@/components/albums/AlbumCard';
import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion';

const MASONRY_EASE = 'cubic-bezier(0.23, 1, 0.32, 1)';

type BreakpointColumns = {
  default: number;
  [breakpoint: number]: number;
};

// 瀑布流断点配置（相册使用 4→1 列）
const defaultBreakpointColumns: BreakpointColumns = {
  default: 4,
  1280: 3,
  1024: 2,
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

const ITEM_GAP = 16;

/**
 * 计算相册卡片高度（固定 16:10 宽高比 + 底部信息区域）
 */
function calculateAlbumCardHeight(columnWidth: number): number {
  const aspectRatio = 16 / 10; // 封面图宽高比
  const coverHeight = columnWidth / aspectRatio;
  const infoHeight = 120; // 底部信息区域高度（估算）
  const gap = 16; // 封面和信息之间的间距
  return coverHeight + infoHeight + gap;
}

interface GridItem {
  album: Album;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** 入场初值：相对终态 ±12px，禁止飞出视口 */
function getInitialPosition(
  item: GridItem,
  animateFrom: AlbumMasonryProps['animateFrom']
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
  animateFrom: AlbumMasonryProps['animateFrom'],
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

export interface AlbumMasonryProps {
  albums: Album[];
  onAlbumClick?: (id: number) => void;
  onEdit?: (album: Album) => void;
  onDelete?: (album: Album) => void;
  breakpointColumns?: BreakpointColumns;
  animateFrom?: 'bottom' | 'top' | 'left' | 'right' | 'center' | 'random';
  blurToFocus?: boolean;
  duration?: number;
  stagger?: number;
  ease?: string;
}

export function AlbumMasonry({
  albums,
  onAlbumClick,
  onEdit,
  onDelete,
  breakpointColumns = defaultBreakpointColumns,
  animateFrom = 'bottom',
  blurToFocus = false,
  duration = 0.2,
  stagger = 0.04,
  ease = 'cubic-bezier(0.23, 1, 0.32, 1)',
}: AlbumMasonryProps) {
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
    const urls = albums.map((album) => album.coverUrl);
    preloadImages(urls).then(() => setImagesReady(true));
  }, [albums]);

  // 计算网格布局（最短列优先算法）
  const grid = useMemo<GridItem[]>(() => {
    if (!width) return [];

    const colHeights = new Array(columns).fill(0);
    const totalGap = ITEM_GAP * (columns - 1);
    const columnWidth = (width - totalGap) / columns;

    return albums.map((album) => {
      const col = colHeights.indexOf(Math.min(...colHeights));
      const x = (columnWidth + ITEM_GAP) * col;
      const height = calculateAlbumCardHeight(columnWidth);
      const y = colHeights[col];

      colHeights[col] += height + ITEM_GAP;

      return { album, x, y, w: columnWidth, h: height };
    });
  }, [columns, albums, width]);

  // GSAP：减动直接落位；否则只 tween transform/opacity
  useLayoutEffect(() => {
    if (!imagesReady) return;

    grid.forEach((item, index) => {
      const selector = `[data-album-masonry-key="${item.album.id}"]`;
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
        <div key={item.album.id} data-album-masonry-key={item.album.id} className="masonry-item">
          <AlbumCard
            album={item.album}
            onClick={() => onAlbumClick?.(item.album.id)}
            onEdit={onEdit}
            onDelete={onDelete}
            disableEntryAnimation
          />
        </div>
      ))}
    </div>
  );
}
