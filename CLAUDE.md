# LumiHarbor (拾光坞) - Claude 协作指南

## 项目概述

**LumiHarbor (拾光坞)** 是一个个人生活素材管理系统，用于管理照片、视频等多媒体素材。系统采用前后端分离架构，支持本地文件系统扫描导入、智能元数据提取、感知哈希相似度搜索等功能。

### 技术栈

**后端：**
- **语言**: Python 3.12.9
- **框架**: FastAPI + SQLAlchemy + Pydantic
- **异步任务**: Taskiq + Redis
- **数据库**: MySQL 8.0
- **元数据提取**: exifread (图片) + ffmpeg (视频)
- **图像处理**: Pillow + imagehash
- **缩略图**: WebP 格式

**前端：**
- **框架**: Next.js 14 (App Router) + TypeScript
- **样式**: Tailwind CSS + 自定义深色主题
- **图标**: Phosphor Icons (Duotone 风格)
- **字体**: Space Grotesk (英文) + Noto Sans SC (中文)
- **3D 渲染**: React Three Fiber + @react-three/drei
- **动画**: Framer Motion
- **状态管理**: TanStack Query (服务端) + Zustand (客户端)
- **HTTP 客户端**: Axios

---

## 前端功能模块

### 1. 首页 (Homepage)

**位置**: `frontend/app/(main)/page.tsx`

**三大垂直滚动区域**:

#### 1.1 精选照片墙 (Bento Grid)
- **组件**: [BentoGrid.tsx](frontend/components/home/BentoGrid.tsx)
- **布局**: 3x3 不规则网格，卡片尺寸：小 (1x1)、中 (1x2)、大 (2x2)
- **特性**: Hover 图片缩放 + 渐变遮罩显示元数据
- **API**: `GET /api/home/featured?limit=9`

#### 1.2 3D 足迹地图
- **组件**: [MapView3D.tsx](frontend/components/home/MapView3D.tsx) + [Globe3D.tsx](frontend/components/home/Globe3D.tsx)
- **渲染**: React Three Fiber + 位置标记组件
- **特性**: 自动旋转 + 用户交互控制 + 统计面板
- **API**: `GET /api/home/locations`

#### 1.3 大事记时间轴
- **组件**: [Timeline.tsx](frontend/components/home/Timeline.tsx) + [TimelineEvent.tsx](frontend/components/home/TimelineEvent.tsx)
- **特性**: 按年份分组 + 垂直时间线 + 事件卡片 Hover 展开
- **API**: `GET /api/home/timeline?limit=10`

### 2. Spotlight 全局搜索

**位置**: `frontend/components/search/SpotlightSearch.tsx`

**功能**:
- 快捷键唤醒: `Cmd+K` / `Ctrl+K` / `/`
- 全局搜索: 素材、相册、笔记三类内容
- 键盘导航: 上下箭头选择，回车跳转
- 模糊搜索: 300ms 防抖
- API: `GET /api/search?q=keyword`

### 3. 素材库 (Assets)

**位置**: `frontend/app/(main)/assets/page.tsx`

**功能特性**:
- **网格展示**: 5 列响应式布局，每页 30 个素材
- **筛选器**: [AssetFilter.tsx](frontend/components/assets/AssetFilter.tsx)
  - 类型筛选: 图片/视频
  - 地点筛选: 8 个城市选项
  - 标签筛选: 多标签选择
  - 排序方式: 拍摄时间/添加时间/AI 评分
- **卡片组件**: [AssetCard.tsx](frontend/components/assets/AssetCard.tsx)
  - Hover 效果: 图片缩放 + 信息遮罩
  - 视频标识 + AI 精选标签
- **分页**: 5 页按钮 + 上一页/下一页

**API**:
- `GET /api/assets?page=1&pageSize=30&type=image&location=上海`
- `GET /api/assets/tags` - 获取所有标签
- `GET /api/assets/locations` - 获取所有地点

