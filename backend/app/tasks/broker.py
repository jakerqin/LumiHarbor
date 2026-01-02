"""Taskiq Broker 配置

使用 Redis 作为消息队列 Broker。
"""
from taskiq_redis import ListQueueBroker
from ..config import settings
from ..tools.utils import get_logger

logger = get_logger(__name__)


def get_redis_url() -> str:
    """构建 Redis 连接 URL

    Returns:
        Redis 连接字符串（格式: redis://[:password@]host:port/db）
    """
    if settings.REDIS_PASSWORD:
        return f"redis://:{settings.REDIS_PASSWORD}@{settings.REDIS_HOST}:{settings.REDIS_PORT}/{settings.REDIS_DB}"
    else:
        return f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}/{settings.REDIS_DB}"


# 创建 Redis Broker（使用 List 队列）
broker = ListQueueBroker(
    url=get_redis_url(),
    queue_name="lumiharbor_tasks",  # 任务队列名称
    max_connection_pool_size=10,     # 连接池大小
)

logger.info(f"✅ Taskiq Broker 初始化完成 - Redis: {settings.REDIS_HOST}:{settings.REDIS_PORT}/{settings.REDIS_DB}")
