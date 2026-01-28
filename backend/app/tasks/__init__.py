"""异步任务模块

使用 Taskiq + Redis 实现后台异步任务处理。

架构：
- broker.py: Taskiq Broker 配置（Redis 队列）
- phash_tasks.py: 感知哈希计算任务
- geocoding_tasks.py: 地理编码任务

使用方式：
    from app.tasks.phash_tasks import calculate_phash_task
    from app.tasks.geocoding_tasks import calculate_location_task

    # 发送异步任务
    await calculate_phash_task.kiq(
        asset_id=123,
        file_path="/path/to/file.jpg",
        asset_type="image"
    )

    await calculate_location_task.kiq(
        asset_id=123,
        longitude=116.4074,
        latitude=39.9042,
        task_log_id=1
    )

启动 Worker：
    taskiq worker app.tasks.broker:broker --workers 4
"""
from .broker import broker

# 重要：导入所有任务模块，确保任务被注册到 broker
# Worker 启动时会加载此模块，从而注册所有任务
from . import phash_tasks  # noqa: F401
from . import geocoding_tasks  # noqa: F401

__all__ = ['broker', 'phash_tasks', 'geocoding_tasks']