### 4. 相册 (Albums)

**位置**: `frontend/app/(main)/albums/`

**功能特性**:
- **相册列表**: [page.tsx](frontend/app/(main)/albums/page.tsx)
  - 4 列网格布局
  - 相册卡片: 16:10 封面 + 数量统计 + 时间范围
- **相册详情**: [albums/[id]/page.tsx](frontend/app/(main)/albums/[id]/page.tsx)
  - 全屏封面展示
  - 相册信息: 日期、地点、照片数量
  - 素材网格: 5 列布局

**API**:
- `GET /api/albums?page=1&pageSize=20`
- `GET /api/albums/:id`
- `POST /api/albums` - 创建相册

### 5. 笔记 (Notes)

**位置**: `frontend/app/(main)/notes/page.tsx`

**功能特性**:
- **双视图模式**:
  - 网格视图: [NoteGrid.tsx](frontend/components/notes/NoteGrid.tsx) - 3 列网格
  - 时间轴视图: [NoteTimeline.tsx](frontend/components/notes/NoteTimeline.tsx) - 按月份分组
- **笔记卡片**: [NoteCard.tsx](frontend/components/notes/NoteCard.tsx)
  - 支持封面图 + 标题 + 内容预览 + 多标签
- **视图切换**: 一键切换网格/时间轴

**API**:
- `GET /api/notes?page=1&pageSize=20`
- `GET /api/notes/:id`
- `POST /api/notes` - 创建笔记

### 6. 布局与导航

**位置**: `frontend/components/layout/`

**Dock 导航**: [DockNavigation.tsx](frontend/components/layout/DockNavigation.tsx)
- 右侧固定 Dock，macOS 风格
- 7 个导航项: 首页、素材、相册、笔记、标签、设置、关于
- Hover 效果: 左移 8px + 放大 1.05x
- 快捷键提示 Tooltip

**布局结构**:
- 根布局: [app/layout.tsx](frontend/app/layout.tsx) - 字体配置 + Providers
- 主布局: [app/(main)/layout.tsx](frontend/app/(main)/layout.tsx) - Dock 导航 + Spotlight 搜索

---

## 后端功能模块

### 1. 素材导入 (Ingestion)

**位置**: `backend/app/routers/ingestion/`

**功能**:
- 本地文件系统扫描 (`/ingestion/scan`)
- 自动提取 EXIF/元数据
- 基于 SHA256 文件哈希精确去重
- 自动生成 WebP 缩略图
- 后台异步计算感知哈希 (phash)

**工作流程**:
```
1. 扫描目录 → 2. 计算 file_hash (去重) → 3. 提取元数据 →
4. 存入数据库 → 5. 保存标签 → 6. 生成缩略图 → 7. 发送异步任务计算 phash
```

**重要文件**:
- [scan.py](backend/app/routers/ingestion/scan.py) - 扫描导入接口
- [scan.py](backend/app/schema/ingestion/scan.py) - 请求/响应模型

### 2. 元数据提取 (Metadata Extraction)

**位置**: `backend/app/services/metadata/`

**支持格式**:
- **图片**: JPEG, PNG, HEIC, RAW (提取 EXIF、GPS、相机信息)
- **视频**: MP4, MOV, AVI (提取拍摄时间、GPS、设备信息、技术参数)
- **音频**: 暂不支持

**关键实现**:
- 工厂模式: `MetadataExtractorFactory`
- 视频元数据: 使用 ffmpeg.probe() 提取
- GPS 解析: 支持 ISO 6709 格式 (`+37.5665+126.9780/`)

**重要文件**:
- [factory.py](backend/app/services/metadata/factory.py) - 工厂类
- [image.py](backend/app/services/metadata/image.py) - 图片提取器
- [video.py](backend/app/services/metadata/video.py) - 视频提取器

### 3. 缩略图生成 (Thumbnail Generation)

**位置**: `backend/app/services/thumbnail/`

