"""异步任务模块

使用 Taskiq + Redis 实现后台异步任务处理。

架构：
- broker.py: Taskiq Broker 配置（Redis 队列）
- phash_tasks.py: 感知哈希计算任务

使用方式：
    from app.tasks.phash_tasks import calculate_phash_task

    # 发送异步任务
    await calculate_phash_task.kiq(
        asset_id=123,
        file_path="/path/to/file.jpg",
        asset_type="image"
    )

启动 Worker：
    taskiq worker app.tasks.broker:broker --workers 4
"""
from .broker import broker

__all__ = ['broker']
