import { cn } from '@/lib/utils/cn';

interface MasonrySkeletonProps {
  /** 卡片数量 */
  count?: number;
  /** grid = 笔记三列；masonry = 不等高瀑布流感 */
  variant?: 'masonry' | 'grid';
  className?: string;
}

const MASONRY_HEIGHTS = ['h-48', 'h-64', 'h-56', 'h-72', 'h-52', 'h-60', 'h-44', 'h-68', 'h-58'];

/** 对齐瀑布流/卡片栅格的加载骨架，替代蓝圈 spinner */
export function MasonrySkeleton({
  count = 9,
  variant = 'masonry',
  className,
}: MasonrySkeletonProps) {
  if (variant === 'grid') {
    return (
      <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6', className)}>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl bg-background-secondary border border-white/5 overflow-hidden animate-pulse"
          >
            <div className="h-40 bg-background-tertiary/80" />
            <div className="p-4 space-y-2">
              <div className="h-4 w-2/3 rounded bg-background-tertiary" />
              <div className="h-3 w-1/2 rounded bg-background-tertiary/70" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('columns-2 md:columns-3 xl:columns-4 gap-4 space-y-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'break-inside-avoid rounded-xl bg-background-secondary border border-white/5 animate-pulse',
            MASONRY_HEIGHTS[i % MASONRY_HEIGHTS.length]
          )}
        />
      ))}
    </div>
  );
}
