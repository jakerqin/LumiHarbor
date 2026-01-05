# LumiHarbor 前端架构设计文档

> **版本**: v1.0.0
> **日期**: 2026-01-05
> **作者**: AI Assistant
> **状态**: 设计阶段

---

## 📋 目录

1. [技术栈选型](#技术栈选型)
2. [项目结构](#项目结构)
3. [页面路由设计](#页面路由设计)
4. [核心组件拆分](#核心组件拆分)
5. [状态管理策略](#状态管理策略)
6. [设计系统规范](#设计系统规范)
7. [性能优化策略](#性能优化策略)
8. [开发路线图](#开发路线图)

---

## 🛠️ 技术栈选型

### 核心框架

| 技术 | 版本 | 用途 | 选型理由 |
|------|------|------|----------|
| **Next.js** | 14+ | React 框架 | • App Router + SSR<br>• next/image 图片优化<br>• 文件路由系统<br>• 与后端 API 集成 |
| **React** | 18+ | UI 库 | • 组件化开发<br>• 生态成熟<br>• Hooks + Suspense |
| **TypeScript** | 5+ | 类型系统 | • 类型安全<br>• IDE 支持<br>• 重构友好 |

### UI 组件库

| 技术 | 用途 | 选型理由 |
|------|------|----------|
| **Tailwind CSS** | 原子化 CSS | • 快速开发<br>• 高度可定制<br>• 响应式友好 |
| **shadcn/ui** | 组件库 | • 基于 Radix UI<br>• 完全可定制<br>• 无依赖包袱<br>• 支持深色模式 |
| **Lucide Icons** | 图标库 | • 现代简洁<br>• Tree-shaking 友好 |

### 动画与交互

| 技术 | 用途 | 选型理由 |
|------|------|----------|
| **Framer Motion** | 动画库 | • 声明式 API<br>• 手势支持<br>• 页面过渡<br>• 性能优化 |
| **React Three Fiber** | 3D 渲染 | • React 化的 Three.js<br>• 用于地图 3D 效果<br>• 轻量级集成 |
| **@react-three/drei** | 3D 工具库 | • 常用 3D 组件<br>• 相机控制<br>• 加载器 |

### 数据管理

| 技术 | 用途 | 选型理由 |
|------|------|----------|
| **Zustand** | 状态管理 | • 轻量级（<1KB）<br>• 无 boilerplate<br>• TypeScript 友好<br>• 适合轻量级应用 |
| **TanStack Query** | 服务端状态管理 | • 缓存机制<br>• 自动重试<br>• 乐观更新<br>• 与后端 API 集成 |
| **Axios** | HTTP 客户端 | • 请求拦截<br>• 错误处理<br>• 取消请求 |

### 地图与地理

| 技术 | 用途 | 选型理由 |
|------|------|----------|
| **Mapbox GL JS** | 2D 地图 | • 高性能<br>• 自定义样式<br>• GPS 数据展示 |
| **react-map-gl** | React 地图组件 | • React 封装<br>• Hooks 支持 |

### 表单与验证

| 技术 | 用途 | 选型理由 |
|------|------|----------|
| **React Hook Form** | 表单管理 | • 高性能（无重渲染）<br>• 简洁 API<br>• TypeScript 支持 |
| **Zod** | Schema 验证 | • 类型推导<br>• 与 React Hook Form 集成 |

### 工具链

| 技术 | 用途 |
|------|------|
| **ESLint** | 代码检查 |
| **Prettier** | 代码格式化 |
| **Husky** | Git Hooks |
| **lint-staged** | 暂存文件检查 |

---

## 📁 项目结构

```
frontend/
├── public/                      # 静态资源
│   ├── fonts/                   # 字体文件
│   └── images/                  # 图片资源
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── (auth)/              # 认证路由组
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── (main)/              # 主应用路由组
│   │   │   ├── page.tsx         # 首页
│   │   │   ├── assets/          # 素材库
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/
│   │   │   ├── albums/          # 相册
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/
│   │   │   ├── notes/           # 笔记
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/
│   │   │   ├── map/             # 地图
│   │   │   │   └── page.tsx
│   │   │   └── search/          # 搜索
│   │   │       └── page.tsx
│   │   ├── layout.tsx           # 根布局
│   │   ├── globals.css          # 全局样式
│   │   └── providers.tsx        # 全局 Provider
│   ├── components/              # 组件
│   │   ├── ui/                  # shadcn/ui 基础组件
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   └── ...
│   │   ├── layout/              # 布局组件
│   │   │   ├── DockNavigation.tsx    # 底部 Dock 导航
│   │   │   ├── SearchBar.tsx         # 搜索栏
│   │   │   └── MobileTabBar.tsx      # 移动端底部 Tab
│   │   ├── home/                # 首页组件
│   │   │   ├── HeroSection.tsx       # 主视觉区域
│   │   │   ├── BentoGrid.tsx         # Bento Grid 布局
│   │   │   ├── MapView3D.tsx         # 3D 地图视图
│   │   │   └── RecentActivityFeed.tsx # 最近动态流
│   │   ├── assets/              # 素材相关组件
│   │   │   ├── AssetGrid.tsx         # 素材网格
│   │   │   ├── AssetCard.tsx         # 素材卡片
│   │   │   ├── AssetViewer.tsx       # 素材查看器
│   │   │   └── AssetUploader.tsx     # 上传组件
│   │   ├── albums/              # 相册相关组件
│   │   │   ├── AlbumGrid.tsx         # 相册网格
│   │   │   ├── AlbumCard.tsx         # 相册卡片
│   │   │   └── AlbumEditor.tsx       # 相册编辑器
│   │   ├── notes/               # 笔记相关组件
│   │   │   ├── NoteCard.tsx          # 笔记卡片
│   │   │   ├── NoteEditor.tsx        # Markdown 编辑器
│   │   │   └── NoteTimeline.tsx      # 笔记时间轴
│   │   ├── map/                 # 地图相关组件
│   │   │   ├── InteractiveMap.tsx    # 交互式地图
│   │   │   ├── MapMarker.tsx         # 地图标记
│   │   │   └── MapCluster.tsx        # 标记聚合
│   │   └── shared/              # 共享组件
│   │       ├── ImageLightbox.tsx     # 图片灯箱
│   │       ├── VideoPlayer.tsx       # 视频播放器
│   │       ├── LoadingSpinner.tsx    # 加载动画
│   │       └── EmptyState.tsx        # 空状态
│   ├── hooks/                   # 自定义 Hooks
│   │   ├── useAssets.ts         # 素材数据 Hook
│   │   ├── useAlbums.ts         # 相册数据 Hook
│   │   ├── useNotes.ts          # 笔记数据 Hook
│   │   ├── useDockVisibility.ts # Dock 可见性控制
│   │   ├── useMediaQuery.ts     # 响应式检测
│   │   └── useDebounce.ts       # 防抖 Hook
│   ├── lib/                     # 工具库
│   │   ├── api/                 # API 请求
│   │   │   ├── client.ts        # Axios 实例
│   │   │   ├── assets.ts        # 素材 API
│   │   │   ├── albums.ts        # 相册 API
│   │   │   ├── notes.ts         # 笔记 API
│   │   │   └── types.ts         # API 类型定义
│   │   ├── utils/               # 工具函数
│   │   │   ├── cn.ts            # className 合并
│   │   │   ├── date.ts          # 日期格式化
│   │   │   ├── file.ts          # 文件处理
│   │   │   └── image.ts         # 图片处理
│   │   └── constants.ts         # 常量定义
│   ├── store/                   # Zustand Store
│   │   ├── useAppStore.ts       # 全局状态
│   │   ├── useUserStore.ts      # 用户状态
│   │   └── useUIStore.ts        # UI 状态（Dock 显示等）
│   ├── styles/                  # 样式文件
│   │   ├── themes/              # 主题配置
│   │   │   ├── dark.css
│   │   │   └── light.css
│   │   └── animations.css       # 自定义动画
│   └── types/                   # TypeScript 类型
│       ├── models.ts            # 数据模型
│       ├── api.ts               # API 类型
│       └── ui.ts                # UI 类型
├── .env.local                   # 环境变量
├── next.config.js               # Next.js 配置
├── tailwind.config.ts           # Tailwind 配置
├── tsconfig.json                # TypeScript 配置
└── package.json                 # 依赖配置
```

---

## 🧭 页面路由设计

### 路由表

| 路径 | 页面 | 组件 | 说明 |
|------|------|------|------|
| `/` | 首页 | `app/(main)/page.tsx` | 智能精选内容展示 |
| `/assets` | 素材库 | `app/(main)/assets/page.tsx` | 瀑布流展示所有素材 |
| `/assets/:id` | 素材详情 | `app/(main)/assets/[id]/page.tsx` | 全屏查看 + 元数据 |
| `/albums` | 相册列表 | `app/(main)/albums/page.tsx` | 网格展示所有相册 |
| `/albums/:id` | 相册详情 | `app/(main)/albums/[id]/page.tsx` | 相册内素材展示 |
| `/notes` | 笔记列表 | `app/(main)/notes/page.tsx` | 卡片式/时间轴式 |
| `/notes/:id` | 笔记详情 | `app/(main)/notes/[id]/page.tsx` | 笔记查看 + 编辑 |
| `/map` | 地图视图 | `app/(main)/map/page.tsx` | 足迹地图 + 素材标记 |
| `/search` | 全局搜索 | `app/(main)/search/page.tsx` | 全屏搜索界面 |
| `/login` | 登录 | `app/(auth)/login/page.tsx` | 用户登录 |
| `/register` | 注册 | `app/(auth)/register/page.tsx` | 用户注册 |

### 路由组说明

- **(auth)**: 认证相关页面，无主导航栏
- **(main)**: 主应用页面，包含 Dock 导航和搜索栏

---

## 🧩 核心组件拆分

### 1. 首页组件（Home Page）

```typescript
// app/(main)/page.tsx
export default function HomePage() {
  const [displayMode, setDisplayMode] = useState<'bento' | 'map' | 'feed'>('bento');

  return (
    <div className="relative h-screen w-full">
      {/* 顶部搜索栏 */}
      <SearchBar />

      {/* 主内容区域 */}
      <main className="h-full w-full">
        {displayMode === 'bento' && <BentoGrid />}
        {displayMode === 'map' && <MapView3D />}
        {displayMode === 'feed' && <RecentActivityFeed />}
      </main>

      {/* 模式切换按钮 */}
      <ModeSwitcher
        mode={displayMode}
        onChange={setDisplayMode}
      />

      {/* 底部 Dock 导航 */}
      <DockNavigation />
    </div>
  );
}
```

#### 1.1 BentoGrid 组件
```typescript
// components/home/BentoGrid.tsx
export function BentoGrid() {
  const { data: featuredAssets } = useQuery({
    queryKey: ['featured-assets'],
    queryFn: () => api.assets.getFeatured(9), // AI 挑选 9 张高分素材
  });

  return (
    <motion.div
      className="grid grid-cols-3 grid-rows-3 gap-4 p-8 h-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {featuredAssets?.map((asset, index) => (
        <BentoCard
          key={asset.id}
          asset={asset}
          size={getBentoSize(index)} // 不规则尺寸
        />
      ))}
    </motion.div>
  );
}
```

#### 1.2 MapView3D 组件
```typescript
// components/home/MapView3D.tsx
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

export function MapView3D() {
  const { data: locations } = useQuery({
    queryKey: ['asset-locations'],
    queryFn: api.assets.getLocations,
  });

  return (
    <Canvas camera={{ position: [0, 0, 5] }}>
      <ambientLight intensity={0.5} />
      <OrbitControls enableZoom={true} />
      <Globe locations={locations} />
    </Canvas>
  );
}
```

### 2. Dock 导航组件

```typescript
// components/layout/DockNavigation.tsx
import { motion, AnimatePresence } from 'framer-motion';

const dockItems = [
  { icon: Home, label: '首页', href: '/', shortcut: 'H' },
  { icon: Image, label: '素材', href: '/assets', shortcut: 'A' },
  { icon: BookOpen, label: '笔记', href: '/notes', shortcut: 'N' },
  { icon: Map, label: '地图', href: '/map', shortcut: 'M' },
  { icon: FolderOpen, label: '相册', href: '/albums', shortcut: 'L' },
  { icon: Search, label: '搜索', href: '/search', shortcut: 'K' },
  { icon: Settings, label: '设置', href: '/settings', shortcut: ',' },
];

export function DockNavigation() {
  const [isVisible, setIsVisible] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const pathname = usePathname();

  // 监听鼠标移动到底部触发
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
          <div className="flex items-end gap-2 px-6 py-4 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
            {dockItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              const magneticEffect = getMagneticEffect(index, hoveredIndex);

              return (
                <motion.div
                  key={item.href}
                  animate={magneticEffect}
                  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                  onHoverStart={() => setHoveredIndex(index)}
                  onHoverEnd={() => setHoveredIndex(null)}
                >
                  <Link href={item.href}>
                    <motion.div
                      className="relative flex flex-col items-center"
                      whileHover={{ scale: 1.25, y: -8 }}
                    >
                      <div className="w-14 h-14 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                        <Icon className="w-6 h-6 text-white" />
                      </div>

                      {/* 工具提示 */}
                      <AnimatePresence>
                        {hoveredIndex === index && (
                          <motion.div
                            className="absolute -top-12 bg-black/80 text-white text-xs px-2 py-1 rounded"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 5 }}
                          >
                            {item.label}
                            <kbd className="ml-1 text-gray-400">⌘{item.shortcut}</kbd>
                          </motion.div>
                        )}
                      </AnimatePresence>

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

// 磁力效果计算
function getMagneticEffect(index: number, hoveredIndex: number | null) {
  if (hoveredIndex === null) return { y: 0, scale: 1 };
  const distance = Math.abs(index - hoveredIndex);
  if (distance === 0) return { y: -8, scale: 1.25 };
  if (distance === 1) return { y: -4, scale: 1.1 };
  return { y: 0, scale: 1 };
}
```

### 3. 素材网格组件

```typescript
// components/assets/AssetGrid.tsx
import Masonry from 'react-masonry-css';

export function AssetGrid({ assets }: { assets: Asset[] }) {
  return (
    <Masonry
      breakpointCols={{ default: 4, 1536: 3, 1024: 2, 640: 1 }}
      className="flex gap-4 w-full"
      columnClassName="space-y-4"
    >
      {assets.map((asset) => (
        <AssetCard key={asset.id} asset={asset} />
      ))}
    </Masonry>
  );
}
```

### 4. 相册网格组件（Apple 风格）

```typescript
// components/albums/AlbumGrid.tsx
export function AlbumGrid({ albums }: { albums: Album[] }) {
  return (
    <div className="grid grid-cols-4 gap-6 p-8">
      {albums.map((album) => (
        <AlbumCard key={album.id} album={album} />
      ))}
    </div>
  );
}

// components/albums/AlbumCard.tsx
export function AlbumCard({ album }: { album: Album }) {
  return (
    <motion.div
      className="group cursor-pointer"
      whileHover={{ scale: 1.05 }}
      transition={{ type: 'spring', stiffness: 300 }}
    >
      <div className="relative aspect-square rounded-2xl overflow-hidden">
        {/* 封面图 */}
        <Image
          src={album.coverUrl}
          alt={album.name}
          fill
          className="object-cover group-hover:scale-110 transition-transform duration-300"
        />

        {/* 悬停时显示统计信息 */}
        <motion.div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center"
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
        >
          <div className="text-white text-center">
            <p className="text-4xl font-bold">{album.assetCount}</p>
            <p className="text-sm">张照片</p>
          </div>
        </motion.div>
      </div>

      {/* 相册名称 */}
      <div className="mt-2">
        <h3 className="font-medium text-lg">{album.name}</h3>
        <p className="text-sm text-gray-500">
          {formatDateRange(album.startTime, album.endTime)}
        </p>
      </div>
    </motion.div>
  );
}
```

---

## 🗄️ 状态管理策略

### 1. 全局状态（Zustand）

```typescript
// store/useAppStore.ts
interface AppState {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}

export const useAppStore = create<AppState>((set) => ({
  theme: 'dark',
  setTheme: (theme) => set({ theme }),
}));
```

### 2. UI 状态（Zustand）

```typescript
// store/useUIStore.ts
interface UIState {
  isDockVisible: boolean;
  setDockVisible: (visible: boolean) => void;

  isSearchOpen: boolean;
  setSearchOpen: (open: boolean) => void;

  viewMode: 'grid' | 'list' | 'masonry';
  setViewMode: (mode: 'grid' | 'list' | 'masonry') => void;
}

export const useUIStore = create<UIState>((set) => ({
  isDockVisible: false,
  setDockVisible: (visible) => set({ isDockVisible: visible }),

  isSearchOpen: false,
  setSearchOpen: (open) => set({ isSearchOpen: open }),

  viewMode: 'masonry',
  setViewMode: (mode) => set({ viewMode: mode }),
}));
```

### 3. 服务端状态（TanStack Query）

```typescript
// hooks/useAssets.ts
export function useAssets(filters?: AssetFilters) {
  return useQuery({
    queryKey: ['assets', filters],
    queryFn: () => api.assets.list(filters),
    staleTime: 5 * 60 * 1000, // 5 分钟
  });
}

export function useAsset(id: string) {
  return useQuery({
    queryKey: ['asset', id],
    queryFn: () => api.assets.get(id),
  });
}

export function useUploadAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.assets.upload,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });
}
```

---

## 🎨 设计系统规范

### 1. 颜色系统

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        // 深色主题（主色调）
        background: {
          DEFAULT: '#0a0a0a',
          secondary: '#1a1a1a',
          tertiary: '#2a2a2a',
        },

        // 文字颜色
        foreground: {
          DEFAULT: '#ffffff',
          secondary: '#a0a0a0',
          tertiary: '#707070',
        },

        // 强调色（科技蓝）
        primary: {
          DEFAULT: '#3b82f6',
          hover: '#2563eb',
          light: '#60a5fa',
        },

        // 辅助色（霓虹色系）
        accent: {
          blue: '#3b82f6',
          purple: '#8b5cf6',
          pink: '#ec4899',
          green: '#10b981',
        },

        // 玻璃态效果
        glass: {
          DEFAULT: 'rgba(255, 255, 255, 0.1)',
          hover: 'rgba(255, 255, 255, 0.15)',
        },
      },
    },
  },
};
```

### 2. 排版系统

```css
/* styles/globals.css */
@layer base {
  /* 标题 */
  h1 { @apply text-5xl font-bold tracking-tight; }
  h2 { @apply text-4xl font-semibold; }
  h3 { @apply text-2xl font-medium; }
  h4 { @apply text-xl font-medium; }

  /* 正文 */
  p { @apply text-base leading-relaxed; }

  /* 小字 */
  .text-small { @apply text-sm text-foreground-secondary; }
}
```

### 3. 间距系统

遵循 8px 基准：
- 极小：4px (space-1)
- 小：8px (space-2)
- 中：16px (space-4)
- 大：24px (space-6)
- 极大：32px (space-8)

### 4. 圆角系统

```typescript
rounded-sm: 4px   // 小圆角（按钮）
rounded-md: 8px   // 中圆角（卡片）
rounded-lg: 12px  // 大圆角（弹窗）
rounded-xl: 16px  // 超大圆角（相册卡片）
rounded-2xl: 24px // 极大圆角（Dock）
```

### 5. 阴影系统

```css
/* 毛玻璃阴影 */
.shadow-glass {
  box-shadow:
    0 8px 32px 0 rgba(31, 38, 135, 0.37),
    inset 0 0 0 1px rgba(255, 255, 255, 0.1);
}

/* 发光效果 */
.glow-blue {
  box-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
}
```

### 6. 动画系统

```typescript
// styles/animations.css
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slide-up {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

@keyframes scale-in {
  from { transform: scale(0.9); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

/* 使用 */
.animate-fade-in { animation: fade-in 0.3s ease-out; }
.animate-slide-up { animation: slide-up 0.4s ease-out; }
.animate-scale-in { animation: scale-in 0.3s ease-out; }
```

---

## ⚡ 性能优化策略

### 1. 图片优化

```typescript
// 使用 next/image
import Image from 'next/image';

<Image
  src={asset.thumbnailUrl}
  alt={asset.name}
  width={400}
  height={400}
  quality={80}
  placeholder="blur"
  blurDataURL={asset.blurHash}
  loading="lazy"
/>
```

### 2. 代码分割

```typescript
// 动态导入重组件
const MapView3D = dynamic(() => import('@/components/home/MapView3D'), {
  ssr: false,
  loading: () => <LoadingSpinner />,
});

const VideoPlayer = dynamic(() => import('@/components/shared/VideoPlayer'), {
  loading: () => <Skeleton />,
});
```

### 3. 虚拟滚动

```typescript
// 使用 react-window 处理大量素材
import { FixedSizeGrid } from 'react-window';

export function VirtualAssetGrid({ assets }: { assets: Asset[] }) {
  return (
    <FixedSizeGrid
      columnCount={4}
      columnWidth={300}
      height={800}
      rowCount={Math.ceil(assets.length / 4)}
      rowHeight={350}
      width={1200}
    >
      {({ columnIndex, rowIndex, style }) => {
        const index = rowIndex * 4 + columnIndex;
        const asset = assets[index];
        return asset ? (
          <div style={style}>
            <AssetCard asset={asset} />
          </div>
        ) : null;
      }}
    </FixedSizeGrid>
  );
}
```

### 4. 缓存策略

```typescript
// TanStack Query 缓存配置
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 分钟
      cacheTime: 10 * 60 * 1000, // 10 分钟
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
```

### 5. 预加载策略

```typescript
// 预加载下一页数据
export function useAssetsPrefetch(currentPage: number) {
  const queryClient = useQueryClient();

  useEffect(() => {
    queryClient.prefetchQuery({
      queryKey: ['assets', { page: currentPage + 1 }],
      queryFn: () => api.assets.list({ page: currentPage + 1 }),
    });
  }, [currentPage, queryClient]);
}
```

---

## 🗺️ 开发路线图

### 阶段 1：基础框架搭建（1-2 周）

**目标**：搭建项目骨架，完成基础配置

- [ ] 初始化 Next.js 项目
- [ ] 安装配置 Tailwind CSS + shadcn/ui
- [ ] 配置 TypeScript + ESLint + Prettier
- [ ] 搭建路由结构（App Router）
- [ ] 配置 API 客户端（Axios + TanStack Query）
- [ ] 实现用户认证（登录/注册）
- [ ] 配置环境变量和构建流程

**产出**：可运行的项目骨架 + 登录页面

---

### 阶段 2：核心页面开发（2-3 周）

**目标**：实现核心功能页面（素材、相册、笔记）

#### 2.1 素材库页面
- [ ] 实现瀑布流布局（react-masonry-css）
- [ ] 实现素材卡片组件（悬停效果）
- [ ] 实现全屏查看器（Lightbox）
- [ ] 实现素材上传功能
- [ ] 实现筛选功能（时间、类型、标签）

#### 2.2 相册页面
- [ ] 实现相册网格布局（Apple 风格）
- [ ] 实现相册卡片组件（悬停统计）
- [ ] 实现相册详情页（素材展示）
- [ ] 实现创建/编辑相册功能

#### 2.3 笔记页面
- [ ] 实现笔记卡片列表
- [ ] 实现 Markdown 编辑器（TipTap 或 react-markdown）
- [ ] 实现时间轴视图切换
- [ ] 实现笔记创建/编辑功能

**产出**：完整的素材、相册、笔记功能

---

### 阶段 3：首页与导航（1-2 周）

**目标**：实现炫酷的首页和隐藏式导航

- [ ] 实现 Bento Grid 布局（智能精选）
- [ ] 实现底部 Dock 导航（hover 显示 + 磁力效果）
- [ ] 实现顶部搜索栏（半透明悬浮）
- [ ] 实现首页模式切换（Bento Grid / 地图 / 动态流）
- [ ] 实现移动端 Tab Bar 适配
- [ ] 实现全局快捷键（Cmd+K 搜索等）

**产出**：完整的首页 + 导航系统

---

### 阶段 4：高级功能（2-3 周）

**目标**：实现地图视图和搜索功能

#### 4.1 地图视图
- [ ] 集成 Mapbox GL JS
- [ ] 实现 2D 地图 + GPS 标记
- [ ] 实现标记聚合（MapCluster）
- [ ] 实现点击标记查看素材
- [ ] （可选）实现 3D 地球视图（React Three Fiber）

#### 4.2 全局搜索
- [ ] 实现全屏搜索界面（Cmd+K 触发）
- [ ] 实现实时搜索（防抖）
- [ ] 实现多维度搜索（关键字、日期、地点、标签）
- [ ] 实现搜索历史记录
- [ ] 实现快捷命令（如 `/map`）

**产出**：地图视图 + 全局搜索功能

---

### 阶段 5：优化与完善（1-2 周）

**目标**：性能优化、细节打磨

- [ ] 图片懒加载 + BlurHash 优化
- [ ] 虚拟滚动优化（大量素材）
- [ ] 动画性能优化（减少重渲染）
- [ ] 响应式适配（平板、手机）
- [ ] 深色模式 / 浅色模式切换
- [ ] 错误边界 + 错误处理
- [ ] 单元测试（核心组件）
- [ ] E2E 测试（关键流程）

**产出**：优化后的生产版本

---

### 阶段 6：高级特性（可选，按需开发）

- [ ] AI 自动相册生成（基于规则）
- [ ] 时光轴视图（笔记 + 素材混合）
- [ ] "那年今日"功能
- [ ] 日历视图
- [ ] 分享功能（生成分享链接）
- [ ] PWA 支持（离线访问）
- [ ] 国际化（i18n）

---

## 📦 依赖清单

### 核心依赖

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "typescript": "^5.3.0",

    // UI 库
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-slot": "^1.0.2",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0",
    "lucide-react": "^0.309.0",

    // 动画
    "framer-motion": "^10.18.0",

    // 3D
    "@react-three/fiber": "^8.15.0",
    "@react-three/drei": "^9.95.0",
    "three": "^0.160.0",

    // 数据管理
    "zustand": "^4.4.7",
    "@tanstack/react-query": "^5.17.0",
    "axios": "^1.6.5",

    // 地图
    "mapbox-gl": "^3.0.1",
    "react-map-gl": "^7.1.7",

    // 表单
    "react-hook-form": "^7.49.3",
    "zod": "^3.22.4",
    "@hookform/resolvers": "^3.3.4",

    // 工具
    "date-fns": "^3.0.6",
    "react-masonry-css": "^1.0.16",
    "react-window": "^1.8.10"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "@types/react": "^18.2.48",
    "@types/react-dom": "^18.2.18",
    "autoprefixer": "^10.4.17",
    "eslint": "^8.56.0",
    "eslint-config-next": "^14.0.0",
    "postcss": "^8.4.33",
    "prettier": "^3.1.1",
    "tailwindcss": "^3.4.1"
  }
}
```

---

## 🎯 总结

### 核心设计原则

1. **极简聚焦**：首页简洁，内容为王
2. **科技感**：Apple Vision Pro 风格 + 毛玻璃效果 + 轻量级动画
3. **性能优先**：图片优化 + 虚拟滚动 + 代码分割
4. **响应式**：桌面、平板、手机全适配
5. **可扩展**：模块化组件 + 灵活架构

### 技术亮点

- ✅ Next.js 14 App Router + SSR
- ✅ Tailwind CSS + shadcn/ui（高度可定制）
- ✅ Framer Motion（流畅动画）
- ✅ React Three Fiber（3D 地图）
- ✅ TanStack Query（智能缓存）
- ✅ Zustand（轻量级状态管理）

### 下一步行动

1. **确认设计方案**：首页展示方案（推荐方案 D）+ 底部 Dock 导航
2. **初始化项目**：创建 Next.js 项目并配置基础工具链
3. **实现 MVP**：素材库 + 相册 + 笔记基础功能
4. **迭代优化**：首页炫酷效果 + 地图视图 + 搜索功能

---

**文档版本**: v1.0.0
**最后更新**: 2026-01-05
**维护者**: AI Assistant
