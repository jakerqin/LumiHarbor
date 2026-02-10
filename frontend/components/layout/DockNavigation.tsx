'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { gsap } from 'gsap';
import {
  Home,
  Image,
  FileText,
  Map,
  FolderOpen,
  Search,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { LucideIcon } from 'lucide-react';

interface DockItem {
  icon?: LucideIcon;
  label: string;
  href?: string;
  action?: string;
  shortcut: string;
  type?: 'divider';
}

const dockItems: DockItem[] = [
  { icon: Home, label: '首页', href: '/', shortcut: 'H' },
  { icon: Image, label: '素材', href: '/assets', shortcut: 'A' },
  { icon: FolderOpen, label: '相册', href: '/albums', shortcut: 'L' },
  { icon: FileText, label: '笔记', href: '/notes', shortcut: 'N' },
  { icon: Map, label: '地图', href: '/map', shortcut: 'M' },
  { type: 'divider' } as DockItem,
  { icon: Search, label: '搜索', action: 'search', shortcut: 'K' },
  { icon: Settings, label: '设置', href: '/settings', shortcut: ',' },
];

export function DockNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const tooltipRefs = useRef<(HTMLDivElement | null)[]>([]);
  const indicatorRef = useRef<HTMLDivElement>(null); // 活动指示器（固定在屏幕右侧边）

  // Dock 滑入/滑出动画
  useEffect(() => {
    if (!navRef.current) return;

    gsap.to(navRef.current, {
      x: isVisible ? '0%' : '100%',
      duration: 0.4,
      ease: 'power2.out',
    });
  }, [isVisible]);

  // 鼠标移动检测（基于活动指示器位置 + 滞后区机制）
  useEffect(() => {
    const TRIGGER_EXPAND = 100; // 触发区域垂直扩展范围（指示器上下各扩展 100px）
    const SHOW_DISTANCE = 40; // 显示阈值（距离右侧边）
    const HIDE_DISTANCE = 100; // 隐藏阈值（距离右侧边）

    const handleMouseMove = (e: MouseEvent) => {
      const distanceFromRight = window.innerWidth - e.clientX;

      setIsVisible((prevVisible) => {
        // 隐藏条件：距离右侧边 > 100px（优先判断，避免误触发）
        if (distanceFromRight > HIDE_DISTANCE) {
          return false;
        }

        // 显示条件：鼠标在活动指示器附近 + 距离右侧边 <= 50px
        if (indicatorRef.current && distanceFromRight <= SHOW_DISTANCE) {
          const indicatorRect = indicatorRef.current.getBoundingClientRect();
          const indicatorCenterY = indicatorRect.top + indicatorRect.height / 2;
          const triggerTop = indicatorCenterY - TRIGGER_EXPAND;
          const triggerBottom = indicatorCenterY + TRIGGER_EXPAND;

          const isInTriggerZone =
            e.clientY >= triggerTop && e.clientY <= triggerBottom;

          if (isInTriggerZone) {
            return true;
          }
        }

        // 50-100px 之间：保持前一状态（滞后区）
        return prevVisible;
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Tooltip 进入/退出动画
  useEffect(() => {
    tooltipRefs.current.forEach((tooltip, index) => {
      if (!tooltip) return;

      if (hoveredIndex === index) {
        gsap.fromTo(
          tooltip,
          { opacity: 0, x: 10 },
          { opacity: 1, x: 0, duration: 0.2, ease: 'power2.out' }
        );
      } else {
        gsap.to(tooltip, {
          opacity: 0,
          x: 10,
          duration: 0.15,
          ease: 'power2.in',
        });
      }
    });
  }, [hoveredIndex]);

  const handleClick = (item: DockItem) => {
    if (item.action === 'search') {
      window.dispatchEvent(new CustomEvent('open-search'));
    } else if (item.href) {
      router.push(item.href);
    }
  };

  // 按钮 Hover 效果
  const handleButtonMouseEnter = (index: number) => {
    const button = buttonRefs.current[index];
    if (!button) return;

    gsap.to(button, {
      x: -8,
      scale: 1.05,
      duration: 0.3,
      ease: 'power2.out',
    });
    setHoveredIndex(index);
  };

  const handleButtonMouseLeave = (index: number) => {
    const button = buttonRefs.current[index];
    if (!button) return;

    gsap.to(button, {
      x: 0,
      scale: 1,
      duration: 0.3,
      ease: 'power2.out',
    });
    setHoveredIndex(null);
  };

  // 按钮 Tap 效果
  const handleButtonMouseDown = (index: number) => {
    const button = buttonRefs.current[index];
    if (!button) return;

    gsap.to(button, {
      scale: 0.95,
      duration: 0.1,
      ease: 'power2.out',
    });
  };

  const handleButtonMouseUp = (index: number) => {
    const button = buttonRefs.current[index];
    if (!button) return;

    gsap.to(button, {
      scale: 1.05,
      duration: 0.1,
      ease: 'power2.out',
    });
  };

  // 判断路径是否匹配（支持前缀匹配）
  const isPathMatch = (itemHref: string | undefined, currentPath: string): boolean => {
    if (!itemHref) return false;
    // 首页特殊处理：精确匹配
    if (itemHref === '/') return currentPath === '/';
    // 其他路径：前缀匹配
    return currentPath.startsWith(itemHref);
  };

  // 活动指示器位置动画（使用屏幕绝对位置）
  useEffect(() => {
    if (!indicatorRef.current) return;

    // 找到匹配当前路径的 item 在 dockItems 中的索引
    const dockItemIndex = dockItems.findIndex((item) => isPathMatch(item.href, pathname));
    if (dockItemIndex === -1) return;

    // 将 dockItems 索引转换为 buttonRefs 索引（跳过 divider）
    let buttonRefIndex = 0;
    for (let i = 0; i < dockItemIndex; i++) {
      if (dockItems[i].type !== 'divider') {
        buttonRefIndex++;
      }
    }

    const activeButton = buttonRefs.current[buttonRefIndex];
    if (!activeButton) return;

    const buttonRect = activeButton.getBoundingClientRect();

    // 更新活动指示器（相对于屏幕的绝对位置）
    const indicatorTop = buttonRect.top + buttonRect.height / 2 - 12; // 12 = indicator height / 2
    gsap.to(indicatorRef.current, {
      top: indicatorTop,
      duration: 0.3,
      ease: 'power2.out',
    });
  }, [pathname]);

  let itemIndex = 0; // 用于跟踪非 divider 项的索引

  return (
    <>
      {/* 活动指示器（固定在屏幕右侧边，始终可见）*/}
      <div
        ref={indicatorRef}
        className={cn(
          'fixed right-0 w-1 h-6 bg-gradient-to-b from-primary to-purple-600 rounded-l-full shadow-[0_0_8px_rgba(59,130,246,0.8)]',
          'transition-all duration-300 z-40'
        )}
        style={{
          // 只在有激活页面时显示
          display: dockItems.some((item) => isPathMatch(item.href, pathname)) ? 'block' : 'none',
        }}
      />

      <nav
        ref={navRef}
        className="fixed right-0 top-0 h-screen flex items-center z-50"
        style={{ transform: 'translateX(100%)' }}
      >
        <div
          ref={containerRef}
          className="relative w-20 py-6 px-4 bg-black/40 backdrop-blur-2xl border-l border-white/10 rounded-l-3xl shadow-[-8px_0_32px_rgba(0,0,0,0.3)]"
        >
        <div className="space-y-3">
          {dockItems.map((item, index) => {
            if (item.type === 'divider') {
              return (
                <div
                  key={`divider-${index}`}
                  className="h-px bg-white/10 my-2"
                />
              );
            }

            const Icon = item.icon!;
            const isActive = isPathMatch(item.href, pathname);
            const currentItemIndex = itemIndex++;

            return (
              <div key={item.href || item.action} className="relative">
                <button
                  ref={(el) => {
                    buttonRefs.current[currentItemIndex] = el;
                  }}
                  className={cn(
                    'relative w-12 h-12 flex items-center justify-center rounded-xl transition-all',
                    isActive
                      ? 'bg-gradient-to-br from-primary to-purple-600 shadow-lg'
                      : 'hover:bg-white/10'
                  )}
                  onClick={() => handleClick(item)}
                  onMouseEnter={() => handleButtonMouseEnter(currentItemIndex)}
                  onMouseLeave={() => handleButtonMouseLeave(currentItemIndex)}
                  onMouseDown={() => handleButtonMouseDown(currentItemIndex)}
                  onMouseUp={() => handleButtonMouseUp(currentItemIndex)}
                >
                  <Icon
                    size={28}
                    className={cn(
                      'transition-colors',
                      isActive ? 'text-white' : 'text-white/70'
                    )}
                  />
                </button>

                {/* Tooltip */}
                <div
                  ref={(el) => {
                    tooltipRefs.current[currentItemIndex] = el;
                  }}
                  className="absolute right-16 top-1/2 -translate-y-1/2 px-3 py-2 bg-black/90 backdrop-blur-sm text-white text-sm rounded-lg whitespace-nowrap shadow-lg border border-white/10 pointer-events-none"
                  style={{
                    opacity: 0,
                    display: hoveredIndex === currentItemIndex ? 'block' : 'none',
                  }}
                >
                  {item.label}
                  <kbd className="ml-2 px-1.5 py-0.5 text-xs bg-white/10 rounded">
                    ⌘{item.shortcut}
                  </kbd>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </nav>
    </>
  );
}
