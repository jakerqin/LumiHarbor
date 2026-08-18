# LumiHarbor（拾光坞）— Claude 协作指南

面向 AI / 人类协作者的**项目入口说明**。模块级设计细节以源码与内部设计文档为准，不要把本文当作完整架构规格。

---

## 1. 项目是什么

**LumiHarbor（拾光坞）** 是私有化的个人/家庭生活素材管理系统：本地或 NAS 存储照片与视频，支持扫描/上传导入、元数据与标签、相册、笔记、首页聚合与地图足迹。

前后端分离：

| 侧 | 路径 | 技术 |
|---|---|---|
| 后端 | `backend/` | Python 3.12 · FastAPI · SQLAlchemy · Pydantic · Taskiq + Redis · MySQL 8 |
| 前端 | `frontend/` | Next.js 16.1 · React 19 · TypeScript · Tailwind · TanStack Query · Axios |
| 初始化 SQL | `scripts/` | 表结构 / 种子（变更表结构时务必同步） |
| 方案草稿 | `plans/` | 产品/技术设想，可能滞后于实现 |

媒体处理依赖本机 **ffmpeg**（视频元数据与缩略图）。

---

## 2. 文档怎么读（重要）

| 文档 | 用途 | 权威性 |
|---|---|---|
| **`backend/docs/design/`** | 后端模块内部设计（职责、决策、数据流、限制） | 后端设计以这里 + `backend/app` 源码为准 |
| **`frontend/docs/design/`** | 前端模块内部设计 | 前端设计以这里 + `frontend/` 源码为准 |
| **本文 `CLAUDE.md`** | 协作入口、全局约定、怎么开工 | 会滞后；冲突时信源码与 design |
| **`AGENTS.md`** | Agent 可执行短约定与踩坑点 | 日常改代码优先遵守 |
| `backend/app/tasks/README.md` 等 | 运维/任务专项 | 补充 design，不替代模块边界说明 |

入口总览：

- 后端：[backend/docs/design/00-架构总览.md](backend/docs/design/00-架构总览.md)
- 前端：[frontend/docs/design/00-架构总览.md](frontend/docs/design/00-架构总览.md)

改某个功能前：先打开对应序号文档，再读源码；不要凭过时记忆或本文旧描述开工。

---

## 3. 当前系统能力（以源码为准）

### 后端已具备

- 素材扫描导入 / 批量上传、SHA256 去重、缩略图与 HEIC 预览
- 元数据 → 标签模板写入；感知哈希与地理编码异步任务
- 素材 CRUD（列表/详情/收藏/相似/批量软删）
- 相册 CRUD 与素材关联；封面与时间范围自动维护
- 笔记 CRUD（主存 **Tiptap JSON**）
- 首页精选、笔记时间轴；地图足迹与统计
- 标签定义查询；管理端健康检查/统计

### 前端已具备

- 导航：桌面右侧 Dock（边缘唤出）；移动端底栏常驻；项为首页 · 素材 · 相册 · 笔记 · 地图 · 快传
- 首页：Dome Gallery（精选）、足迹地图预览（高德 preview，点进 `/map`）、笔记时间轴；粒子仅首页；不再内嵌 Mock 地球
- 素材库：瀑布流、筛选、上传、收藏、详情与相似；列表壳 `PageShell` + 空态引导
- 相册：列表/详情、创建、文件夹导入
- 笔记：列表/新建/详情，主编辑器为 **Novel（Tiptap）** 暗色对齐
- 独立 `/map`：高德中文 2D（macaron），接真实足迹 API（点开看该地照片）
- 独立 `/mobile-upload`：局域网手机快传（移动端优先布局，桌面也能打开），逐文件队列 + 进度 + 签名去重跳过 + 失败重试，可选归入新建/已有相册

### 明确不要再假设的旧状态

