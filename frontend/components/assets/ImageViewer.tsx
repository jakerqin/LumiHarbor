'use client';

import { useState, useRef, useCallback, useEffect, type WheelEvent, type MouseEvent, type TouchEvent } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Move } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface ImageViewerProps {
  src: string;
  alt: string;
  className?: string;
}

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const ZOOM_STEP = 0.25;

export function ImageViewer({ src, alt, className }: ImageViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isLoaded, setIsLoaded] = useState(false);

  // 重置缩放和位置
  const handleReset = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  // 放大
  const handleZoomIn = useCallback(() => {
    setScale((prev) => Math.min(prev + ZOOM_STEP, MAX_SCALE));
  }, []);

  // 缩小
  const handleZoomOut = useCallback(() => {
    setScale((prev) => {
      const newScale = Math.max(prev - ZOOM_STEP, MIN_SCALE);
      // 如果缩小到最小，重置位置
      if (newScale === MIN_SCALE) {
        setPosition({ x: 0, y: 0 });
      }
      return newScale;
    });
  }, []);

  // 使用 useEffect 添加非 passive 的 wheel 事件监听器
  // 只有按住 Ctrl/Cmd 键时才进行缩放，否则允许正常页面滚动
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: globalThis.WheelEvent) => {
      // 只有按住 Ctrl 或 Cmd 键时才进行缩放
      if (!e.ctrlKey && !e.metaKey) {
        // 普通滚轮，允许页面滚动
        return;
      }
      
      // 按住修饰键时，阻止默认行为并进行缩放
      e.preventDefault();
      e.stopPropagation();
      
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      setScale((prev) => {
        const newScale = Math.max(MIN_SCALE, Math.min(prev + delta, MAX_SCALE));
        // 如果缩小到最小，重置位置
        if (newScale === MIN_SCALE) {
          setPosition({ x: 0, y: 0 });
        }
        return newScale;
      });
    };

    // 添加非 passive 的事件监听器，这样 preventDefault 才能生效
    container.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // 鼠标按下开始拖拽
  const handleMouseDown = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (scale <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  }, [scale, position]);

  // 鼠标移动拖拽
  const handleMouseMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (!isDragging || scale <= 1) return;
    e.preventDefault();
    
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    
    // 限制拖拽范围
    const container = containerRef.current;
    const image = imageRef.current;
    if (container && image) {
      const containerRect = container.getBoundingClientRect();
      const scaledWidth = image.naturalWidth * scale;
      const scaledHeight = image.naturalHeight * scale;
      
      // 计算最大偏移量
      const maxX = Math.max(0, (scaledWidth - containerRect.width) / 2);
      const maxY = Math.max(0, (scaledHeight - containerRect.height) / 2);
      
      setPosition({
        x: Math.max(-maxX, Math.min(maxX, newX)),
        y: Math.max(-maxY, Math.min(maxY, newY)),
      });
    } else {
      setPosition({ x: newX, y: newY });
    }
  }, [isDragging, scale, dragStart]);

  // 鼠标松开结束拖拽
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // 触摸开始
  const handleTouchStart = useCallback((e: TouchEvent<HTMLDivElement>) => {
    if (scale <= 1 || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({
      x: touch.clientX - position.x,
      y: touch.clientY - position.y,
    });
  }, [scale, position]);

  // 触摸移动
  const handleTouchMove = useCallback((e: TouchEvent<HTMLDivElement>) => {
    if (!isDragging || scale <= 1 || e.touches.length !== 1) return;
    const touch = e.touches[0];
    
    const newX = touch.clientX - dragStart.x;
    const newY = touch.clientY - dragStart.y;
    
    setPosition({ x: newX, y: newY });
  }, [isDragging, scale, dragStart]);

  // 触摸结束
  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // 双击放大/重置
  const handleDoubleClick = useCallback((e: MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (scale > 1) {
      handleReset();
    } else {
      setScale(2);
    }
  }, [scale, handleReset]);

  // 监听全局鼠标松开事件
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };
    
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('touchend', handleGlobalMouseUp);
    
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('touchend', handleGlobalMouseUp);
    };
  }, []);

  // 图片加载完成
  const handleImageLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);

  // 图片 src 变化时重置状态
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setIsLoaded(false);
  }, [src]);

  const isZoomed = scale > 1;

  return (
    <div className={cn('relative group', className)}>
      {/* 图片容器 */}
      <div
        ref={containerRef}
        className={cn(
          'relative overflow-hidden bg-black',
          isZoomed ? 'cursor-grab' : 'cursor-zoom-in',
          isDragging && 'cursor-grabbing'
        )}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onDoubleClick={handleDoubleClick}
      >
        <img
          ref={imageRef}
          src={src}
          alt={alt}
          className={cn(
            'w-full max-h-[72vh] object-contain transition-transform duration-100',
            !isLoaded && 'opacity-0'
          )}
          style={{
            transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
            transformOrigin: 'center center',
          }}
          onLoad={handleImageLoad}
          draggable={false}
        />
        
        {/* 加载占位 */}
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* 控制按钮 */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-2 rounded-xl bg-black/50 backdrop-blur-sm border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={handleZoomOut}
          disabled={scale <= MIN_SCALE}
          className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="缩小"
        >
          <ZoomOut size={18} className="text-white" />
        </button>
        
        <span className="text-sm text-white/80 min-w-[3rem] text-center">
          {Math.round(scale * 100)}%
        </span>
        
        <button
          type="button"
          onClick={handleZoomIn}
          disabled={scale >= MAX_SCALE}
          className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="放大"
        >
          <ZoomIn size={18} className="text-white" />
        </button>
        
        <div className="w-px h-5 bg-white/20 mx-1" />
        
        <button
          type="button"
          onClick={handleReset}
          disabled={scale === 1 && position.x === 0 && position.y === 0}
          className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="重置"
        >
          <RotateCcw size={18} className="text-white" />
        </button>
      </div>

      {/* 缩放提示 */}
      {isZoomed ? (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/50 backdrop-blur-sm border border-white/10 text-xs text-white/70">
          <Move size={14} />
          <span>拖拽移动查看</span>
        </div>
      ) : (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/50 backdrop-blur-sm border border-white/10 text-xs text-white/70 opacity-0 group-hover:opacity-100 transition-opacity">
          <ZoomIn size={14} />
          <span>按住 ⌘/Ctrl + 滚轮缩放</span>
        </div>
      )}
    </div>
  );
}