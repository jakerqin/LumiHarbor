# Taskiq 异步任务系统

## 概述

LumiHarbor 使用 **Taskiq + Redis** 实现后台异步任务处理，主要用于感知哈希（phash）计算等 CPU 密集型操作。

## 架构

```
FastAPI 应用
    ↓ (发送任务)
Redis 队列 (lumiharbor_tasks)
    ↓ (获取任务)
Taskiq Worker
    ↓ (执行任务)
更新数据库
```

## 依赖

- **Redis**: 消息队列 Broker
- **taskiq[redis]**: 异步任务框架
- **imagehash**: 感知哈希计算
- **Pillow**: 图像处理

## 目录结构

```
backend/app/tasks/
├── __init__.py          # 模块入口
├── broker.py            # Taskiq Broker 配置
└── phash_tasks.py       # 感知哈希计算任务
```

## 已实现的任务

### 1. 单个素材感知哈希计算

**任务名**: `calculate_phash`

**功能**: 异步计算单个素材的感知哈希值并更新数据库

**参数**:
- `asset_id` (int): 素材 ID
- `file_path` (str): 文件完整路径
- `asset_type` (str): 素材类型 (`image`, `video`, `audio`)

**返回值**:
```python
{
    'success': bool,      # 是否成功
    'asset_id': int,      # 素材 ID
    'phash': str | None,  # 感知哈希值（16 进制字符串）
    'message': str        # 执行消息
}
```

**调用示例**:
```python
from app.tasks.phash_tasks import calculate_phash_task

# 发送异步任务（不阻塞）
await calculate_phash_task.kiq(
    asset_id=123,
    file_path="/path/to/image.jpg",
    asset_type="image"
)
```

### 2. 批量感知哈希计算

**任务名**: `batch_calculate_phash`

**功能**: 批量计算多个素材的感知哈希（适用于数据迁移场景）

**参数**:
- `asset_ids` (list[int]): 素材 ID 列表

**返回值**:
```python
{
    'total': int,         # 总数
    'success': int,       # 成功数
    'failed': int,        # 失败数
    'details': list[dict] # 详细结果
}
```

**调用示例**:
```python
from app.tasks.phash_tasks import batch_calculate_phash_task

# 批量计算
await batch_calculate_phash_task.kiq(
    asset_ids=[1, 2, 3, 4, 5]
)
```

## 启动 Worker

### 开发环境

```bash
# 进入 backend 目录
cd backend

# 启动单个 Worker（支持热重载）
taskiq worker app.tasks.broker:broker --reload

# 查看详细日志
taskiq worker app.tasks.broker:broker --reload --log-level debug
```

### 生产环境

```bash
# 启动多个 Worker 进程（提高并发处理能力）
taskiq worker app.tasks.broker:broker --workers 4

# 使用 supervisor 或 systemd 管理（推荐）
# 见下方 "部署配置" 章节
```

### Worker 参数说明

| 参数 | 说明 | 示例 |
|------|------|------|
| `--workers` | Worker 进程数量 | `--workers 4` |
| `--reload` | 代码修改自动重载（仅开发） | `--reload` |
| `--log-level` | 日志级别 | `--log-level debug` |
| `--max-async-tasks` | 最大并发任务数 | `--max-async-tasks 10` |

## 配置

### Redis 配置

在 `.env` 文件中配置 Redis 连接信息:

```env
# Redis 配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=  # 可选，无密码留空
```

### Broker 配置

位置: `app/tasks/broker.py`

```python
broker = ListQueueBroker(
    url=get_redis_url(),
    queue_name="lumiharbor_tasks",  # 队列名称
    max_connection_pool_size=10,     # 连接池大小
)
```

## 任务监控

### 查看 Redis 队列

```bash
# 连接 Redis
redis-cli

# 查看队列长度
LLEN lumiharbor_tasks

# 查看队列内容（不删除）
LRANGE lumiharbor_tasks 0 -1

# 清空队列（慎用！）
DEL lumiharbor_tasks
```

### 日志监控

Worker 日志包含详细的任务执行信息:

- ✅ `✅ Phash 计算成功` - 任务执行成功
- ⚠️ `⚠️ Phash 计算返回空` - 任务跳过（如音频文件）
- ❌ `❌ Phash 计算失败` - 任务执行失败