**规格**:
- 格式: WebP
- 尺寸: 最大 400×400 (保持宽高比)
- 质量: 80%
- 存储路径: `processed/thumbnails/{filename}_thumbnail.webp`
- 命名规则: 使用原始文件名 (不含扩展名) + `_thumbnail.webp`

**视频缩略图策略**:
- 长视频 (>2s): 提取第 1 秒帧
- 短视频 (0-2s): 提取 10% 位置帧
- 失败回退: 提取第 0 帧

**重要文件**:
- [video.py](backend/app/services/thumbnail/video.py) - 视频缩略图生成器

### 4. 哈希计算 (Hash Calculation)

**位置**: `backend/app/tools/`

#### 文件哈希 (File Hash)
- **算法**: SHA256
- **用途**: 精确去重 (内容相同即认为重复)
- **优化**:
  - 小文件 (<100MB): 完整哈希
  - 大文件 (≥100MB): 采样哈希 (头尾各 10MB + 元数据,速度提升 30x)
- **内存占用**: 固定 8KB (chunked reading)

**重要文件**:
- [file_hash.py](backend/app/tools/file_hash.py)

#### 感知哈希 (Perceptual Hash)
- **算法**: average_hash (imagehash 库)
- **用途**: 相似度搜索 (查找相似图片/视频)
- **特点**: 容忍轻微编辑、压缩、缩放
- **汉明距离**:
  - 0-5: 非常相似
  - 6-10: 相似
  - 11-20: 有一定相似性
  - >20: 不同

**重要文件**:
- [perceptual_hash.py](backend/app/tools/perceptual_hash.py)

### 5. 异步任务系统 (Taskiq + Redis)

**位置**: `backend/app/tasks/`

**架构**:
```
FastAPI → Redis 队列 (lumiharbor_tasks) → Taskiq Worker → 更新数据库
```

**已实现任务**:
1. **calculate_phash**: 单个素材感知哈希计算
2. **batch_calculate_phash**: 批量计算 (用于数据迁移)

**配置** (`.env`):
```env
AUTO_START_WORKER=true    # 是否自动启动 Worker
WORKER_COUNT=2            # Worker 进程数量
REDIS_HOST=localhost
REDIS_PORT=6379
```

**启动方式**:
```bash
# 开发环境 - 自动启动 Worker
python run.py

# 生产环境 - 独立启动 Worker
taskiq worker app.tasks.broker:broker --workers 4
```

**重要文件**:
- [broker.py](backend/app/tasks/broker.py) - Redis Broker 配置
- [phash_tasks.py](backend/app/tasks/phash_tasks.py) - 感知哈希异步任务
- [README.md](backend/app/tasks/README.md) - 完整使用文档

### 6. 标签系统 (Tag System)

**位置**: `backend/app/services/tags/`

**架构设计**:
- **三表设计**: tag_definitions (全局标签定义) + asset_template_tags (模板配置) + asset_tags (标签值存储)
- **tag_key 关联**: 使用字符串键名直接关联,避免查询 tag_definitions 获取 ID
- **模板系统**: 支持按资源类型 (image/video/audio) 配置不同的标签集
- **全局标签复用**: 同一个标签可在多种资源类型中使用 (如 GPS、设备信息)

**功能**:
- 自动提取并保存 EXIF/FFmpeg 元数据为结构化标签
- 基于模板过滤,仅保存该资源类型定义的标签
- 支持跨类型标签复用 (如 device_make 同时用于 image 和 video)
- 自动去重,避免重复保存相同标签

**工作流程**:
```
1. 提取元数据 → 2. 映射为统一 tag_key → 3. 查询模板配置 →
4. 过滤有效标签 → 5. 去重检查 → 6. 批量保存
```

**预定义标签** (15 个全局标签):
- **设备信息**: device_make, device_model, lens_model
- **拍摄参数**: exposure_time, aperture, iso, focal_length, white_balance, flash
- **GPS 信息**: gps_latitude, gps_longitude, gps_altitude
- **媒体属性**: width, height, duration

