'use client';

import { useRef } from 'react';
import { Move } from 'lucide-react';

interface CoverFocalEditorProps {
  src: string;
  alt?: string;
  positionX: number;
  positionY: number;
  onChange: (x: number, y: number) => void;
  disabled?: boolean;
  className?: string;
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}

/** 拖拽调整封面 object-position 焦点（百分比 0–100） */
export function CoverFocalEditor({
  src,
  alt = '封面',
  positionX,
  positionY,
  onChange,
  disabled,
  className = 'h-48',
}: CoverFocalEditorProps) {
  const draggingRef = useRef(false);
  const lastRef = useRef({ x: 0, y: 0 });
  const posRef = useRef({ x: positionX, y: positionY });
  posRef.current = { x: positionX, y: positionY };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    draggingRef.current = true;
    lastRef.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current || disabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const dx = e.clientX - lastRef.current.x;
    const dy = e.clientY - lastRef.current.y;
    lastRef.current = { x: e.clientX, y: e.clientY };
    // 向右/下拖动画面 → 焦点向左/上移，露出更多对侧内容
    const nextX = clamp(posRef.current.x - (dx / rect.width) * 100);
    const nextY = clamp(posRef.current.y - (dy / rect.height) * 100);
    onChange(nextX, nextY);
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-background-tertiary touch-none ${className} ${
        disabled ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
      }`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        className="pointer-events-none h-full w-full select-none object-cover"
        style={{ objectPosition: `${positionX}% ${positionY}%` }}
      />
      {!disabled && (
        <div className="pointer-events-none absolute bottom-2 left-2 flex items-center gap-1 rounded-md bg-black/55 px-2 py-1 text-[11px] text-white/90">
          <Move size={12} />
          拖拽调整取景
        </div>
      )}
    </div>
  );
}
