'use client';

import { useState, useRef } from 'react';
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
  const [isHovered, setIsHovered] = useState(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout>(undefined);

  const handleMouseEnter = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    // 延迟隐藏，给用户时间移动到按钮
    hideTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 200);
  };

  return (
    <div
      className="relative pt-8"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 添加封面按钮（hover 显示） */}
      {showAddCover && isHovered && onAddCover && (
        <button
          onClick={onAddCover}
          className="absolute top-0 left-0 flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
        >
          <ImagePlus className="w-4 h-4" />
          添加封面
        </button>
      )}

      {/* 标题输入框 */}
      <input
        type="text"
        placeholder="请输入标题"
        className="w-full text-4xl font-bold text-gray-900 placeholder-gray-300 border-none outline-none bg-transparent"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus
      />
    </div>
  );
}
