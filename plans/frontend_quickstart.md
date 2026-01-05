# LumiHarbor 前端快速开始指南

> **目标**：从零开始创建 LumiHarbor 前端项目
> **预估时间**：30 分钟完成基础搭建

---

## 🎯 第一步：初始化项目（5 分钟）

### 1.1 创建 Next.js 项目

```bash
# 在项目根目录执行
npx create-next-app@latest frontend --typescript --tailwind --app --no-src-dir

# 进入前端目录
cd frontend
```

**配置选项**：
- ✅ TypeScript
- ✅ Tailwind CSS
- ✅ App Router
- ❌ src/ directory（不使用，保持结构简洁）
- ✅ import alias（使用 `@/*`）

### 1.2 安装核心依赖

```bash
# UI 组件库（shadcn/ui）
npx shadcn-ui@latest init

# 选择以下配置：
# - Style: Default
# - Base color: Slate
# - CSS variables: Yes

# 动画库
npm install framer-motion

# 状态管理
npm install zustand @tanstack/react-query

# HTTP 客户端
npm install axios

# 工具库
npm install clsx tailwind-merge class-variance-authority
npm install date-fns
npm install lucide-react

# 地图（后续需要时安装）
# npm install mapbox-gl react-map-gl

# 3D（后续需要时安装）
# npm install three @react-three/fiber @react-three/drei
```

### 1.3 安装 shadcn/ui 基础组件

```bash
# 批量安装常用组件
npx shadcn-ui@latest add button card dialog dropdown-menu input label separator skeleton
```

---

## 🎨 第二步：配置主题和样式（10 分钟）

