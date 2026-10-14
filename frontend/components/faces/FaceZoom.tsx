'use client';

import { cn } from '@/lib/utils/cn';
import type { FaceCandidate } from '@/lib/api/subjects';

interface FaceZoomProps {
  src: string;
  box: Pick<FaceCandidate, 'bbox_x' | 'bbox_y' | 'bbox_w' | 'bbox_h'>;
  className?: string;
}

/** 按选框比例裁出整块内容，不额外放大、不裁掉框内像素。 */
export function FaceZoom({ src, box, className }: FaceZoomProps) {
  const w = Math.max(box.bbox_w, 0.01);
  const h = Math.max(box.bbox_h, 0.01);
  return (
    <div
      className={cn('relative overflow-hidden bg-black', className)}
      style={{ aspectRatio: `${w} / ${h}` }}
    >
      <img
        src={src}
        alt=""
        draggable={false}
        className="absolute max-w-none select-none"
        style={{
          width: `${(1 / w) * 100}%`,
          height: `${(1 / h) * 100}%`,
          left: `${(-box.bbox_x / w) * 100}%`,
          top: `${(-box.bbox_y / h) * 100}%`,
        }}
      />
    </div>
  );
}
