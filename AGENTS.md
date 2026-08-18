# LumiHarbor — Agent 协作指南（AGENTS.md）

给 Codex / Cursor Agent 用的**短约定**。目标：少走弯路、改对地方、别踩契约坑。  
模块设计细节去读 `docs/design`，不要把本文或过时长文当规格书。

---

## 0. 总体原则

- **先读后写**：改前用搜索/打开文件确认调用链；禁止凭猜测改。
- **KISS / DRY / YAGNI / SOLID**：只实现当前明确需求；最小改动面。
- **设计文档优先**：模块边界与 why → `backend/docs/design/` 或 `frontend/docs/design/`；冲突时 **源码 > design > CLAUDE.md**。
- **不要主动 git 操作**：除非用户明确要求，不做 commit / push / reset。
- **注释中文**；不顺手重构无关代码。

---

## 1. 危险操作确认（必须）

以下操作前必须获得用户明确确认：

- 删除/批量移动重要文件或目录
- `git commit` / `git push` / `git reset --hard` 等
- 数据库删除、结构变更、批量更新
- 全局装包/卸包、升级核心依赖
- 改系统环境变量或权限

确认格式（原样输出并等待回答）：

```
⚠️ 危险操作检测！
操作类型：[具体操作]
影响范围：[详细说明]
风险评估：[潜在后果]

请确认是否继续？[需要明确的"是"、"确认"、"继续"]
```

---

## 2. 仓库边界

| 路径 | 内容 |
|---|---|
| `backend/` | FastAPI API、Service、Model、Taskiq 任务 |
| `frontend/` | Next.js App Router UI |
| `backend/docs/design/` | 后端内部设计（序号 `00`–`16`） |
| `frontend/docs/design/` | 前端内部设计（序号 `00`–`13`） |
| `scripts/init_db.sql` | 表结构权威之一；**改表必同步** |
| `CLAUDE.md` | 人类/AI 协作入口（非模块规格） |

入口：

- [backend/docs/design/00-架构总览.md](backend/docs/design/00-架构总览.md)
- [frontend/docs/design/00-架构总览.md](frontend/docs/design/00-架构总览.md)

---

## 3. 高频踩坑约定

### 3.1 ApiResponse

```json
{ "code": "0", "message": "success", "result": {} }
```

- 后端默认包这层；前端拦截器在 `code === "0"` 时把 `data` 解成 `result`。
- 业务代码：`const res = await apiClient.get<T>(...);` → 用 **`res.data`**。
- **禁止** `response.data.result` / `response.data.data`。
- **例外**：`GET /home/featured` 无壳；改时前后端一起查。

### 3.2 URL

- 前端 `NEXT_PUBLIC_API_URL`，默认 `http://localhost:8000`。
- 后端无全局 `/api` 前缀。

### 3.3 数据库

- **无外键**；应用层维护一致性。
- 业务表 `is_deleted`；查询默认过滤未删除（`users` / `task_logs` 例外见后端 design）。
- 改表 → 同步 `scripts/init_db.sql`。

### 3.4 用户

- 无完整登录；接口多用 `user_id=1`。新接口继续显式传，别假装已鉴权。

### 3.5 笔记

- 主存 **Tiptap / Novel JSON**，不是 Markdown 主链路。
- 无独立 `/notes/novel` 页。

### 3.6 前端状态与列表

- 服务端状态：TanStack Query；全局 `staleTime=0`（见 `app/providers.tsx`）。长缓存在单个 query 上覆写并说明原因。
- 不要无故引入全局 store。
- 素材瀑布流：复用 `AssetMasonry` / `AssetGrid`。
- 标签展示名：用 `useTagDefinitions` 的 `tag_name`，勿硬编码 `tag_key → 中文`。

### 3.7 复杂度门槛

- 方法 ≤ 50 行；类 ≤ 300 行；嵌套 ≤ 3；参数 ≤ 5。超了就拆。

### 3.8 改完要不要改文档

- 动了模块边界、主数据流、契约、已知限制 → **更新对应 `docs/design` 篇**。
- 不要把大段模块说明塞回 `CLAUDE.md`。

---

## 4. 不要再按旧记忆实现

| 错误假设 | 现状 |
|---|---|
| Bento 精选墙 | Dome Gallery |
| Spotlight Cmd+K | UI 已移除 |
| Notes = Markdown + asset:// | Novel JSON 主链路 |
| 地图未做 / Mapbox+3D | `/map` 为高德中文 2D + 后端 map API |
| 首页地点 = `/map` 数据 | 首页只链到 `/map`；独立地图页走 `mapApi` |

接线真伪总表见 [前端 04-类型与API层](frontend/docs/design/04-类型与API层.md)。

---

## 5. 常用命令

```bash
# 前端
npm --prefix frontend run dev
npm --prefix frontend run lint
npm --prefix frontend run build

# 后端
python backend/run.py
pytest backend/tests
```

---

## 6. 提交前自检

- 前端：相关改动至少 `npm --prefix frontend run build` 能过。
- 后端：相关接口做最小链路验证；改 schema/路由/表 → 更新 design，必要时改 `init_db.sql`。
- 未要求则不 commit。

---

## 7. 找文档速查

| 想改… | 先看 |
|---|---|
| 导入 / 去重 / NAS | 后端 `06` → `14` → `15` |
| 素材列表/相似/收藏 | 后端 `07` + 前端 `07` |
| 相册 | 后端 `08` + 前端 `08` |
| 笔记 / 编辑器 / AI | 前端 `09`→`10`；后端 `09` |
| 地图足迹 | 前端 `12` + 后端 `12` |
| 手机局域网上传 `/mobile-upload` | 前端 `14`；后端 `06`（`/ingestion/upload` 相册参数） |
| ApiResponse / 软删 / 无 FK | 后端 `02`；前端 `02` |
| 启动与环境变量 | 后端 `03`；前端 `03` |
