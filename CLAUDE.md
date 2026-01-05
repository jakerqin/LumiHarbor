# LumiHarbor (拾光坞) - Claude 协作指南

## 项目概述

**LumiHarbor (拾光坞)** 是一个个人生活素材管理系统,用于管理照片、视频等多媒体素材。系统支持本地文件系统扫描导入、智能元数据提取、感知哈希相似度搜索等功能。

### 技术栈

- **后端**: FastAPI + SQLAlchemy + MySQL
- **异步任务**: Taskiq + Redis
- **元数据提取**: exifread (图片) + ffmpeg (视频)
- **图像处理**: Pillow + imagehash
- **缩略图**: WebP 格式

---

## 核心功能模块

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

**时间范围维护策略**:
- 创建相册时自动选择第一张素材的拍摄时间作为 `start_time` 和 `end_time`
- 添加/删除素材时，应用层自动更新 `start_time`（最早）和 `end_time`（最晚）
- 空相册时，`start_time` 和 `end_time` 为 NULL

**封面逻辑**:
- 创建相册时自动选择第一张素材（按拍摄时间最早）的 ID 存入 `cover_asset_id`
- 用户可手动修改 `cover_asset_id` 覆盖默认选择
- 如果封面素材被删除，应用层负责重新选择或置空

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

**关系说明**:
- 一个素材可以属于多个相册（多对多关系）
- 同一相册内不能重复添加同一素材（唯一约束）
- `sort_order` 用于自定义相册内素材的显示顺序

### TagDefinition 表

**位置**: `backend/app/model/tag_definition.py`

**核心字段**:
```python
id                BIGINT         # 主键
tag_key           VARCHAR(100)   # 标签键名（唯一，用于关联）
tag_name          VARCHAR(200)   # 标签显示名称
input_type        INT            # 输入类型（预留字段）
extra_info        JSON           # 扩展信息（预留字段）
description       TEXT           # 标签描述
created_at        DATETIME       # 创建时间
updated_at        DATETIME       # 更新时间
is_deleted        BOOLEAN        # 软删除标记
```

**设计说明**:
- **全局标签定义**: 不区分资源类型,同一个标签可被多种资源类型使用
- **tag_key 唯一性**: 作为标签的全局唯一标识符,用于跨表关联
- **无 type 字段**: 标签不属于特定类型,通过模板系统配置使用范围

**索引**:
- `UNIQUE KEY uk_tag_key`: (tag_key) - 确保全局唯一
- `INDEX idx_tag_key`: (tag_key) - 查询优化

### AssetTemplateTag 表

**位置**: `backend/app/model/asset_template_tag.py`

**核心字段**:
```python
id                BIGINT         # 主键
template_type     VARCHAR(20)    # 模板类型: image/video/audio
tag_key           VARCHAR(100)   # 标签键名（关联 tag_definitions）
sort_order        INT            # 排序顺序
is_required       BOOLEAN        # 是否必填（预留字段）
created_at        DATETIME       # 创建时间
updated_at        DATETIME       # 更新时间
is_deleted        BOOLEAN        # 软删除标记
```

**设计说明**:
- **模板配置表**: 定义每种资源类型应该使用哪些标签
- **灵活配置**: 通过配置实现标签的跨类型复用
- **自动匹配**: 导入流程根据 asset_type 自动匹配对应模板

**复合索引**:
- `UNIQUE KEY uk_template_tag`: (template_type, tag_key) - 防止重复配置
- `INDEX idx_template_type`: (template_type) - 模板查询优化
- `INDEX idx_tag_key`: (tag_key) - 标签查询优化

**当前配置**:
- **image**: 12 个标签 (device_make, device_model, lens_model, exposure_time, aperture, iso, focal_length, white_balance, flash, gps_latitude, gps_longitude, gps_altitude)
- **video**: 8 个标签 (device_make, device_model, width, height, duration, gps_latitude, gps_longitude, gps_altitude)

### AssetTag 表

**位置**: `backend/app/model/asset_tag.py`

**核心字段**:
```python
id                BIGINT         # 主键
asset_id          BIGINT         # 素材ID
tag_key           VARCHAR(100)   # 标签键名（直接使用字符串关联）
tag_value         TEXT           # 标签值
created_at        DATETIME       # 创建时间
updated_at        DATETIME       # 更新时间
is_deleted        BOOLEAN        # 软删除标记
```

**设计说明**:
- **tag_key 关联**: 直接使用字符串键名,避免查询 tag_definitions 获取 ID
- **性能优化**: 减少关联查询,提高标签读写效率
- **灵活存储**: tag_value 为 TEXT 类型,支持多种数据格式

**复合索引**:
- `UNIQUE KEY uk_asset_tag`: (asset_id, tag_key) - 防止重复标签
- `INDEX idx_asset_id`: (asset_id) - 素材查询优化
- `INDEX idx_tag_key`: (tag_key) - 标签查询优化

