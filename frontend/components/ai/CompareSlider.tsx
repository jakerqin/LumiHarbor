'use client';

import { useState } from 'react';

interface CompareSliderProps {
  before: string;
  after: string;
}

/** 修图前后对比：左边修改后、右边修改前，拖动分界线 */
export function CompareSlider({ before, after }: CompareSliderProps) {
  const [percent, setPercent] = useState(50);

  return (
    <div className="relative w-full overflow-hidden rounded-xl bg-black/30 select-none">
      <img src={before} alt="修改前" className="block w-full max-h-[56vh] object-contain" draggable={false} />
      <img
        src={after}
        alt="修改后"
        className="absolute inset-0 w-full h-full object-contain"
        style={{ clipPath: `inset(0 ${100 - percent}% 0 0)` }}
        draggable={false}
      />
      <div className="absolute inset-y-0 w-0.5 bg-white/80 pointer-events-none" style={{ left: `${percent}%` }} />
      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/50 text-xs text-white">修改后</span>
      <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/50 text-xs text-white">修改前</span>
      <input
        type="range"
        min={0}
        max={100}
        value={percent}
        onChange={(e) => setPercent(Number(e.target.value))}
        aria-label="拖动对比修改前后"
        className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize"
      />
    </div>
  );
}
