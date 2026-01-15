# PersonalLifeFlow / LumiHarbor — Codex 协作指南（AGENTS.md）

本文件面向 **Codex CLI** 的日常协作，内容从 `CLAUDE.md` 提炼并补充“可执行的工程约定”。目标是：**稳定、可维护、少走弯路**。

## 0. 总体原则（必须遵守）

- **先读后写**：改代码前先用 `rg`/打开文件确认现状与调用链，避免凭猜测改动。
- **KISS / DRY / YAGNI / SOLID**：只实现当下明确需求；抽象只在出现重复/扩展点时引入。
- **最小改动面**：不要顺手重构无关代码；不要随意改目录结构、命名风格。
- **不要主动 git 操作**：除非用户明确要求，否则不要执行 `git commit/push/reset` 等。

## 1. ⚠️ 危险操作确认机制

执行以下操作前必须获得用户明确确认：

- 删除文件/目录、批量修改、移动重要文件
- `git commit` / `git push` / `git reset --hard`
- 修改系统环境变量、权限变更、系统设置
- 数据库删除/结构变更/批量更新
- 包管理：全局安装/卸载、升级核心依赖
- 需要网络访问的安装/拉取（当前环境可能需要审批）

确认格式（必须原样输出并等待用户回答）：

```
⚠️ 危险操作检测！
操作类型：[具体操作]
影响范围：[详细说明]
风险评估：[潜在后果]

请确认是否继续？[需要明确的"是"、"确认"、"继续"]
```

## 2. 仓库结构与边界

- `backend/`：FastAPI + SQLAlchemy + Pydantic（统一 `ApiResponse` 响应壳）
- `frontend/`：Next.js App Router（Next 16.1.1 / React 19.2.0 / TS / Tailwind / TanStack Query）
- `scripts/`：初始化 SQL 等
- `plans/`：方案/架构文档

## 3. 关键工程约定（高频踩坑点）

### 3.1 API 响应约定（前后端必须一致）

后端统一响应格式：

```json
{ "code": "0", "message": "", "result": "T" }
```

前端 `frontend/lib/api/client.ts` 会自动解包：
- `code === "0"` → 业务代码直接读 `response.data`（已经是 `result`）
- `code !== "0"` → 抛出 `ApiError`

因此：前端不要写 `response.data.result`；新增后端接口也不要绕开 `ApiResponse`，除非非常明确且在文档中说明。

### 3.2 API baseURL / 路由前缀

- 前端通过 `NEXT_PUBLIC_API_URL`（见 `frontend/.env.local`）配置 baseURL，默认 `http://localhost:8000`。
- 后端当前无全局 `/api` 前缀，路由形如：`/assets`、`/albums`、`/tags`、`/notes`、`/home/*`。

### 3.3 Notes（Markdown + 实时预览 + 正文关联素材）

- 渲染组件：`frontend/components/markdown/MarkdownRenderer.tsx`（Streamdown wrapper）
- Notes Markdown 渲染：`frontend/components/notes/NoteMarkdown.tsx`
- **素材嵌入协议（存储）**：Markdown 内使用 `asset://{id}`（例如：`![](asset://123)`）
- **渲染期安全改写**：渲染前将 `asset://{id}` 重写为 `/__asset__/{id}`，以绕过 Streamdown/rehype-harden 对自定义协议的阻断；渲染层同时兼容两种形式（见 `frontend/lib/markdown/assetProtocol.ts`）。
- 后端 Notes：`GET /notes/{id}?include_assets=true` 可聚合返回引用素材元数据，减少前端 N+1。

### 3.4 Tags（标签元数据）

- 后端标签元数据：`GET /tags/definitions`，可选 `template_type=image|video|audio`
- 前端缓存 Hook：`frontend/lib/hooks/useTagDefinitions.ts`（localStorage + 长 TTL）
- UI 展示优先使用 `tag_name`，不要在前端做 `tag_key -> name` 的硬编码映射。

### 3.5 瀑布流（素材库/相册详情复用）

- `frontend/components/assets/AssetMasonry.tsx` 采用“最短列优先分配”（基于 `aspect_ratio` 估算高度）。
- 任何新增素材列表页，优先复用 `AssetMasonry` / `AssetGrid`，不要重复造轮子。

### 3.6 TanStack Query 缓存策略

- 全局默认：`staleTime=0`（见 `frontend/app/providers.tsx`），导航回页优先拉新。
- 如需更长缓存（例如标签定义），在单个 query 上覆写 `staleTime/gcTime`，并说明原因。

## 4. 常用命令（本地开发/验证）

### Frontend

- 开发：`npm --prefix "frontend" run dev`
- Lint：`npm --prefix "frontend" run lint`
- 构建（含 TS 检查）：`npm --prefix "frontend" run build`

### Backend

- 启动（开发）：`python "backend/run.py"`（如需也可用 `uvicorn backend.app.main:app --reload`）
- 测试：`pytest "backend/tests"`

## 5. 提交前自检（建议）

- 前端改动：至少跑一次 `npm --prefix "frontend" run build`
- 后端改动：与改动范围相关的接口做一次最小链路验证；涉及 schema/路由时补充/更新文档（优先写在 `CLAUDE.md`）