## 部署配置

### 方式 1: Systemd Service（推荐）

创建 `/etc/systemd/system/lumiharbor-worker.service`:

```ini
[Unit]
Description=LumiHarbor Taskiq Worker
After=network.target redis.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/LumiHarbor/backend
Environment="PATH=/path/to/venv/bin"
ExecStart=/path/to/venv/bin/taskiq worker app.tasks.broker:broker --workers 4
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

启动服务:
```bash
sudo systemctl daemon-reload
sudo systemctl enable lumiharbor-worker
sudo systemctl start lumiharbor-worker
sudo systemctl status lumiharbor-worker
```

### 方式 2: Supervisor

创建 `/etc/supervisor/conf.d/lumiharbor-worker.conf`:

```ini
[program:lumiharbor-worker]
command=/path/to/venv/bin/taskiq worker app.tasks.broker:broker --workers 4
directory=/path/to/LumiHarbor/backend
user=www-data
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/lumiharbor/worker.log
```

启动:
```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start lumiharbor-worker
```

### 方式 3: Docker Compose

```yaml
version: '3.8'
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  worker:
    build: ./backend
    command: taskiq worker app.tasks.broker:broker --workers 4
    depends_on:
      - redis
    environment:
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    volumes:
      - ./backend:/app
```

## 故障排查

### 问题 1: Worker 无法连接 Redis

**症状**:
```
ConnectionError: Error 111 connecting to localhost:6379. Connection refused.
```

**解决方案**:
1. 检查 Redis 是否启动: `redis-cli ping`
2. 检查 `.env` 中的 Redis 配置
3. 确认防火墙未阻止 6379 端口

### 问题 2: 任务堆积在队列中

**症状**:
```bash
LLEN lumiharbor_tasks  # 返回很大的数字
```

**解决方案**:
1. 增加 Worker 数量: `--workers 8`
2. 检查 Worker 日志是否有错误
3. 检查任务是否死锁或耗时过长

### 问题 3: 任务执行失败

**症状**: Worker 日志显示 `❌ Phash 计算失败`

**解决方案**:
1. 检查文件路径是否正确
2. 检查文件权限（Worker 是否有读取权限）
3. 检查 imagehash 依赖是否正确安装
4. 查看详细错误堆栈（使用 `--log-level debug`）

## 性能优化

### 1. Worker 数量调整

```bash
# CPU 密集型任务：Worker 数量 = CPU 核心数
taskiq worker app.tasks.broker:broker --workers $(nproc)

# IO 密集型任务：Worker 数量 = CPU 核心数 × 2
taskiq worker app.tasks.broker:broker --workers $(($(nproc) * 2))
```

### 2. Redis 持久化配置

编辑 `/etc/redis/redis.conf`:

```conf
# 启用 AOF 持久化（防止任务丢失）
appendonly yes
appendfsync everysec

# 增加最大内存（根据服务器配置调整）
maxmemory 2gb
maxmemory-policy allkeys-lru
```

### 3. 任务重试策略

在 `phash_tasks.py` 中添加重试装饰器:

```python
from taskiq import TaskiqRetry

@broker.task(task_name="calculate_phash", retry=TaskiqRetry(max_retries=3, delay=5))
async def calculate_phash_task(...):
    ...
```

## 扩展任务

### 添加新任务

1. 在 `app/tasks/` 目录创建新文件（如 `face_detection_tasks.py`）
2. 定义任务函数:

```python
from .broker import broker

@broker.task(task_name="detect_faces")
async def detect_faces_task(asset_id: int, file_path: str):
    # 实现人脸检测逻辑
    ...
```

3. 在业务代码中调用:

```python
from app.tasks.face_detection_tasks import detect_faces_task

await detect_faces_task.kiq(asset_id=123, file_path="/path/to/photo.jpg")
```

## 相关文档

- [Taskiq 官方文档](https://taskiq-python.github.io/)
- [Redis 官方文档](https://redis.io/documentation)
- [感知哈希原理](https://github.com/JohannesBuchner/imagehash)

## 维护日志

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-01-02 | 初始化 | 创建 Taskiq 异步任务系统，实现 phash 计算 |