### 2.1 更新 Tailwind 配置

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // 深色主题
        background: {
          DEFAULT: '#0a0a0a',
          secondary: '#1a1a1a',
          tertiary: '#2a2a2a',
        },
        foreground: {
          DEFAULT: '#ffffff',
          secondary: '#a0a0a0',
          tertiary: '#707070',
        },
        // 强调色
        primary: {
          DEFAULT: '#3b82f6',
          hover: '#2563eb',
          light: '#60a5fa',
        },
        // 玻璃态
        glass: {
          DEFAULT: 'rgba(255, 255, 255, 0.1)',
          hover: 'rgba(255, 255, 255, 0.15)',
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.4s ease-out',
        'scale-in': 'scale-in 0.3s ease-out',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { transform: 'translateY(20px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'scale-in': {
          from: { transform: 'scale(0.9)', opacity: '0' },
          to: { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
```

### 2.2 更新全局样式

```css
/* app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 10 10 10;
    --foreground: 255 255 255;
  }

  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground;
    font-feature-settings: "rlig" 1, "calt" 1;
  }

  /* 隐藏滚动条 */
  .hide-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .hide-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  /* 毛玻璃效果 */
  .glass {
    @apply bg-white/10 backdrop-blur-xl border border-white/20;
  }
}
```

### 2.3 创建工具函数

```typescript
// lib/utils/cn.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

## 🏗️ 第三步：创建基础布局（10 分钟）

### 3.1 更新根布局

```typescript
// app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'LumiHarbor - 拾光坞',
  description: '个人与家庭足迹记忆管理系统',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### 3.2 创建 Providers

```typescript
// app/providers.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 分钟
            cacheTime: 10 * 60 * 1000, // 10 分钟
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

### 3.3 创建简单的首页

```typescript
// app/page.tsx
export default function HomePage() {
  return (
    <div className="relative h-screen w-full flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-4">
          LumiHarbor
        </h1>
        <p className="text-xl text-foreground-secondary">
          拾光坞 - 个人与家庭足迹记忆管理系统
        </p>
        <div className="mt-8">
          <div className="inline-block px-8 py-4 rounded-2xl glass">
            <p className="text-sm">正在构建中...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 3.4 运行项目

```bash
npm run dev
```

访问 `http://localhost:3000`，你应该能看到一个简洁的欢迎页面！

---

## 🧭 第四步：创建底部 Dock 导航（MVP 版本）

### 4.1 创建 Dock 组件

```typescript
// components/layout/DockNavigation.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Image, BookOpen, Map, FolderOpen, Search, Settings } from 'lucide-react';

const dockItems = [
  { icon: Home, label: '首页', href: '/' },
  { icon: Image, label: '素材', href: '/assets' },
  { icon: BookOpen, label: '笔记', href: '/notes' },
  { icon: Map, label: '地图', href: '/map' },
  { icon: FolderOpen, label: '相册', href: '/albums' },
  { icon: Search, label: '搜索', href: '/search' },
  { icon: Settings, label: '设置', href: '/settings' },
];

export function DockNavigation() {
  const [isVisible, setIsVisible] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const threshold = window.innerHeight - 20;
      setIsVisible(e.clientY > threshold);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.nav
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <div className="flex items-end gap-2 px-6 py-4 rounded-2xl glass shadow-2xl">
            {dockItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <motion.div
                  key={item.href}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <Link href={item.href}>
                    <motion.div
                      className="relative flex flex-col items-center cursor-pointer"
                      whileHover={{ scale: 1.2, y: -8 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                    >
                      <div className="w-14 h-14 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                        <Icon className="w-6 h-6 text-white" />
                      </div>

                      {/* 工具提示 */}
                      {hoveredIndex === index && (
                        <motion.div
                          className="absolute -top-12 bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap"
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          {item.label}
                        </motion.div>
                      )}

                      {/* 激活指示器 */}
                      {isActive && (
                        <motion.div
                          className="absolute -bottom-2 w-1 h-1 rounded-full bg-white"
                          layoutId="dock-indicator"
                        />
                      )}
                    </motion.div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  );
}
```

### 4.2 在布局中使用 Dock

```typescript
// app/(main)/layout.tsx
import { DockNavigation } from '@/components/layout/DockNavigation';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <DockNavigation />
    </>
  );
}
```

### 4.3 更新首页使用主布局

```typescript
// 移动 app/page.tsx 到 app/(main)/page.tsx
// 创建路由组目录
mkdir -p app/\(main\)
mv app/page.tsx app/\(main\)/page.tsx
```

### 4.4 测试 Dock 导航

刷新页面，将鼠标移动到屏幕底部，应该能看到炫酷的 Dock 导航栏弹出！

---

## 📦 第五步：配置 API 客户端（5 分钟）

### 5.1 创建 Axios 实例

```typescript
// lib/api/client.ts
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器（添加 token）
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器（错误处理）
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Token 过期，跳转登录
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

### 5.2 创建 API 类型定义

```typescript
// lib/api/types.ts
export interface Asset {
  id: number;
  originalPath: string;
  thumbnailPath: string;
  assetType: 'image' | 'video' | 'audio';
  mimeType: string;
  fileSize: number;
  shotAt: string;
  createdAt: string;
}

export interface Album {
  id: number;
  name: string;
  description?: string;
  coverAssetId?: number;
  coverUrl?: string;
  assetCount: number;
  startTime?: string;
  endTime?: string;
  createdAt: string;
}

export interface Note {
  id: number;
  title: string;
  content: string;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}
```

### 5.3 创建素材 API

```typescript
// lib/api/assets.ts
import { apiClient } from './client';
import { Asset, ApiResponse } from './types';

export const assetsApi = {
  // 获取素材列表
  list: async (params?: {
    page?: number;
    pageSize?: number;
    assetType?: string;
  }) => {
    const response = await apiClient.get<ApiResponse<Asset[]>>('/assets', { params });
    return response.data;
  },

  // 获取单个素材
  get: async (id: number) => {
    const response = await apiClient.get<ApiResponse<Asset>>(`/assets/${id}`);
    return response.data;
  },

  // 获取精选素材（用于首页）
  getFeatured: async (limit: number = 9) => {
    const response = await apiClient.get<ApiResponse<Asset[]>>('/assets/featured', {
      params: { limit },
    });
    return response.data;
  },
};
```

### 5.4 创建环境变量

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 🎯 当前进度总结

✅ **已完成**：
1. Next.js 项目初始化
2. Tailwind CSS + shadcn/ui 配置
3. 深色主题 + 科技感样式
4. 底部 Dock 导航（含动画）
5. API 客户端配置
6. 项目基础架构

🚧 **下一步**（选择你想先实现的功能）：

### 选项 A：实现素材库页面
```bash
# 创建素材库页面
touch app/\(main\)/assets/page.tsx

# 创建素材组件
mkdir -p components/assets
touch components/assets/AssetGrid.tsx
touch components/assets/AssetCard.tsx
```

### 选项 B：实现相册页面
```bash
# 创建相册页面
touch app/\(main\)/albums/page.tsx

# 创建相册组件
mkdir -p components/albums
touch components/albums/AlbumGrid.tsx
touch components/albums/AlbumCard.tsx
```

### 选项 C：完善首页（Bento Grid）
```bash
# 创建首页组件
mkdir -p components/home
touch components/home/BentoGrid.tsx
touch components/home/BentoCard.tsx
```

---

## 📚 参考资源

- **完整架构文档**：[plans/frontend_architecture.md](../frontend_architecture.md)
- **Next.js 文档**：https://nextjs.org/docs
- **Tailwind CSS 文档**：https://tailwindcss.com/docs
- **shadcn/ui 组件库**：https://ui.shadcn.com
- **Framer Motion 文档**：https://www.framer.com/motion

---

## 💡 开发建议

1. **循序渐进**：先实现基础功能（素材展示、相册列表），再添加炫酷效果
2. **组件复用**：优先提取可复用组件（Card、Grid、Lightbox）
3. **性能优化**：后续再考虑虚拟滚动、图片懒加载等优化
4. **移动端适配**：桌面版完成后再适配移动端

---

## 🤝 需要帮助？

如果你在实现过程中遇到问题，可以：
1. 查看完整架构文档中的组件示例代码
2. 询问具体的技术实现细节
3. 请求生成特定组件的完整代码

**祝开发顺利！🚀**