| 过时说法 | 现状 |
|---|---|
| 首页 Bento 3×3 | 已换成 Dome Gallery |
| Spotlight 全局搜索 | UI 与 `searchApi` Mock 均已移除 |
| 首页内嵌 Mock 地球 | 首页为真实足迹预览 + 链到 `/map` |
| Notes = Markdown + `asset://` 主链路 | 主链路是 Novel JSON |
| `/notes/novel` 独立实验页 | 路由已不存在，Novel 接在主笔记上 |
| 地图 API 未实现 | `/map` 与后端 map 路由已接通 |
| Zustand 在广泛使用 | 已卸依赖；服务端状态用 TanStack Query |

---

## 4. 架构一句话

```text
浏览器 → Next.js (页面薄编排 + components + lib/api)
              │  Axios，默认解包 ApiResponse
              ▼
         FastAPI routers（薄）
              │
              ▼
         services（编排）→ model / tools
              │
              ├─ 同步：元数据、标签、缩略图、预览
              └─ 异步：Taskiq ← Redis ← phash / geocoding
```

导入主链路（扫描或上传）最终汇入 `AssetImportService`：哈希去重 → 入库 → 标签/缩略图/预览 → 异步 phash / geocoding。细节见后端 [06-素材导入](backend/docs/design/06-素材导入.md)。

---

## 5. 全局工程约定

### 5.1 API 响应

统一壳：

```json
{ "code": "0", "message": "success", "result": {} }
```

- 后端新增接口默认用 `ApiResponse.success` / `ApiResponse.error`。
- 前端 `lib/api/client.ts`：`code === "0"` 时把 `data` 解包为 `result`；业务侧只读 `response.data`。
- **禁止**前端写 `response.data.result`。
- **已知例外**：`GET /home/featured` 直接返回业务对象（无壳）。改它时前后端一起核对。

### 5.2 路由与 baseURL

- 后端**无**全局 `/api` 前缀：`/assets`、`/albums`、`/notes`、`/home/*`、`/map/*`、`/ingestion/*`、`/tags/*`、`/management/*`。
- 前端 `NEXT_PUBLIC_API_URL`（见 `frontend/.env` / 模板），默认 `http://localhost:8000`。

### 5.3 数据库

- **禁止外键约束**；用应用层 + 索引维护关联。
- 业务表统一 `is_deleted` 软删除；查询默认过滤未删除（`users`、`task_logs` 等例外见设计文档）。
- 表结构变更必须同步 [scripts/init_db.sql](scripts/init_db.sql)。

### 5.4 用户身份（当前）

无完整登录链路。多数接口用 Query `user_id`（默认 `1`）或代码内写死 `1`。新接口继续显式传 `user_id`/`created_by`，不要假装已鉴权。

### 5.5 媒体

- DB 存相对 `NAS_DATA_PATH` 的路径。
- 后端把 NAS 目录静态挂到 `MEDIA_BASE_PATH`（默认 `/media`），当前不鉴权。
- 前端用 API 返回的 `*_url` 或 `lib/utils/mediaUrl` 拼展示地址。

---

## 6. 模块索引 → 设计文档

### 后端 `backend/docs/design/`

| 序号 | 文档 | 何时打开 |
|---|---|---|
| 00 | 架构总览 | 第一次摸后端 / 找入口 |
| 01–05 | 结构、约定、入口配置、模型、接口 | 改横切或新表/新接口 |
| 06–07 | 素材导入、素材库 | 导入、列表、相似、收藏 |
| 08–10 | 相册、笔记、标签 | 对应 REST 资源 |
| 11–13 | 首页、地图、系统管理 | 聚合与运维接口 |
| 14–16 | 媒体处理、异步任务、工具 | 缩略图、phash、地理编码、哈希 |

### 前端 `frontend/docs/design/`

