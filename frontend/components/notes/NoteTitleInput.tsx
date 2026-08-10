'use client';

import { ImagePlus } from 'lucide-react';

interface NoteTitleInputProps {
  value: string;
  onChange: (value: string) => void;
  showAddCover?: boolean;
  onAddCover?: () => void;
}

export function NoteTitleInput({
  value,
  onChange,
  showAddCover = false,
  onAddCover,
}: NoteTitleInputProps) {
  return (
    <div className="pt-2">
      {showAddCover && onAddCover && (
        <button
          type="button"
          onClick={onAddCover}
          className="mb-4 inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/70"
        >
          <ImagePlus className="h-4 w-4" />
          添加封面
        </button>
      )}

      <input
        type="text"
        placeholder="请输入标题"
        className="w-full border-none bg-transparent font-heading text-4xl sm:text-5xl font-semibold tracking-tight text-white outline-none placeholder:text-white/35"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus
      />
    </div>
  );
}