**关系说明**:
- 一个素材可以有多个标签（一对多）
- 同一素材不能重复添加相同的 tag_key（唯一约束）
- 标签值通过应用层验证和过滤,仅保存模板中定义的标签

---

## 项目结构

```
backend/
├── app/
│   ├── config/              # 配置管理
│   │   └── config.py        # Settings (Pydantic BaseSettings)
│   ├── db/                  # 数据库配置
│   ├── model/               # SQLAlchemy 模型
│   │   └── asset.py         # 素材模型
│   ├── schema/              # Pydantic 响应/请求模型
│   │   ├── common.py        # 通用响应体 (ApiResponse)
│   │   └── ingestion/       # 导入模块 Schema
│   ├── routers/             # FastAPI 路由
│   │   └── ingestion/       # 导入模块路由
│   │       └── scan.py      # 扫描导入接口
│   ├── services/            # 业务逻辑
│   │   ├── metadata/        # 元数据提取
│   │   │   ├── factory.py
│   │   │   ├── image.py
│   │   │   └── video.py
│   │   ├── thumbnail/       # 缩略图生成
│   │   ├── tags/            # 标签系统
│   │   │   ├── service.py   # 标签业务逻辑 (基于模板)
│   │   │   └── mapper.py    # 元数据映射器 (统一 EXIF/FFmpeg)
│   │   └── filesystem.py    # 文件系统扫描
│   ├── tasks/               # Taskiq 异步任务
│   │   ├── broker.py        # Redis Broker
│   │   ├── phash_tasks.py   # 感知哈希任务
│   │   └── README.md        # 任务系统文档
│   └── tools/               # 工具函数
│       ├── file_hash.py     # 文件哈希计算
│       ├── perceptual_hash.py  # 感知哈希计算
│       └── utils.py         # 通用工具
├── tests/                   # 测试 (pytest)
│   ├── conftest.py          # pytest 配置
│   └── unit/
│       └── services/
│           └── metadata/
│               └── test_video_extractor.py
├── scripts/                 # 脚本工具
├── requirements.txt         # 依赖列表
├── run.py                   # 启动脚本 (自动启动 Worker)
├── .env.example             # 环境变量示例
└── pyproject.toml           # pytest 配置
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

**示例**:
```bash
git commit -m "$(cat <<'EOF'
feat: 实现视频元数据提取功能

- 支持 MP4/MOV/AVI 格式
- 提取拍摄时间、GPS、设备信息
- 解析 ISO 6709 GPS 格式
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

### 添加新的元数据提取器

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

### 添加新的异步任务

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

```bash
cd backend

# 运行所有测试
pytest

# 运行特定测试
pytest tests/unit/services/metadata/test_video_extractor.py

# 查看覆盖率
pytest --cov=app --cov-report=html
```


---

## 重要配置

### 环境变量 (.env)

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
LOG_LEVEL=info              # 日志级别
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

**对比传统方案**:
```python
# ❌ 传统方案 (tag_id + type)
# 需要为 image 和 video 分别定义 device_make
tag_definitions:
  - id: 1, tag_key: 'image_device_make', type: 0
  - id: 2, tag_key: 'video_device_make', type: 1

asset_tags:
  - asset_id: 123, tag_id: 1, tag_value: 'Apple'  # 需要先查询 ID

# ✅ 新方案 (tag_key + template)
# 全局定义一次,通过模板配置复用
tag_definitions:
  - tag_key: 'device_make', tag_name: '设备制造商'

asset_template_tags:
  - template_type: 'image', tag_key: 'device_make'
  - template_type: 'video', tag_key: 'device_make'

asset_tags:
  - asset_id: 123, tag_key: 'device_make', tag_value: 'Apple'  # 直接使用 tag_key
```

**实现细节**:
- 元数据提取后,通过 `MetadataTagMapper` 统一映射为 tag_key
- `TagService` 根据 asset_type 查询模板配置,过滤有效标签
- 批量保存前去重检查,避免重复插入
- 数据库层 UNIQUE 约束兜底,确保 (asset_id, tag_key) 唯一

---

## 参考文档

- **Taskiq 文档**: [app/tasks/README.md](backend/app/tasks/README.md)
- **启动指南**: [STARTUP_GUIDE.md](backend/STARTUP_GUIDE.md)
- **Redis 安装**: [REDIS_SETUP.md](backend/REDIS_SETUP.md)
- **测试指南**: [tests/README.md](backend/tests/README.md)

---

**最后更新**: 2026-01-05
**版本**: v1.1.0

**v1.1.0 更新内容** (2026-01-05):
- 新增标签系统 (tag_key 关联 + 模板系统)
- 支持自动提取并保存 EXIF/FFmpeg 元数据为结构化标签
- 15 个预定义全局标签,支持 image 和 video 跨类型复用
- 缩略图命名优化: `{filename}_thumbnail.webp`
