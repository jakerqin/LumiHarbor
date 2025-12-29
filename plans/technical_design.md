# 拾光坞 (LumiHarbor) - 技术设计文档 (TDD)

## 1. 数据库架构设计 (Database Schema Design)
采用 PostgreSQL 优化 NAS 部署。为了提高读取性能和可迁移性，采用**去中心化关联（Denormalized）**设计，避免物理外键约束，依靠应用层保证数据逻辑。

### 1.1 核心表结构

#### 用户表 `users`
| 字段名 | 类型 | 说明 |
| :--- | :--- | :--- |
| id | UUID/String | 主键 |
| username | String | 用户名 |
| role | String | admin / member / guest |
| avatar_url | String | 头像路径 |

#### 多模态资源表 `assets`
| 字段名 | 类型 | 说明 |
| :--- | :--- | :--- |
| id | UUID/String | 主键 |
| owner_id | String | 创作者 ID (权限校验核心) |
| original_path | String | NAS 物理相对路径 |
| asset_type | String | image / video / audio |
| file_size | BigInt | 文件大小 |
| mime_type | String | 媒体类型 |
| phash | String | 感知哈希 (用于去重) |
| exif_data | JSONB | 存储相机型号、焦距、拍摄时间等 |
| gps_lat / gps_lng| Float | 经纬度 |
| city / address | String | 结构化地理位置 |
| ai_tags | String[] | AI 自动打标标签 |
| created_at | DateTime | 上传时间 |
| shot_at | DateTime | 拍摄时间 (从 EXIF 提取) |

#### 叙事笔记表 `notes`
| 字段名 | 类型 | 说明 |
| :--- | :--- | :--- |
| id | UUID/String | 主键 |
| owner_id | String | 创作者 ID |
| title | String | 标题 |
| content | Text | Markdown 内容 (加密存储可选) |
| is_encrypted | Boolean | 内容是否经过 AES 加密 |
| related_assets | String[] | 关联的 Asset ID 列表 |
| shot_at | DateTime | 叙事发生时间 (用于时光轴对齐) |
| created_at | DateTime | 创建时间 |

---

## 2. 后端架构与 AI 实现 (Backend & AI Strategy)

### 2.1 异步任务架构
由于 NAS CPU 性能受限，核心 AI 任务采用 **FastAPI + TaskIQ/Lightweight Queue** 模式进行异步化。
- **任务队列**：检测到新资源上传 -> 触发异步任务。
- **任务分级**：
    1.  **L1 (实时)**：生成缩略图 (Thumbnail)，提取 EXIF。
    2.  **L2 (异步)**：人脸检测与聚类、OCR 识别。
    3.  **L3 (闲时)**：CLIP 语义向量生成 (用于自然语言搜索)。

### 2.2 存储策略
- **RawData**: `/nas/data/originals/{year}/{month}/{day}/` (保持原始文件不变)。
- **ProcessedData**: `/nas/data/processed/thumbnails/{asset_id}.webp` (Next.js 快速消费)。
- **Metadata**: 数据库 + 向量索引文件。

### 2.3 本地 AI 集成流
- **Vision**: 使用 `InsightFace` (人脸) 和 `MobileNetV3` (标签) 保证低功耗运行。
- **Semantic Search**: 使用轻量级 `Chinese-CLIP-Tiny` 将图像和文本映射到同一向量空间，存储在 **ChromaDB** 中。

---

## 3. 前端架构与 UI 逻辑 (Next.js & UX)

### 3.1 时光轴瀑布流 (Infinite Narrative Timeline)
- **实现方案**：使用 `react-virtuoso` 实现高性能虚拟滚动。
- **混合渲染**：后端返回一个按时间排序的 `MixedMemoryStream` (包含 Note 和 Asset)。
- **图片优化**：强依赖 `next/image` 的 `loader` 模式，前端请求缩略图路径，减少带宽占用。

### 3.2 地理聚合图 (Footprint Map)
- **库选型**：`Leaflet` + `react-leaflet-cluster`。
- **逻辑**：后端提供 `/api/assets/map` 接口，仅返回坐标和 ID 列表，前端进行 Marker 聚合。

### 3.3 交互校验 (Owner-only Logic)
- **状态管理**：`useUser` Hook 获取当前用户信息。
- **组件级逻辑**：
  ```javascript
  const isOwner = user.id === memory.owner_id;
  {isOwner && <DeleteButton id={memory.id} />}
  ```
- **服务端校验**：FastAPI 中间件对 `PUT/DELETE` 接口进行 `JWT` 与 `owner_id` 匹配验证。

---

## 4. 数据一致性与安全性 (Consistency & Security)

### 4.1 去中心化下的一致性
- **软删除 (Soft Delete)**：删除 Asset 时，仅标记 `deleted_at`，不立即物理删除，防止误删及笔记链接失效。
- **后台扫描**：定期运行一致性检查脚本，清理孤儿文件或无效关联。

### 4.2 加密实现 (Security)
- **AES-256-GCM**：用于笔记内容的加密。
- **Key Derivation**: 使用 PBKDF2 将用户设置的“二级密码”派生出加密密钥。
- **Zero-Knowledge (建议)**：密钥仅在前端内存持有，不保存于数据库，确保即便数据库泄露，内容依然加密。
