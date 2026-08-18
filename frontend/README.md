# LumiHarbor Frontend - 拾光坞前端

个人生活素材管理系统的前端应用。

## 技术栈

- **框架**: Next.js 16 (App Router) + TypeScript
- **样式**: Tailwind CSS + 自定义深色主题
- **图标**: lucide-react
- **字体**: Space Grotesk (英文标题) + Noto Sans SC (中文正文)
- **动画**: GSAP
- **状态管理**: TanStack Query
- **HTTP 客户端**: Axios

## 项目结构

```
frontend/
├── app/                      # Next.js App Router
│   ├── (main)/              # 主应用路由组
│   │   ├── layout.tsx       # 主布局（包含 Dock 导航）
│   │   └── page.tsx         # 首页（三个垂直滚动区域）
│   ├── layout.tsx           # 根布局（字体 + Providers）
│   ├── globals.css          # 全局样式
│   └── providers.tsx        # React Query Provider
├── components/
│   ├── layout/
│   │   └── DockNavigation.tsx    # 右侧 Dock 导航栏
│   └── home/
│       ├── DomeGallery.tsx
│       ├── DomeGalleryContainer.tsx
│       ├── HomeFootprintPreview.tsx
│       ├── TimelineEvent.tsx
│       └── Timeline.tsx
├── lib/
│   ├── api/
│   │   ├── types.ts         # TypeScript 类型定义
│   │   ├── client.ts        # Axios 实例
│   │   └── home.ts          # 首页 API
│   └── utils/
│       └── cn.ts            # Tailwind 类名合并工具
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.mjs
├── postcss.config.mjs
└── .env.local
```

## 快速开始

### 1. 安装依赖

```bash
cd frontend
npm install
```

### 2. 配置环境变量

编辑 `.env.local` 文件：

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 3. 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

## 功能特性

### 首页三大区域

1. **精选照片墙** (Bento Grid)
   - 3x3 不规则网格布局
   - 卡片尺寸：小 (1x1)、中 (1x2)、大 (2x2)
   - Hover 效果：图片缩放 + 渐变遮罩显示元数据
   - 支持图片和视频类型标识

2. **足迹地图预览**
   - 高德 2D 预览，进入 `/map` 看完整足迹

3. **大事记时间轴**
   - 按年份分组显示
   - 垂直时间线 + 渐变效果
   - 事件卡片 Hover 展开详情
   - 显示照片数量、视频数量、位置信息

### 右侧 Dock 导航

- 始终可见（非 Hover 显示）
- macOS 风格交互：Hover 时左移 + 放大
- 7 个导航项：首页、素材、相册、笔记、标签、设置、关于
- 快捷键提示 Tooltip
- 活动状态：渐变背景 + 左侧指示条

### 隐藏式搜索（设计已完成，待实现）

- 快捷键唤醒：`Cmd+K` 或 `/`
- Spotlight 风格全屏搜索
- 模糊搜索素材、相册、笔记

## 当前状态

### ✅ 已完成

- 基础框架搭建（Next.js + TypeScript + Tailwind）
- 字体配置（Space Grotesk + Noto Sans SC）
- 深色主题配置
- 右侧 Dock 导航栏
- 精选照片墙（Dome Gallery）
- 足迹地图预览（高德 2D）
- 大事记时间轴

功能与接线以 [`docs/design`](./docs/design/00-架构总览.md) 为准。

## 后端 API 接口要求

### 1. 获取精选素材

```typescript
GET /api/home/featured?limit=9

Response:
{
  "success": true,
  "data": [
    {
      "id": 1,
      "type": "image" | "video" | "audio",
      "thumbnailUrl": "string",
      "originalUrl": "string",
      "shotAt": "2024-01-15T10:30:00Z",
      "location": {
        "latitude": 31.2304,
        "longitude": 121.4737,
        "name": "上海"
      },
      "tags": ["旅行", "风景"],
      "aiScore": 0.95
    }
  ]
}
```

### 2. 获取足迹位置

```typescript
GET /api/home/locations

Response:
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "上海",
      "latitude": 31.2304,
      "longitude": 121.4737,
      "photoCount": 156,
      "videoCount": 23,
      "firstVisit": "2023-06-15T00:00:00Z",
      "lastVisit": "2024-01-20T00:00:00Z"
    }
  ]
}
```

### 3. 获取大事记时间轴

```typescript
GET /api/home/timeline?limit=10

Response:
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "日本之旅",
      "description": "东京-大阪-京都七日游",
      "startDate": "2024-01-15T00:00:00Z",
      "endDate": "2024-01-21T23:59:59Z",
      "coverUrl": "string",
      "location": "日本",
      "photoCount": 234,
      "videoCount": 12,
      "tags": ["旅行", "家庭"]
    }
  ]
}
```

## 开发命令

```bash
# 开发模式
npm run dev

# 生产构建
npm run build

# 启动生产服务器
npm start

# 代码检查
npm run lint
```

## 设计规范

### 颜色

- **背景**:
  - 主背景: `#0a0a0a`
  - 次背景: `#1a1a1a`
  - 三级背景: `#2a2a2a`
- **前景**:
  - 主文本: `#ffffff`
  - 次文本: `#a0a0a0`
  - 三级文本: `#707070`
- **主题色**:
  - 主色: `#3b82f6` (蓝色)
  - Hover: `#2563eb`
  - 辅助色: 紫色 `#8b5cf6`、粉色 `#ec4899`、绿色 `#10b981`

### 字体

- **英文/标题**: Space Grotesk (font-heading)
- **中文/正文**: Noto Sans SC (font-sans)

### 动画

- `fade-in`: 0.3s 淡入
- `slide-up`: 0.4s 上滑淡入
- `scale-in`: 0.3s 缩放淡入

### 图标

- **库**: lucide-react

- **尺寸**: 24px (导航栏)

## 注意事项

1. **仅支持桌面端**：无移动端适配
2. **Mock 数据**：当前使用 picsum.photos 作为占位图，需替换为真实后端接口
3. **3D 性能**：Three.js 可能占用较高 GPU 资源，建议使用现代浏览器
4. **字体加载**：使用 next/font 自动优化字体加载，首次加载可能较慢

## License

Private Project