**模板配置**:
- **image 模板**: 12 个标签 (设备信息 + 拍摄参数 + GPS + 尺寸)
- **video 模板**: 8 个标签 (设备信息 + GPS + 尺寸 + 时长)

**重要文件**:
- [service.py](backend/app/services/tags/service.py) - 标签业务逻辑 (基于模板)
- [mapper.py](backend/app/services/tags/mapper.py) - 元数据映射器 (统一 EXIF/FFmpeg)
- [tag_definition.py](backend/app/model/tag_definition.py) - 全局标签定义模型
- [asset_tag.py](backend/app/model/asset_tag.py) - 标签值存储模型
- [asset_template_tag.py](backend/app/model/asset_template_tag.py) - 模板配置模型

---

## 数据库模型

### Asset 表

**位置**: `backend/app/model/asset.py`

**核心字段**:
```python
id                BIGINT         # 主键
created_by        BIGINT         # 创建者用户ID
original_path     VARCHAR(1000)  # NAS 物理相对路径
thumbnail_path    VARCHAR(1000)  # 缩略图路径
asset_type        VARCHAR(20)    # 类型: image/video/audio
mime_type         VARCHAR(100)   # MIME 类型
file_size         BIGINT         # 文件大小 (字节)
file_hash         VARCHAR(64)    # SHA256 (用于精确去重)
phash             VARCHAR(64)    # 感知哈希 (用于相似搜索)
visibility        VARCHAR(20)    # general/private
shot_at           DATETIME       # 拍摄时间
created_at        DATETIME       # 创建时间
is_deleted        BOOLEAN        # 软删除标记
```

**复合索引**:
- `idx_file_hash_not_deleted`: (file_hash, is_deleted) - 去重查询优化
- `idx_original_path_not_deleted`: (original_path, is_deleted) - 路径查询优化
- `idx_created_by_shot_at`: (created_by, shot_at) - 按时间查询优化

### Album 表

**位置**: `backend/app/model/album.py`

**核心字段**:
```python
id                BIGINT         # 主键
name              VARCHAR(255)   # 相册名称
description       TEXT           # 相册描述
start_time        DATETIME       # 相册开始时间（素材最早拍摄时间，自动维护）
end_time          DATETIME       # 相册结束时间（素材最晚拍摄时间，自动维护）
cover_asset_id    BIGINT         # 封面素材ID（自动选择或手动指定）
visibility        VARCHAR(20)    # general/private
created_by        BIGINT         # 创建者用户ID
created_at        DATETIME       # 创建时间
is_deleted        BOOLEAN        # 软删除标记
```

**复合索引**:
- `idx_time_range`: (start_time, end_time) - 时间范围查询优化

### AlbumAsset 表

**位置**: `backend/app/model/album_asset.py`

**核心字段**:
```python
id                BIGINT         # 主键
album_id          BIGINT         # 相册ID
asset_id          BIGINT         # 素材ID
sort_order        INT            # 排序顺序（数字越小越靠前）
created_at        DATETIME       # 添加时间
is_deleted        BOOLEAN        # 软删除标记
```

**复合索引**:
- `idx_album_sort`: (album_id, sort_order) - 相册内排序优化
- `uk_album_asset`: UNIQUE(album_id, asset_id) - 防止重复添加

### TagDefinition, AssetTemplateTag, AssetTag 表

详见标签系统部分说明。

---

## 项目结构

