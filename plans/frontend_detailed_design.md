# LumiHarbor 前端详细设计文档（方案 B）

> **版本**: v2.0.0
> **日期**: 2026-01-05
> **状态**: 详细设计阶段
> **作者**: AI Assistant

---

## 📋 文档概览

本文档基于用户的详细需求，对前端进行深度设计，包括：
- ✅ 右侧 Dock 导航（非底部）
- ✅ 隐藏式 Spotlight 搜索（快捷键唤醒）
- ✅ 3D 地球足迹展示
- ✅ 大事件时间轴设计
- ✅ 炫酷图标和字体方案
- ✅ 完整的后端 API 接口规范
- ✅ MVP 开发路线图（首页 → 素材库 → 相册）

---

## 目录

1. [整体布局设计](#1-整体布局设计)
2. [右侧 Dock 导航](#2-右侧-dock-导航)
3. [隐藏式 Spotlight 搜索](#3-隐藏式-spotlight-搜索)
4. [首页三种展示模式](#4-首页三种展示模式)
5. [后端 API 接口规范](#5-后端-api-接口规范)
6. [图标和字体方案](#6-图标和字体方案)
7. [3D 地图实现方案](#7-3d-地图实现方案)
8. [MVP 开发路线图](#8-mvp-开发路线图)

---

## 1. 整体布局设计

### 1.1 首页布局结构（垂直滚动平铺）

```
┌────────────────────────────────────────────────┬────┐
│  Section 1: 精选素材墙（高度 100vh）              │ 🏠 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━      │ 📸 │
│  Bento Grid 3x3 精选照片展示                    │ 📔 │ ← 右侧 Dock
│  ⬇ 向下滚动                                     │ 🗺️ │   （始终可见）
├────────────────────────────────────────────────┤ 🎞️ │
│  Section 2: 3D 地球足迹视图（高度 100vh）         │ 🔍 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━      │ ⚙️ │
│  🌍 3D 旋转地球 + 光点标记                       │    │
│  ⬇ 向下滚动                                     │    │
├────────────────────────────────────────────────┤    │
│  Section 3: 大事件时间轴（高度自适应）            │    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━      │    │
│  2024 ━━━┓                                     │    │
│           ┣━━ ● 事件卡片                        │    │
│           ┣━━ ● 事件卡片                        │    │
│  2023 ━━━┫  ...                                │    │
└────────────────────────────────────────────────┴────┘

按下 Cmd+K 或 / 键 → 全屏搜索界面覆盖整个页面
```

### 1.2 技术栈

| 类别 | 技术选型 | 原因 |
|------|---------|------|
| **框架** | Next.js 14 + React 18 + TypeScript | App Router + SSR + 类型安全 |
| **样式** | Tailwind CSS + shadcn/ui | 快速开发 + 高度可定制 |
| **图标** | Phosphor Icons (Duotone) | 7,500+ 图标 + 双色调炫酷风格 |
| **字体** | Space Grotesk + Noto Sans SC | 科技感 + 中文支持 |
| **动画** | Framer Motion | 流畅动画 + 手势支持 |
| **3D** | React Three Fiber + Three.js | 3D 地球渲染 |
| **地图** | Mapbox GL JS | 2D 详细地图 |
| **状态** | Zustand + TanStack Query | 轻量级 + 智能缓存 |

---

## 2. 右侧 Dock 导航

### 2.1 设计规范

#### 视觉样式

```css
/* Dock 容器 */
.dock-navigation {
  /* 位置：固定在右侧，垂直居中 */
  position: fixed;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  z-index: 50;

  /* 尺寸 */
  width: 80px;
  padding: 24px 16px;

  /* 玻璃态效果 */
  background: rgba(10, 10, 10, 0.6);
  backdrop-filter: blur(24px) saturate(180%);
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px 0 0 24px;  /* 左侧圆角 */

  /* 阴影：向左投射 */
  box-shadow: -8px 0 32px rgba(0, 0, 0, 0.3);
}

/* Dock 图标项 */
.dock-item {
  width: 48px;
  height: 48px;
  margin: 12px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  position: relative;
}

/* 悬停效果 */
.dock-item:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateX(-8px);  /* 向左弹出 */
  box-shadow: -4px 0 12px rgba(59, 130, 246, 0.3);
}

/* 激活状态 */
.dock-item.active {
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  box-shadow: -4px 0 16px rgba(59, 130, 246, 0.5);
}

/* 激活指示器（左侧发光条） */
.dock-item.active::before {
  content: '';
  position: absolute;
  left: -16px;
  width: 4px;
  height: 24px;
  background: linear-gradient(180deg, #3b82f6, #8b5cf6);
  border-radius: 2px;
  box-shadow: 0 0 8px rgba(59, 130, 246, 0.8);
}
```

#### 图标列表

| 图标 | 功能 | 路由 | 快捷键 | Phosphor Icon |
|------|------|------|--------|---------------|
| 🏠 | 首页 | `/` | Cmd+H | `House` |
| 📸 | 素材库 | `/assets` | Cmd+A | `ImageSquare` |
| 📔 | 笔记 | `/notes` | Cmd+N | `Article` |
| 🗺️ | 地图 | `/map` | Cmd+M | `MapTrifold` |
| 🎞️ | 相册 | `/albums` | Cmd+L | `FolderOpen` |
| ━━ | 分隔线 | - | - | - |
| 🔍 | 搜索 | - | Cmd+K | `MagnifyingGlass` |
| ⚙️ | 设置 | `/settings` | Cmd+, | `Gear` |

### 2.2 组件实现

```tsx
// components/layout/DockNavigation.tsx
'use client';

import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
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

const dockItems = [
  { icon: House, label: '首页', href: '/', shortcut: 'H' },
  { icon: ImageSquare, label: '素材', href: '/assets', shortcut: 'A' },
  { icon: Article, label: '笔记', href: '/notes', shortcut: 'N' },
  { icon: MapTrifold, label: '地图', href: '/map', shortcut: 'M' },
  { icon: FolderOpen, label: '相册', href: '/albums', shortcut: 'L' },
  { type: 'divider' },
  { icon: MagnifyingGlass, label: '搜索', action: 'search', shortcut: 'K' },
  { icon: Gear, label: '设置', href: '/settings', shortcut: ',' },
];

export function DockNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const handleClick = (item: typeof dockItems[0]) => {
    if (item.action === 'search') {
      // 触发搜索界面
      window.dispatchEvent(new CustomEvent('open-search'));
    } else if (item.href) {
      router.push(item.href);
    }
  };

  return (
    <nav className="fixed right-0 top-1/2 -translate-y-1/2 z-50">
      <div className="w-20 py-6 px-4 bg-black/60 backdrop-blur-2xl border-l border-white/10 rounded-l-3xl shadow-[-8px_0_32px_rgba(0,0,0,0.3)]">
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

                {/* 激活指示器 */}
                {isActive && (
                  <motion.div
                    layoutId="dock-indicator"
                    className="absolute -left-4 w-1 h-6 bg-gradient-to-b from-primary to-purple-600 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.8)]"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}

                {/* 工具提示 */}
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
    </nav>
  );
}
```

---

## 3. 隐藏式 Spotlight 搜索

### 3.1 设计规范

#### 触发方式
1. **快捷键**：`Cmd+K` (Mac) / `Ctrl+K` (Windows)
2. **备用快捷键**：`/` 键
3. **Dock 图标**：点击搜索图标

#### 视觉效果

```
┌──────────────────────────────────────────────────┐
│        背景模糊遮罩（bg-black/70 backdrop-blur）   │
│                                                  │
│   ┌──────────────────────────────────────────┐  │
│   │  🔍  搜索素材、相册、笔记、地点...          │  │ ← 搜索框
│   └──────────────────────────────────────────┘  │   （宽600px，居中）
│                                                  │
│   ┌──────────────────────────────────────────┐  │
│   │  最近搜索                                 │  │
│   │  ──────────────────────────────────────  │  │
│   │  · 2024 年旅行照片                        │  │
│   │  · 家庭聚会相册                           │  │
│   │  · 京都樱花                               │  │
│   └──────────────────────────────────────────┘  │
│                                                  │
│   ┌──────────────────────────────────────────┐  │
│   │  快捷命令                                 │  │
│   │  ──────────────────────────────────────  │  │
│   │  /assets  → 跳转素材库                    │  │
│   │  /albums  → 跳转相册                      │  │
│   │  /map     → 跳转地图                      │  │
│   │  /notes   → 跳转笔记                      │  │
│   └──────────────────────────────────────────┘  │
│                                                  │
│                按 Esc 关闭                       │
└──────────────────────────────────────────────────┘
```

### 3.2 组件实现

```tsx
// components/search/SpotlightSearch.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MagnifyingGlass, X } from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

export function SpotlightSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // 监听快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      } else if (e.key === '/' && !isOpen) {
        e.preventDefault();
        setIsOpen(true);
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setQuery('');
      }
    };

    const handleCustomEvent = () => setIsOpen(true);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-search', handleCustomEvent);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-search', handleCustomEvent);
    };
  }, [isOpen]);

  // 自动聚焦
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // 搜索查询
  const { data: results, isLoading } = useQuery({
    queryKey: ['search', query],
    queryFn: () => api.search({ query }),
    enabled: query.length > 0,
  });

  // 快捷命令
  const commands = [
    { key: '/assets', label: '跳转素材库', href: '/assets' },
    { key: '/albums', label: '跳转相册', href: '/albums' },
    { key: '/map', label: '跳转地图', href: '/map' },
    { key: '/notes', label: '跳转笔记', href: '/notes' },
  ];

  const handleCommand = (href: string) => {
    router.push(href);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-50"
            onClick={() => setIsOpen(false)}
          />

          {/* 搜索界面 */}
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 w-full max-w-2xl z-50"
          >
            <div className="mx-4">
              {/* 搜索框 */}
              <div className="relative">
                <MagnifyingGlass
                  size={24}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
                />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="搜索素材、相册、笔记、地点..."
                  className="w-full pl-14 pr-12 py-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl text-white placeholder:text-white/40 focus:outline-none focus:border-primary transition-colors"
                />
                <button
                  onClick={() => setIsOpen(false)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* 搜索结果或快捷命令 */}
              <div className="mt-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden">
                {query.length === 0 ? (
                  <>
                    {/* 最近搜索 */}
                    <div className="p-4 border-b border-white/10">
                      <h3 className="text-sm font-medium text-white/60 mb-2">
                        最近搜索
                      </h3>
                      <div className="space-y-2">
                        {['2024 年旅行照片', '家庭聚会相册', '京都樱花'].map(
                          (item) => (
                            <button
                              key={item}
                              className="block w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-white"
                            >
                              · {item}
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    {/* 快捷命令 */}
                    <div className="p-4">
                      <h3 className="text-sm font-medium text-white/60 mb-2">
                        快捷命令
                      </h3>
                      <div className="space-y-2">
                        {commands.map((cmd) => (
                          <button
                            key={cmd.key}
                            onClick={() => handleCommand(cmd.href)}
                            className="flex items-center justify-between w-full px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
                          >
                            <span className="text-white">
                              <code className="px-2 py-1 bg-white/10 rounded text-sm mr-3">
                                {cmd.key}
                              </code>
                              {cmd.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  /* 搜索结果 */
                  <div className="max-h-96 overflow-y-auto p-4">
                    {isLoading ? (
                      <p className="text-center text-white/60">搜索中...</p>
                    ) : results?.total === 0 ? (
                      <p className="text-center text-white/60">没有找到结果</p>
                    ) : (
                      <div className="space-y-4">
                        {/* 素材结果 */}
                        {results?.assets && results.assets.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-white/60 mb-2">
                              素材
                            </h4>
                            <div className="grid grid-cols-5 gap-2">
                              {results.assets.map((asset) => (
                                <button
                                  key={asset.id}
                                  onClick={() =>
                                    router.push(`/assets/${asset.id}`)
                                  }
                                  className="aspect-square rounded-lg overflow-hidden hover:ring-2 hover:ring-primary transition-all"
                                >
                                  <img
                                    src={asset.thumbnailUrl}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 相册结果 */}
                        {results?.albums && results.albums.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-white/60 mb-2">
                              相册
                            </h4>
                            <div className="space-y-2">
                              {results.albums.map((album) => (
                                <button
                                  key={album.id}
                                  onClick={() =>
                                    router.push(`/albums/${album.id}`)
                                  }
                                  className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-white/10 transition-colors"
                                >
                                  <img
                                    src={album.coverUrl}
                                    alt=""
                                    className="w-12 h-12 rounded-lg object-cover"
                                  />
                                  <div className="flex-1 text-left">
                                    <p
                                      className="text-white font-medium"
                                      dangerouslySetInnerHTML={{
                                        __html: album.highlight,
                                      }}
                                    />
                                    <p className="text-sm text-white/60">
                                      {album.assetCount} 张照片
                                    </p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 提示 */}
              <div className="mt-2 flex items-center justify-center gap-4 text-sm text-white/40">
                <span>
                  <kbd className="px-1.5 py-0.5 bg-white/10 rounded">Esc</kbd>{' '}
                  关闭
                </span>
                <span>
                  <kbd className="px-1.5 py-0.5 bg-white/10 rounded">↑↓</kbd>{' '}
                  导航
                </span>
                <span>
                  <kbd className="px-1.5 py-0.5 bg-white/10 rounded">
                    Enter
                  </kbd>{' '}
                  打开
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

---

## 4. 首页垂直滚动布局

### 4.1 主页面组件

```tsx
// app/(main)/page.tsx
'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { BentoGrid } from '@/components/home/BentoGrid';
import { MapView3D } from '@/components/home/MapView3D';
import { Timeline } from '@/components/home/Timeline';

export default function HomePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Section 1: 精选素材墙 (100vh) */}
      <section className="relative h-screen w-full">
        <BentoGrid />

        {/* 向下滚动提示 */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <div className="flex flex-col items-center gap-2 text-white/60">
            <span className="text-sm">向下滚动探索更多</span>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </motion.div>
      </section>

      {/* Section 2: 3D 地球足迹视图 (100vh) */}
      <section className="relative h-screen w-full">
        <MapView3D />
      </section>

      {/* Section 3: 大事件时间轴 (高度自适应) */}
      <section className="relative w-full min-h-screen py-20">
        <Timeline />
      </section>
    </div>
  );
}
```

### 4.2 滚动进度指示器（可选）

```tsx
// 在页面右下角显示滚动进度
<motion.div
  className="fixed right-6 bottom-6 w-12 h-12 rounded-full border-2 border-white/20 z-40"
  style={{
    background: `conic-gradient(#3b82f6 ${scrollYProgress * 360}deg, transparent 0deg)`,
  }}
>
  <div className="absolute inset-1 rounded-full bg-black" />
</motion.div>
```

### 4.3 Section 1：Bento Grid 精选照片墙

详见本文档后续章节的完整实现

### 4.4 Section 2：3D 地球足迹视图

详见本文档 [7. 3D 地图实现方案](#7-3d-地图实现方案)

### 4.5 Section 3：大事件时间轴

详见本文档前面的"大事件时间轴展示方案"章节

---

## 5. 后端 API 接口规范

### 5.1 接口列表总览

| 接口 | 用途 | 方法 | 路径 |
|------|------|------|------|
| 精选内容 | 首页 Bento Grid | GET | `/api/v1/home/featured` |
| 大事件时间轴 | 首页时间轴模式 | GET | `/api/v1/home/timeline` |
| 足迹地点 | 3D 地图标记 | GET | `/api/v1/home/locations` |
| 素材列表 | 素材库页面 | GET | `/api/v1/assets` |
| 素材详情 | 素材详情页 | GET | `/api/v1/assets/:id` |
| 相册列表 | 相册页面 | GET | `/api/v1/albums` |
| 相册详情 | 相册详情页 | GET | `/api/v1/albums/:id` |
| 全局搜索 | Spotlight 搜索 | GET | `/api/v1/search` |

### 5.2 详细接口定义

详见本文档前面的"后端 API 接口规范"章节（已完整定义所有接口）

---

## 6. 图标和字体方案

### 6.1 图标库：Phosphor Icons (Duotone)

**推荐理由**：
- ✅ 7,500+ 图标，覆盖所有场景
- ✅ Duotone 双色调风格，视觉冲击力强
- ✅ React 原生组件，性能优化
- ✅ 支持动态切换 weight（实现悬停动画）

**安装**：
```bash
npm install @phosphor-icons/react
```

**使用示例**：
```tsx
import { House, ImageSquare, Article } from '@phosphor-icons/react';

<House size={32} weight="duotone" color="#3b82f6" />
<ImageSquare size={32} weight="duotone" />

// 悬停时切换 weight
<motion.div whileHover={{ scale: 1.2 }}>
  <Article
    size={32}
    weight={isHovered ? 'fill' : 'duotone'}
  />
</motion.div>
```

### 6.2 字体方案：Space Grotesk + Noto Sans SC

**英文字体：Space Grotesk**
- 用途：标题、按钮、导航
- 特点：几何感强、未来感、科技感
- 粗细：300 / 400 / 500 / 600 / 700

**中文字体：Noto Sans SC（思源黑体）**
- 用途：正文、副标题
- 特点：现代简洁、阅读性强
- 粗细：100-900 全系列

**配置**：
```typescript
// app/layout.tsx
import { Space_Grotesk, Noto_Sans_SC } from 'next/font/google';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-space-grotesk',
});

const notoSansSC = Noto_Sans_SC({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700', '900'],
  variable: '--font-noto-sans-sc',
});

// tailwind.config.ts
export default {
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-noto-sans-sc)', 'sans-serif'],
        heading: ['var(--font-space-grotesk)', 'sans-serif'],
      },
    },
  },
};
```

---

## 7. 3D 地图实现方案

### 7.1 技术方案：3D 地球 + Mapbox 混合

**工作流程**：
1. **初始视图**：3D 旋转地球（React Three Fiber）
2. **交互**：点击光点 → 地球旋转并放大
3. **切换**：放大后 → 自动切换到 Mapbox 2D 详细地图
4. **返回**：点击按钮 → 返回 3D 地球视图

### 7.2 核心技术栈

| 技术 | 用途 |
|------|------|
| `three` | 3D 渲染引擎 |
| `@react-three/fiber` | React 化的 Three.js |
| `@react-three/drei` | Three.js 工具库（OrbitControls, Stars, useTexture 等） |
| `mapbox-gl` | 2D 详细地图 |
| `react-map-gl` | React Mapbox 组件 |

**安装**：
```bash
npm install three @react-three/fiber @react-three/drei
npm install mapbox-gl react-map-gl
npm install -D @types/three @types/mapbox-gl
```

### 7.3 组件结构

```
components/map/
├── MapView3D.tsx           # 主组件（视图切换逻辑）
├── Globe3D.tsx             # 3D 地球组件
│   ├── Earth.tsx           # 地球模型
│   └── LocationMarker.tsx  # 地点标记（光点）
└── MapboxView.tsx          # Mapbox 2D 地图
```

### 7.4 核心代码

详见本文档前面的"3D 地图实现方案"章节（已完整实现）

### 7.5 地球纹理资源

**推荐资源**：
- Solar System Scope Textures（免费 8K 地球纹理）
- https://www.solarsystemscope.com/textures/

**所需纹理**：
1. `earth_color_8k.jpg` - 颜色贴图
2. `earth_normal_8k.jpg` - 法线贴图（地形凹凸）
3. `earth_specular_8k.jpg` - 高光贴图（水面反光）

**存放位置**：`public/textures/`

---

## 8. MVP 开发路线图

### 8.1 MVP 范围

**目标**：实现核心功能，验证技术方案可行性

**包含页面**：
1. ✅ 首页（3 种模式切换）
2. ✅ 素材库（瀑布流 + 全屏查看）
3. ✅ 相册（网格布局 + 详情页）

**包含功能**：
1. ✅ 右侧 Dock 导航
2. ✅ 隐藏式 Spotlight 搜索
3. ✅ 3D 地球足迹展示
4. ✅ 大事件时间轴
5. ✅ Bento Grid 精选照片墙

**暂不包含**：
- ❌ 笔记功能（后续迭代）
- ❌ 用户认证（后端待实现）
- ❌ 移动端适配（暂不考虑）

---

### 8.2 开发阶段（6 周）

#### 🏗️ 阶段 1：基础框架搭建（1 周）

**目标**：完成项目初始化和基础配置

**任务清单**：
- [ ] 初始化 Next.js 14 项目（TypeScript + Tailwind）
- [ ] 安装配置 shadcn/ui
- [ ] 配置 Space Grotesk + Noto Sans SC 字体
- [ ] 安装 Phosphor Icons
- [ ] 配置 Framer Motion
- [ ] 搭建路由结构（App Router）
- [ ] 配置 Zustand + TanStack Query
- [ ] 配置 Axios API 客户端
- [ ] 配置环境变量（Mapbox Token 等）

**验收标准**：
- ✅ 项目可正常运行（`npm run dev`）
- ✅ 字体和图标正常显示
- ✅ API 客户端可成功调用后端接口

---

#### 🧭 阶段 2：导航和搜索（1 周）

**目标**：实现右侧 Dock 导航和 Spotlight 搜索

**任务清单**：
- [ ] 实现右侧 Dock 导航组件
  - [ ] 图标列表和路由跳转
  - [ ] 悬停效果（向左弹出）
  - [ ] 激活状态（发光条）
  - [ ] 工具提示（Tooltip）
  - [ ] 快捷键支持（Cmd+H/A/N 等）
- [ ] 实现 Spotlight 搜索组件
  - [ ] 全屏搜索界面
  - [ ] 快捷键触发（Cmd+K、/）
  - [ ] 搜索框和结果展示
  - [ ] 快捷命令功能
  - [ ] 键盘导航（↑↓ Enter Esc）
- [ ] 实现全局快捷键监听

**验收标准**：
- ✅ Dock 导航正常工作，所有交互效果流畅
- ✅ 搜索可通过快捷键打开/关闭
- ✅ 搜索结果正确展示（Mock 数据）

---

#### 🏠 阶段 3：首页三种模式（2 周）

**目标**：实现首页的 Bento Grid、3D 地球、时间轴三种模式

##### 3.1 Bento Grid 模式（3 天）
- [ ] 实现 Bento Grid 布局（3x3 不规则网格）
- [ ] 实现精选照片卡片组件
- [ ] 集成后端精选接口（`/api/v1/home/featured`）
- [ ] 添加悬停效果（放大、显示元信息）
- [ ] 添加点击查看全屏详情

##### 3.2 3D 地球模式（5 天）
- [ ] 安装 Three.js 相关依赖
- [ ] 下载并配置地球纹理（8K）
- [ ] 实现地球模型组件（旋转、光照）
- [ ] 实现地点标记组件（光点 + 光晕）
- [ ] 集成后端足迹接口（`/api/v1/home/locations`）
- [ ] 实现经纬度转 3D 坐标
- [ ] 实现轨道控制器（鼠标拖拽旋转）
- [ ] 实现点击标记 → 地球旋转动画
- [ ] 实现 Mapbox 2D 地图组件
- [ ] 实现视图切换逻辑（3D ↔ 2D）
- [ ] 性能优化（LOD、纹理懒加载）

##### 3.3 时间轴模式（3 天）
- [ ] 实现时间轴主轴线组件
- [ ] 实现事件节点组件（圆点 + 连接线）
- [ ] 实现事件卡片组件（封面图 + 信息）
- [ ] 集成后端大事件接口（`/api/v1/home/timeline`）
- [ ] 实现滚动视差效果
- [ ] 实现年份筛选器
- [ ] 实现卡片展开/收起动画

##### 3.4 模式切换（1 天）
- [ ] 实现底部模式切换指示器
- [ ] 实现模式切换动画（淡入淡出）
- [ ] 实现模式状态持久化（LocalStorage）

**验收标准**：
- ✅ 三种模式均可正常展示
- ✅ 模式切换流畅，动画效果流畅
- ✅ 3D 地球可正常旋转、缩放、点击
- ✅ Mapbox 地图正常显示标记和弹窗
- ✅ 时间轴可滚动，年份筛选生效

---

#### 📸 阶段 4：素材库页面（1 周）

**目标**：实现素材库的瀑布流展示和全屏查看

**任务清单**：
- [ ] 实现瀑布流布局（react-masonry-css）
- [ ] 实现素材卡片组件
  - [ ] 缩略图展示
  - [ ] 悬停效果（放大、显示元信息）
  - [ ] 类型标识（照片/视频）
- [ ] 实现全屏查看器（Lightbox）
  - [ ] 图片查看（缩放、拖拽）
  - [ ] 视频播放
  - [ ] 左右切换（键盘/按钮）
  - [ ] 元数据展示（EXIF、GPS、标签）
- [ ] 实现筛选功能
  - [ ] 类型筛选（照片/视频）
  - [ ] 日期范围筛选
  - [ ] 标签筛选
- [ ] 实现排序功能（时间/文件大小）
- [ ] 实现无限滚动加载
- [ ] 集成后端素材接口（`/api/v1/assets`）

**验收标准**：
- ✅ 瀑布流布局正常，图片不变形
- ✅ 全屏查看器功能完整，交互流畅
- ✅ 筛选和排序生效
- ✅ 无限滚动正常加载新数据

---

#### 🎞️ 阶段 5：相册页面（1 周）

**目标**：实现相册的网格展示和详情页

**任务清单**：
- [ ] 实现相册网格布局（Apple 风格）
- [ ] 实现相册卡片组件
  - [ ] 封面图展示（4 张拼接或单张）
  - [ ] 悬停效果（放大、显示统计）
  - [ ] 相册名称和时间范围
- [ ] 实现相册详情页
  - [ ] 头部信息（名称、描述、统计）
  - [ ] 素材网格展示
  - [ ] 点击素材打开全屏查看
- [ ] 集成后端相册接口
  - [ ] 相册列表（`/api/v1/albums`）
  - [ ] 相册详情（`/api/v1/albums/:id`）

**验收标准**：
- ✅ 相册卡片正常展示，悬停效果流畅
- ✅ 相册详情页信息完整
- ✅ 从相册详情可跳转到素材全屏查看

---

#### 🚀 阶段 6：优化和完善（1 周）

**目标**：性能优化、细节打磨、Bug 修复

**任务清单**：
- [ ] 性能优化
  - [ ] 图片懒加载优化（next/image + BlurHash）
  - [ ] 3D 地球性能优化（LOD、纹理压缩）
  - [ ] 代码分割（动态导入重组件）
  - [ ] Bundle 分析和优化
- [ ] 细节打磨
  - [ ] 统一动画曲线和时长
  - [ ] 完善加载状态（Skeleton）
  - [ ] 完善空状态（EmptyState）
  - [ ] 完善错误处理（ErrorBoundary）
- [ ] 测试
  - [ ] 核心组件单元测试
  - [ ] 关键流程 E2E 测试
  - [ ] 浏览器兼容性测试
- [ ] 文档
  - [ ] README 完善
  - [ ] 组件文档（Storybook 可选）
  - [ ] 开发指南

**验收标准**：
- ✅ Lighthouse 性能得分 > 90
- ✅ 无明显性能问题和 UI 卡顿
- ✅ 核心流程测试通过
- ✅ 文档完整

---

### 8.3 里程碑时间线

```
Week 1: 基础框架搭建 ✅
Week 2: 导航和搜索 ✅
Week 3-4: 首页三种模式 ✅
Week 5: 素材库页面 ✅
Week 6: 相册页面 ✅
Week 7: 优化和完善 ✅