| 序号 | 文档 | 何时打开 |
|---|---|---|
| 00 | 架构总览 | 第一次摸前端 |
| 01–05 | 结构、约定、入口、API 层、布局 | 改脚手架或导航 |
| 06–09 | 首页、素材、相册、笔记 | 改对应页面 |
| 10–11 | Novel/AI、Markdown 协议 | 编辑器与遗留协议 |
| 12–13 | 地图、动效工具 | `/map`、GSAP/utils |
| 14 | 移动端上传 | `/mobile-upload` 局域网手机快传 |

---

## 7. 本地开发

### 后端

```bash
cd backend
# 配置 .env（可参考 .env.example）：DATABASE_URL、NAS_DATA_PATH、REDIS_*、AMAP_API_KEY 等
python run.py                    # 开发：可自动拉起 Taskiq Worker + uvicorn :8000
pytest                           # 或 pytest tests/...
# 生产向：AUTO_START_WORKER=false，另开 start_worker.sh / taskiq worker
```

### 前端

```bash
cd frontend
# 配置 .env：NEXT_PUBLIC_API_URL；Novel AI 需 OPENAI_API_KEY（见 .env.template）
npm run dev                      # 默认 :3000
npm run lint
npm run build                    # 含类型检查（webpack）
```

也可用仓库根目录 `docker-compose.yml` 起 MySQL / Redis / 前后端（以 compose 文件为准）。

---

## 8. 编码规范（协作时必须遵守）

### 原则

- **KISS / YAGNI / DRY / SOLID**：只做当前明确需求；抽象出现重复后再抽。
- **最小改动面**：不顺手大重构；不改无关命名与目录。
- **先读后写**：以 design + 源码确认调用链，禁止凭猜测改。

### 复杂度（已过 MVP）

- 单方法 ≤ 50 行（不含空行与注释）；单类 ≤ 300 行
- 圈复杂度 ≤ 10；参数 ≤ 5（超出用配置对象）
- 嵌套 ≤ 3 层；超限立刻拆分

### 语言与风格

- 注释：中文（与现有代码一致）
- 前端组件：PascalCase；按功能目录放 `components/{home,assets,albums,notes,map,layout,...}`
- API 调用：只走 `frontend/lib/api/`，类型优先落在 `types.ts` 或同域文件
- 样式：Tailwind；避免无必要的 CSS Modules / 内联大段样式
- 瀑布流：复用 `AssetMasonry`，不要再造一套

### 文档更新

- 改了模块边界、主数据流、响应契约或已知限制 → **同步更新对应 `docs/design` 篇**（优先于改本文长文）。
- 本文只在全局约定或文档索引变化时更新。

### Git

- **仅在用户明确要求时** commit / push / reset。
- 提交信息：`<type>: <subject>`，type 为 `feat|fix|refactor|docs|test|chore|style`。

### 危险操作

删除文件/目录、git 破坏性操作、数据库结构变更/批量写、全局装包等，**先征得用户明确确认**再执行（格式见 `AGENTS.md`）。

---

## 9. 常见改动路径

| 目标 | 建议顺序 |
|---|---|
| 新后端 REST 资源 | design 横切/模型/接口 → `model` + `schema` + `router` + `service` → 必要时 `init_db.sql` → 前端 `lib/api` + 页面 |
| 改导入/缩略图/phash | 后端 06 → 14 → 15 |
| 改笔记编辑体验 | 前端 09 → 10；后端 09 |
| 改地图 | 前端 12 + 后端 12；注意首页地球与 `/map` 不是同一条数据源 |
| 新素材列表页 | 复用 `AssetMasonry` / `AssetGrid` + `assetsApi` |
| 改手机上传 | 前端 14 → 后端 06（`/ingestion/upload` 相册参数） |

---

## 10. 已知缺口（避免误判为「没做完的 TODO」）

- 无完整认证；`user_id=1` 为开发约定
- `GET /home/featured` 响应壳与其它接口不一致
- 部分筛选参数前后端声明与实现不一致（见各 design「已知限制」）

---

**最后更新**：2026-08-13  
**设计文档入口**：`backend/docs/design/00-架构总览.md` · `frontend/docs/design/00-架构总览.md`