```
PersonalLifeFlow/
├── backend/                    # 后端服务
│   ├── app/
│   │   ├── config/            # 配置管理
│   │   ├── db/                # 数据库配置
│   │   ├── model/             # SQLAlchemy 模型
│   │   ├── schema/            # Pydantic 响应/请求模型
│   │   ├── routers/           # FastAPI 路由
│   │   │   └── ingestion/    # 导入模块路由
│   │   ├── services/          # 业务逻辑
│   │   │   ├── metadata/     # 元数据提取
│   │   │   ├── thumbnail/    # 缩略图生成
│   │   │   └── tags/         # 标签系统
│   │   ├── tasks/             # Taskiq 异步任务
│   │   └── tools/             # 工具函数
│   ├── tests/                 # pytest 测试
│   ├── scripts/               # 脚本工具
│   ├── requirements.txt       # 依赖列表
│   └── run.py                 # 启动脚本
├── frontend/                   # 前端应用
│   ├── app/                   # Next.js App Router
│   │   ├── (main)/           # 主应用路由组
│   │   │   ├── layout.tsx   # 主布局（Dock + Spotlight）
│   │   │   ├── page.tsx     # 首页
│   │   │   ├── assets/      # 素材库页面
│   │   │   ├── albums/      # 相册页面
│   │   │   └── notes/       # 笔记页面
│   │   ├── layout.tsx        # 根布局（字体 + Providers）
│   │   ├── providers.tsx     # React Query Provider
│   │   └── globals.css       # 全局样式
│   ├── components/            # React 组件
│   │   ├── layout/           # 布局组件
│   │   │   └── DockNavigation.tsx
│   │   ├── search/           # 搜索组件
│   │   │   └── SpotlightSearch.tsx
│   │   ├── home/             # 首页组件
│   │   │   ├── BentoGrid.tsx, BentoCard.tsx
│   │   │   ├── MapView3D.tsx, Globe3D.tsx, LocationMarker.tsx
│   │   │   └── Timeline.tsx, TimelineEvent.tsx
│   │   ├── assets/           # 素材库组件
│   │   │   ├── AssetCard.tsx
│   │   │   ├── AssetFilter.tsx
│   │   │   └── AssetGrid.tsx
│   │   ├── albums/           # 相册组件
│   │   │   ├── AlbumCard.tsx
│   │   │   └── AlbumGrid.tsx
│   │   └── notes/            # 笔记组件
│   │       ├── NoteCard.tsx
│   │       ├── NoteGrid.tsx
│   │       └── NoteTimeline.tsx
│   ├── lib/                   # 库文件
│   │   ├── api/              # API 客户端（当前 Mock 数据）
│   │   │   ├── client.ts    # Axios 实例
│   │   │   ├── types.ts     # TypeScript 类型
│   │   │   ├── home.ts      # 首页 API
│   │   │   ├── assets.ts    # 素材 API
│   │   │   ├── albums.ts    # 相册 API
│   │   │   ├── notes.ts     # 笔记 API
│   │   │   └── search.ts    # 搜索 API
│   │   └── utils/
│   │       └── cn.ts         # Tailwind 类名合并
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.ts    # Tailwind 配置（深色主题）
│   ├── next.config.mjs
│   └── .env.local            # 环境变量
├── plans/                     # 产品文档
├── README.md                  # 项目文档
└── CLAUDE.md                  # 本文档
```

---

## 开发规范

### 1. 编程原则

**严格遵循**:
- **KISS**: 追求极致简洁,拒绝不必要的复杂性
- **YAGNI**: 仅实现当前明确所需的功能,删除未使用代码
- **DRY**: 识别重复代码模式,主动建议抽象和复用
- **SOLID**:
  - 单一职责原则 (S)
  - 开闭原则 (O)
  - 里氏替换原则 (L)
  - 接口隔离原则 (I)
  - 依赖倒置原则 (D)

### 2. 代码规范

**注释语言**: 中文 (与现有代码库保持一致)

**数据库设计规范**:
- **禁止使用外键约束 (FOREIGN KEY)**
- 使用应用层逻辑维护数据一致性
- 表间关联通过索引优化查询性能
- **数据表结构变更时必须同步更新 [init_db.sql](scripts/init_db.sql)**
- **软删除字段统一使用 `is_deleted: BOOLEAN`**（不使用 `status: tinyint`）

