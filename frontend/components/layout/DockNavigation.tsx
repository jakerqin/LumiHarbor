'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  House,
  ImageSquare,
  Article,
  MapTrifold,
  FolderOpen,
  MagnifyingGlass,
  Gear,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils/cn';

interface DockItem {
  icon: React.ComponentType<{ size?: number; weight?: string; className?: string }>;
  label: string;
  href?: string;
  action?: string;
  shortcut: string;
  type?: 'divider';
}

const dockItems: DockItem[] = [
  { icon: House, label: '首页', href: '/', shortcut: 'H' },
  { icon: ImageSquare, label: '素材', href: '/assets', shortcut: 'A' },
  { icon: Article, label: '笔记', href: '/notes', shortcut: 'N' },
  { icon: MapTrifold, label: '地图', href: '/map', shortcut: 'M' },
  { icon: FolderOpen, label: '相册', href: '/albums', shortcut: 'L' },
  { type: 'divider' } as DockItem,
  { icon: MagnifyingGlass, label: '搜索', action: 'search', shortcut: 'K' },
  { icon: Gear, label: '设置', href: '/settings', shortcut: ',' },
];

export function DockNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // 当鼠标距离右侧边缘小于 80px 时显示 Dock
      const distanceFromRight = window.innerWidth - e.clientX;
      setIsVisible(distanceFromRight < 80);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleClick = (item: DockItem) => {
    if (item.action === 'search') {
      window.dispatchEvent(new CustomEvent('open-search'));
    } else if (item.href) {
      router.push(item.href);
    }
  };

  return (
    <AnimatePresence>
      <motion.nav
        initial={{ x: '100%' }}
        animate={{ x: isVisible ? '0%' : '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-50"
      >
        <div className="w-20 py-6 px-4 bg-black/40 backdrop-blur-2xl border-l border-white/10 rounded-l-3xl shadow-[-8px_0_32px_rgba(0,0,0,0.3)]">
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
              const isActive = pathname === item.href;

              return (
                <motion.button
                  key={item.href || item.action}
                  className={cn(
                    'relative w-12 h-12 flex items-center justify-center rounded-xl transition-all',
                    isActive
                      ? 'bg-gradient-to-br from-primary to-purple-600 shadow-lg'
                      : 'hover:bg-white/10'
                  )}
                  whileHover={{ x: -8, scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleClick(item)}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <Icon
                    size={28}
                    weight="duotone"
                    className={cn(
                      'transition-colors',
                      isActive ? 'text-white' : 'text-white/70'
                    )}
                  />

                  {isActive && (
                    <motion.div
                      layoutId="dock-indicator"
                      className="absolute -left-4 w-1 h-6 bg-gradient-to-b from-primary to-purple-600 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.8)]"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}

                  {hoveredIndex === index && (
                    <motion.div
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="absolute right-full mr-4 px-3 py-2 bg-black/90 backdrop-blur-sm text-white text-sm rounded-lg whitespace-nowrap shadow-lg"
                    >
                      {item.label}
                      <kbd className="ml-2 px-1.5 py-0.5 text-xs bg-white/10 rounded">
                        ⌘{item.shortcut}
                      </kbd>
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      </motion.nav>
    </AnimatePresence>
  );
}