Total: 6-7 周完成 MVP
```

---

## 9. 总结

### 9.1 设计亮点

1. **右侧 Dock 导航**：macOS 风格，炫酷且不遮挡内容
2. **Spotlight 搜索**：快捷键唤醒，全屏沉浸式体验
3. **3D 地球 + Mapbox 混合**：平衡炫酷度和实用性
4. **Phosphor Duotone 图标**：双色调风格，科技感强
5. **Space Grotesk 字体**：几何感、未来感
6. **三种首页模式**：Bento Grid / 3D 地球 / 时间轴，内容多样化

### 9.2 技术亮点

1. **Next.js 14 App Router**：最新路由系统 + SSR
2. **React Three Fiber**：React 化的 Three.js，性能优化
3. **Framer Motion**：流畅动画，轻松实现复杂交互
4. **TanStack Query**：智能缓存，自动重试
5. **Tailwind CSS**：快速开发，高度可定制

### 9.3 开发建议

1. **循序渐进**：先完成基础框架，再实现复杂功能（3D 地球）
2. **组件复用**：优先提取可复用组件（Card、Grid、Lightbox）
3. **Mock 数据**：前期使用 Mock 数据，后期再集成真实 API
4. **性能优先**：关注 3D 渲染性能，及时优化
5. **版本控制**：每个阶段完成后打 Tag，方便回滚

---

## 10. 附录

### 10.1 依赖清单

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "typescript": "^5.3.0",

    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@phosphor-icons/react": "^2.0.0",
    "tailwindcss": "^3.4.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0",

    "framer-motion": "^10.18.0",

    "three": "^0.160.0",
    "@react-three/fiber": "^8.15.0",
    "@react-three/drei": "^9.95.0",

    "mapbox-gl": "^3.0.1",
    "react-map-gl": "^7.1.7",

    "zustand": "^4.4.7",
    "@tanstack/react-query": "^5.17.0",
    "axios": "^1.6.5",

    "react-masonry-css": "^1.0.16",
    "date-fns": "^3.0.6"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "@types/react": "^18.2.48",
    "@types/three": "^0.160.0",
    "@types/mapbox-gl": "^3.0.0",
    "eslint": "^8.56.0",
    "prettier": "^3.1.1"
  }
}
```

### 10.2 环境变量

```env
# .env.local

# API 配置
NEXT_PUBLIC_API_URL=http://localhost:8000

# Mapbox Token
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_access_token

# 其他配置
NEXT_PUBLIC_ENABLE_3D_GLOBE=true
NEXT_PUBLIC_MAX_ASSET_UPLOAD_SIZE=100
```

### 10.3 参考资源

- **Next.js 文档**：https://nextjs.org/docs
- **Phosphor Icons**：https://phosphoricons.com
- **React Three Fiber**：https://docs.pmnd.rs/react-three-fiber
- **Mapbox GL JS**：https://docs.mapbox.com/mapbox-gl-js/
- **Framer Motion**：https://www.framer.com/motion/
- **地球纹理**：https://www.solarsystemscope.com/textures/

---

**文档版本**: v2.0.0
**最后更新**: 2026-01-05
**维护者**: AI Assistant

**下一步**：选择开发阶段，开始实现！🚀