**前端规范**:
- **组件命名**: PascalCase，如 `AssetCard.tsx`
- **文件组织**: 按功能模块分组（layout / search / home / assets / albums / notes）
- **API 层**: 所有 API 调用统一在 `lib/api/` 目录，当前使用 Mock 数据
- **类型定义**: 统一在 `lib/api/types.ts`
- **样式**: 使用 Tailwind CSS，避免内联样式和 CSS Modules

**文件路径引用**: 使用 markdown 链接格式
```python
# ✅ 正确
# 详见 [scan.py](backend/app/routers/ingestion/scan.py#L132)

# ❌ 错误
# 详见 backend/app/routers/ingestion/scan.py:132
```

**工具优先级**:
- 文件搜索: `Glob` > `find`
- 内容搜索: `Grep` > `grep`
- 读文件: `Read` > `cat`
- 编辑: `Edit` > `sed`
- 写文件: `Write` > `echo >`

### 3. Git 提交规范

**仅在用户明确要求时提交**,绝不主动创建提交。

**提交消息格式**:
```
<type>: <subject>

<body (可选)>
```

**Type 类型**:
- `feat`: 新功能
- `fix`: Bug 修复
- `refactor`: 重构
- `docs`: 文档
- `test`: 测试
- `chore`: 构建/工具
- `style`: 样式修改

**示例**:
```bash
git commit -m "$(cat <<'EOF'
feat: 实现 Spotlight 全局搜索功能

- 支持 Cmd+K / / 快捷键唤醒
- 搜索素材、相册、笔记三类内容
- 键盘导航支持（上下箭头 + 回车跳转）
- 300ms 防抖优化
EOF
)"
```

### 4. 危险操作确认

执行以下操作前必须获得明确确认:
- 删除文件/目录
- Git 提交/推送/重置
- 数据库删除/修改
- 生产环境 API 调用
- 包的全局安装/卸载

---

## 常见任务

### 前端开发任务

#### 添加新页面
1. 在 `app/(main)/` 创建新路由目录
2. 创建 `page.tsx` 文件
3. 在 Dock 导航中添加链接

**示例**:
```typescript
// app/(main)/tags/page.tsx
'use client';

export default function TagsPage() {
  return (
    <div className="min-h-screen py-12 px-8">
      <h1>标签管理</h1>
    </div>
  );
}

// components/layout/DockNavigation.tsx
const dockItems: DockItem[] = [
  // ... existing items
  { icon: Tag, label: '标签', href: '/tags', shortcut: 'T' },
];
```

#### 添加新 API 接口
1. 在 `lib/api/` 创建新 API 文件
2. 定义接口类型
3. 实现 API 函数（先用 Mock 数据）
4. 在组件中使用 TanStack Query 调用

**示例**:
```typescript
// lib/api/tags.ts
export interface Tag {
  id: number;
  name: string;
  count: number;
}

export const tagsApi = {
  getTags: async (): Promise<Tag[]> => {
    // TODO: 替换为真实 API
    // const response = await apiClient.get('/api/tags');
    // return response.data.data;

    // Mock 数据
    await new Promise(resolve => setTimeout(resolve, 300));
    return [
      { id: 1, name: '旅行', count: 156 },
      { id: 2, name: '美食', count: 89 },
    ];
  },
};

// 在组件中使用
const { data: tags } = useQuery({
  queryKey: ['tags'],
  queryFn: () => tagsApi.getTags(),
});
```

### 后端开发任务

#### 添加新的元数据提取器

1. 在 `app/services/metadata/` 创建新提取器
2. 继承 `MetadataExtractor` 基类
3. 实现 `extract()` 方法
4. 在 `factory.py` 中注册

**示例**:
```python
# app/services/metadata/audio.py
class AudioMetadataExtractor(MetadataExtractor):
    def extract(self, file_path: str) -> Tuple[Dict, Optional[datetime]]:
        # 实现音频元数据提取
        pass

# app/services/metadata/factory.py
MetadataExtractorFactory.register('audio', AudioMetadataExtractor)
```

