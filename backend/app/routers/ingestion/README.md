# Ingestion 模块

## 概述

`ingestion` 模块负责将外部素材纳入 PersonalLifeFlow 系统的所有入口。该模块遵循**单一职责原则**，专注于素材的获取和导入，不涉及素材的管理和查询。

## 模块职责

- ✅ 本地文件系统扫描导入
- ✅ HTTP 上传接口（开发中）
- 🔜 目录监控自动导入（计划中）
- 🔜 第三方云存储同步（计划中）

## 路由端点

### 1. 扫描导入 `/ingestion/scan`

**方法**: `POST`

**描述**: 扫描指定文件系统路径下的素材文件并导入到系统

**参数**:
```json
{
  "source_path": "string (可选)",  // 扫描路径，默认使用 NAS_DATA_PATH
  "created_by": 1,                 // 创建者用户ID
  "visibility": "general"          // 可见性: 'general' | 'private'
}
```

**返回**:
```json
{
  "code": "0",
  "message": "操作成功",
  "data": {
    "status": "scanning",
    "path": "/path/to/scan",
    "message": "素材扫描任务已在后台启动"
  }
}
```

**示例**:
```bash
# 使用默认 NAS 路径扫描
curl -X POST "http://localhost:8000/ingestion/scan" \
  -H "Content-Type: application/json" \
  -d '{"created_by": 1, "visibility": "general"}'

# 指定自定义路径扫描
curl -X POST "http://localhost:8000/ingestion/scan" \
  -H "Content-Type: application/json" \
  -d '{"source_path": "/custom/path", "created_by": 1, "visibility": "private"}'
```

**功能特性**:
- ✅ 支持自定义扫描路径
- ✅ 后台异步处理，不阻塞请求
- ✅ 自动提取 EXIF 元数据
- ✅ 自动生成 WebP 格式缩略图
- ✅ 基于路径的去重机制
- ✅ 详细的导入进度日志

### 2. 上传导入 `/ingestion/upload` (开发中)

**方法**: `POST`

**描述**: 通过 HTTP 上传单个素材文件

**状态**: 🚧 开发中

### 3. 批量上传 `/ingestion/upload/batch` (开发中)

**方法**: `POST`

**描述**: 批量上传多个素材文件

**状态**: 🚧 开发中

## 支持的文件格式

### 图片格式
- `.jpg`, `.jpeg`
- `.png`
- `.heic`
- `.raw`

### 视频格式
- `.mp4`
- `.mov`
- `.avi`

## 导入流程

```
1. 扫描文件系统（过滤支持格式）
   ↓
2. 复制源文件到 NAS_DATA_PATH（入库）
   ↓
3. 提取元数据 (EXIF)
   ↓
4. 计算文件哈希 + 去重
   ↓
5. 创建数据库记录
   ↓
6. 生成缩略图 (400x400 WebP)
   ↓
7. 更新缩略图路径
```

## 技术细节

### 缩略图生成

- **格式**: WebP
- **尺寸**: 最大 400×400 (保持原始宽高比)
- **质量**: 80% 压缩率
- **存储路径**: `processed/thumbnails/{asset_id}.webp`

### 去重策略

基于 `file_hash` 字段进行去重，排除已软删除的资源。

### 错误处理

- 路径不存在时返回 404 错误
- 单个素材导入失败不影响其他素材
- 缩略图生成失败不影响素材记录创建
- 所有错误都有详细日志记录

## 依赖服务

- **HistorianService**: 负责文件扫描、元数据提取和缩略图生成
- **Database**: SQLAlchemy ORM 持久化
- **FastAPI BackgroundTasks**: 异步任务执行

## 未来扩展

### 目录监控 (计划)
```python
# 监控指定目录的文件变化，自动导入新增素材
@router.post("/monitor/start")
def start_directory_monitor(path: str):
    # TODO: 实现目录监控
    pass
```

### 云存储同步 (计划)
```python
# 从第三方云存储（如 Google Photos, iCloud）同步素材
@router.post("/sync/cloud")
def sync_from_cloud(provider: str, credentials: dict):
    # TODO: 实现云存储同步
    pass
```

## 最佳实践

1. **大批量导入**: 建议使用 `scan` 端点，而非多次调用 `upload`
2. **路径规范**: 确保扫描路径存在且有读取权限
3. **可见性设置**: 根据素材隐私级别合理设置 `visibility`
4. **错误监控**: 通过日志监控导入失败的素材，及时处理异常

## 相关模块

- **assets**: 素材查询和管理
- **management**: 系统管理任务
- **services.historian**: 核心业务逻辑实现
