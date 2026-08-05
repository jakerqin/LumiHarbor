---
title: 类型与 API 层
nav_title: 类型与API层
description: Axios 客户端、共享类型，以及各域 API 的真实接线 / Mock 状态。
order: 4
---

# 类型与 API 层

位置：[`lib/api/`](../../lib/api/)

## 职责边界

- **负责**：HTTP 客户端、领域 API 函数、前后端 DTO 适配（如相册 snake → camel）、共享 TS 类型
- **不负责**：UI 状态、无限滚动拼页（在组件 / hooks）、鉴权会话管理

| 文件 | 职责 |
|---|---|
| [`client.ts`](../../lib/api/client.ts) | `apiClient`、`ApiError`、拦截器 |
| [`types.ts`](../../lib/api/types.ts) | Asset、Featured、Footprint、Timeline 等共享类型 |
| [`assets.ts`](../../lib/api/assets.ts) | 素材列表/详情/标签/相似/收藏/批量删/地点 |
| [`albums.ts`](../../lib/api/albums.ts) | 相册 CRUD、素材关联、文件夹导入（走 ingestion） |
| [`notes.ts`](../../lib/api/notes.ts) | 笔记 CRUD（Tiptap JSON） |
| [`home.ts`](../../lib/api/home.ts) | 精选、时间轴、**首页地点 Mock** |
| [`map.ts`](../../lib/api/map.ts) | 足迹列表/详情/统计 |
| [`tags.ts`](../../lib/api/tags.ts) | 标签定义元数据 |
| [`ingestion.ts`](../../lib/api/ingestion.ts) | 批量上传 FormData |
| [`search.ts`](../../lib/api/search.ts) | **全局搜索 Mock**（无 UI 消费） |

## 客户端行为摘要

详见 [横切约定](./横切约定.md#1-统一-api-响应解包)。

```text
apiClient.get/post/...
    │
    ├─ baseURL = NEXT_PUBLIC_API_URL || http://localhost:8000
    ├─ timeout = 10000
    ├─ (+ Authorization Bearer 若有 token)
    ▼
response interceptor
    ├─ 标准壳 code=0 → data = result
    ├─ 标准壳 code≠0 → ApiError
    └─ 非标准壳 → 原样
```

## 接线状态总表（以源码为准）

| API 模块 | 主要路径 | 状态 |
|---|---|---|
| `assetsApi` | `/assets*` | **真实** |
| `albumsApi` | `/albums*`、`/ingestion/scan`（导入） | **真实** |
| `notesApi` | `/notes*` | **真实**（JSON content） |
| `homeApi.getFeatured` | `/home/featured` | **真实**（响应无 ApiResponse 壳） |
| `homeApi.getTimeline` | `/home/timeline` | **真实** |
| `homeApi.getLocations` | — | **Mock**（首页 `MapView3D` 仍用） |
| `mapApi` | `/map/footprints*`、`/map/statistics` | **真实**（`/map` 页） |
| `tagsApi` | `/tags/definitions` | **真实** |
| `ingestionApi` | `/ingestion/upload/batch` | **真实** |
| `searchApi` | — | **Mock**；Spotlight UI 已移除，**无页面引用** |
| `assetsApi.getTags` | `/assets/tags` | 代码保留 + TODO；筛选 UI 未使用 |

## 适配模式

### 相册：后端 DTO → 前端展示模型

[`albums.ts`](../../lib/api/albums.ts) 内 `toAlbum()` 把 `cover_thumbnail_url`、`asset_count`、`created_at` 等映射为 `coverUrl`、`assetCount`、`createdAt`。  
列表筛选参数也做了重命名：`name` → `search`，`shot_at_*` → `start_time_from` / `end_time_to`。

### 笔记：直接吃后端字段

列表/详情以 snake_case 为主（`cover_asset_id`、`cover_thumbnail_url`），与后端 `Note` schema 对齐；`content` 类型为 `JSONContent`（novel）。

### 分页两套习惯

| 风格 | 前端用法 | 模块 |
|---|---|---|
| `page` / `page_size` | `assetsApi.getAssets` | 素材 |
| `skip` / `limit` | albums / notes 内部换算 | 相册、笔记 |

## 设计决策

### 为什么 API 层做相册映射、不做素材映射？

素材列表字段已接近后端 `AssetOut`；相册历史前端类型是 camelCase UI 模型，为减少卡片改动保留适配层。新模块优先直接对齐后端命名，避免双份类型漂移。

### 为什么 `CURRENT_USER_ID = 1` 写在 API 文件里？

后端多数接口用 Query `user_id`；前端尚无会话。集中常量比每个组件散落字面量好改；接登录后应改为从 auth 上下文读取。

## 依赖

```text
components / pages
    → lib/api/*
        → apiClient
            → FastAPI
```

标签展示名：`useTagDefinitions` → `tagsApi`（见 [素材库](./07-素材库.md)）。

## 已知限制

- `searchApi` / `homeApi.getLocations` 仍是 Mock，容易误导「搜索/首页地球已接真数据」。
- `assetsApi.getTags` 指向的后端列表接口状态不明，UI 未接线。
- 上传超时受 Axios `timeout: 10000` 约束，大文件批量可能不够。
- `types.ts` 与部分 API 文件内联类型有重叠（如 search 里又定义了 Album/Note），清理时注意别误删在用类型。