#### 添加新的异步任务

1. 在 `app/tasks/` 创建新任务文件
2. 使用 `@broker.task` 装饰器定义任务
3. 在业务代码中调用 `await task.kiq(...)`

**示例**:
```python
# app/tasks/face_detection_tasks.py
from .broker import broker

@broker.task(task_name="detect_faces")
async def detect_faces_task(asset_id: int, file_path: str):
    # 实现人脸检测逻辑
    pass

# 调用
from app.tasks.face_detection_tasks import detect_faces_task
await detect_faces_task.kiq(asset_id=123, file_path="/path/to/photo.jpg")
```

### 运行测试

**后端测试：**
```bash
cd backend

# 运行所有测试
pytest

# 运行特定测试
pytest tests/unit/services/metadata/test_video_extractor.py

# 查看覆盖率
pytest --cov=app --cov-report=html
```

**前端测试：**
```bash
cd frontend

# 运行 ESLint
npm run lint

# 构建检查
npm run build
```

---

## 重要配置

### 后端环境变量 (.env)

```env
# 数据库
DATABASE_URL=mysql+pymysql://root:root@localhost:3306/lumiharbor?charset=utf8mb4

# NAS 路径
NAS_DATA_PATH=/path/to/your/nas/data

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=

# Taskiq Worker
AUTO_START_WORKER=true      # 自动启动 Worker
WORKER_COUNT=2              # Worker 数量
LOG_LEVEL=INFO              # 日志级别
```

### 前端环境变量 (.env.local)

```env
# 后端 API 地址
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 支持的文件格式

**图片**: `.jpg`, `.jpeg`, `.png`, `.heic`, `.raw`
**视频**: `.mp4`, `.mov`, `.avi`
**音频**: (暂不支持)

---

## 技术决策记录

### 1. 为何使用 Taskiq 而非 Celery?

**决策**: 采用 Taskiq + Redis

**理由**:
- ✅ 原生 asyncio,与 FastAPI 无缝集成
- ✅ 轻量简洁,代码量少
- ✅ 已有依赖 (requirements.txt)
- ✅ 性能足够 (10K+ 任务/秒)
- ✅ 运维简单 (仅需 Redis)

**对比 Celery**:
- Celery 基于同步设计,需要额外适配 FastAPI
- Celery Worker 较重 (多进程模型)
- Taskiq 更现代,更符合 Python 3.12+ 异步生态

### 2. 为何使用文件哈希 + 感知哈希双重机制?

**决策**: file_hash (精确去重) + phash (相似搜索)

**理由**:
- `file_hash` (SHA256): 内容完全相同 → 精确去重
- `phash` (average_hash): 视觉相似 → 查找相似图片
- 解耦关注点: 去重与相似搜索是不同的业务需求

**示例**:
```python
# 场景 1: 同一张照片不同压缩率
原图.jpg (file_hash: abc123, phash: a3f5c9d1)
压缩.jpg (file_hash: def456, phash: a3f5c9d2)  # file_hash 不同,phash 相似

# 场景 2: 完全相同的文件
原图.jpg (file_hash: abc123)
备份.jpg (file_hash: abc123)  # 精确去重,跳过导入
```

### 3. 为何视频缩略图使用智能 seek 策略?

**决策**: 根据视频时长动态调整 seek 时间

**问题**: 固定 `ss=1` 导致短视频 (如 0.7s) 提取失败

**解决**:
```python
if duration > 2:
    seek_time = 1        # 长视频: 1 秒
elif duration > 0:
    seek_time = duration * 0.1  # 短视频: 10% 位置
else:
    seek_time = 0        # 未知时长: 第 0 帧
