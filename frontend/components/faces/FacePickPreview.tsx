'use client';

import { useRef, useState } from 'react';
import type { FaceCandidate } from '@/lib/api/subjects';
import { FaceZoom } from './FaceZoom';
import { cn } from '@/lib/utils/cn';

type Handle = 'move' | 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

const HANDLES: Handle[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
const MIN_SIDE = 0.04;

interface FacePickPreviewProps {
  src: string;
  boxes: FaceCandidate[];
  pickedIndex: number | null;
  onPick: (index: number) => void;
  onAdjust: (index: number, next: FaceCandidate) => void;
}

export function FacePickPreview({ src, boxes, pickedIndex, onPick, onAdjust }: FacePickPreviewProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ handle: Handle; index: number; x: number; y: number; box: FaceCandidate } | null>(null);
  const [dragging, setDragging] = useState(false);

  const beginDrag = (event: React.PointerEvent, index: number, handle: Handle) => {
    event.preventDefault();
    event.stopPropagation();
    dragRef.current = { handle, index, x: event.clientX, y: event.clientY, box: boxes[index] };
    setDragging(true);
    stageRef.current?.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const drag = dragRef.current;
    const stage = stageRef.current;
    if (!drag || !stage) return;
    const rect = stage.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const dx = (event.clientX - drag.x) / rect.width;
    const dy = (event.clientY - drag.y) / rect.height;
    onAdjust(drag.index, resizeBox(drag.box, drag.handle, dx, dy));
  };

  const endDrag = (event: React.PointerEvent) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setDragging(false);
    if (stageRef.current?.hasPointerCapture(event.pointerId)) {
      stageRef.current.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <div className="space-y-3">
      <div
        ref={stageRef}
        className={`relative w-full overflow-hidden rounded-xl bg-black ${dragging ? 'touch-none' : ''}`}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <img src={src} alt="" className="w-full h-auto block select-none" draggable={false} />
        {boxes.map((item, index) => {
          const selected = index === pickedIndex;
          return (
            <div
              key={index}
              role="button"
              tabIndex={0}
              aria-label={selected ? '已选脸，可拖动或拉角调整' : '选择这张脸'}
              onPointerDown={(event) => {
                if (selected) beginDrag(event, index, 'move');
                else onPick(index);
              }}
              className={`absolute border-2 ${selected ? 'border-amber-300 cursor-move' : 'border-white/80 cursor-pointer'}`}
              style={{
                left: `${item.bbox_x * 100}%`,
                top: `${item.bbox_y * 100}%`,
                width: `${item.bbox_w * 100}%`,
                height: `${item.bbox_h * 100}%`,
              }}
            >
              {selected &&
                HANDLES.map((handle) => (
                  <span
                    key={handle}
                    onPointerDown={(event) => beginDrag(event, index, handle)}
                    className={`absolute w-2.5 h-2.5 bg-amber-300 rounded-sm ${handleClass(handle)}`}
                  />
                ))}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap items-end gap-2">
        {boxes.map((item, index) => (
          <button
            key={index}
            type="button"
            onClick={() => onPick(index)}
            className={cn(
              'h-16 rounded-lg overflow-hidden border-2 p-0',
              index === pickedIndex ? 'border-amber-300' : 'border-white/15'
            )}
            aria-label={`预览第 ${index + 1} 张脸`}
          >
            <FaceZoom src={src} box={item} className="h-full" />
          </button>
        ))}
      </div>
    </div>
  );
}

function resizeBox(box: FaceCandidate, handle: Handle, dx: number, dy: number): FaceCandidate {
  let { bbox_x: x, bbox_y: y, bbox_w: w, bbox_h: h } = box;
  if (handle === 'move') {
    x += dx;
    y += dy;
  } else {
    if (handle.includes('w')) {
      x += dx;
      w -= dx;
    }
    if (handle.includes('e')) w += dx;
    if (handle.includes('n')) {
      y += dy;
      h -= dy;
    }
    if (handle.includes('s')) h += dy;
  }
  if (w < MIN_SIDE) {
    if (handle.includes('w')) x -= MIN_SIDE - w;
    w = MIN_SIDE;
  }
  if (h < MIN_SIDE) {
    if (handle.includes('n')) y -= MIN_SIDE - h;
    h = MIN_SIDE;
  }
  x = Math.min(Math.max(0, x), 1 - w);
  y = Math.min(Math.max(0, y), 1 - h);
  w = Math.min(w, 1 - x);
  h = Math.min(h, 1 - y);
  return { ...box, bbox_x: x, bbox_y: y, bbox_w: w, bbox_h: h };
}

function handleClass(handle: Handle): string {
  const map: Record<Exclude<Handle, 'move'>, string> = {
    n: 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize',
    s: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 cursor-ns-resize',
    e: 'right-0 top-1/2 translate-x-1/2 -translate-y-1/2 cursor-ew-resize',
    w: 'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize',
    ne: 'top-0 right-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize',
    nw: 'top-0 left-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize',
    se: 'bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize',
    sw: 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize',
  };
  return map[handle];
}