```

**效果**: 100% 成功率,兼容所有时长视频

### 4. 为何使用 tag_key 关联 + 模板系统?

**决策**: tag_key 字符串直接关联 + asset_template_tags 模板配置

**问题**: 初始设计使用 tag_id (外键) + type 字段区分资源类型,存在以下问题:
- GPS、设备信息等通用标签需要在每种资源类型中重复定义
- 标签保存需要先查询 tag_definitions 获取 ID,增加数据库查询
- type 字段限制了标签的跨类型复用

**解决方案**:
```
三表设计:
1. tag_definitions - 全局标签定义（无 type 字段）
2. asset_template_tags - 模板配置（定义每种资源类型使用哪些标签）
3. asset_tags - 标签值存储（使用 tag_key 直接关联）
```

**优势**:
- ✅ **跨类型复用**: device_make、GPS 等标签可在 image/video 中共享
- ✅ **性能优化**: 避免查询 tag_definitions 获取 ID,直接使用 tag_key
- ✅ **灵活配置**: 通过模板系统控制每种资源类型的标签集
- ✅ **易于扩展**: 新增资源类型只需添加模板配置,无需修改标签定义

### 5. 为何前端使用 Next.js 14 App Router?

**决策**: Next.js 14 + App Router + TypeScript

**理由**:
- ✅ **服务端渲染**: 优化首屏加载和 SEO
- ✅ **文件系统路由**: 简化路由配置
- ✅ **React Server Components**: 减少客户端 JavaScript
- ✅ **内置优化**: 自动代码分割、图片优化、字体优化
- ✅ **TypeScript 支持**: 类型安全

**技术选择**:
- **TanStack Query**: 服务端状态管理，自动缓存和重新验证
- **Framer Motion**: 流畅动画，优于 CSS transitions
- **Tailwind CSS**: 快速开发，减少 CSS 文件大小
- **React Three Fiber**: 3D 渲染，WebGL 抽象层

### 6. 为何前端当前使用 Mock 数据?

**决策**: 所有 API 接口先使用 Mock 数据实现

**理由**:
- ✅ **并行开发**: 前后端可以独立开发，不互相阻塞
- ✅ **快速迭代**: 无需等待后端 API 完成即可验证 UI/UX
- ✅ **可独立运行**: 前端项目完全可运行，便于演示和测试
- ✅ **接口设计**: 前端开发过程中可以反向设计 API 接口

**后续计划**:
- v0.3 版本将实现真实后端 API
- 替换 Mock 数据，仅需修改 `lib/api/` 目录下的文件
- 接口类型定义已完成，切换成本低

---

## 参考文档

**后端：**
- **Taskiq 文档**: [app/tasks/README.md](backend/app/tasks/README.md)
- **启动指南**: [STARTUP_GUIDE.md](backend/STARTUP_GUIDE.md)
- **Redis 安装**: [REDIS_SETUP.md](backend/REDIS_SETUP.md)
- **测试指南**: [tests/README.md](backend/tests/README.md)

**前端：**
- **前端文档**: [frontend/README.md](frontend/README.md)
- **Next.js 文档**: https://nextjs.org/docs
- **TanStack Query**: https://tanstack.com/query/latest
- **Tailwind CSS**: https://tailwindcss.com/docs
- **React Three Fiber**: https://docs.pmnd.rs/react-three-fiber

---

**最后更新**: 2026-01-05
**版本**: v0.2.0

**v0.2.0 更新内容** (2026-01-05):
- ✅ 新增前端完整实现（Next.js 14 + TypeScript）
- ✅ 实现首页三大区域（精选照片墙、3D 足迹地图、大事记时间轴）
- ✅ 实现素材库、相册、笔记三大功能页面
- ✅ 实现 Spotlight 全局搜索（Cmd+K 快捷键）
- ✅ 实现右侧 Dock 导航（macOS 风格）
- ✅ 深色主题 + Apple Vision Pro 风格设计
- ✅ 所有页面使用 Mock 数据，可独立运行
- ✅ 更新项目结构和开发规范文档
