"""Taskiq Broker 配置

使用 Redis 作为消息队列 Broker。
"""
from taskiq_redis import ListQueueBroker
from ..config import settings
from ..tools.utils import get_logger
from redis.maint_notifications import MaintNotificationsConfig

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
#
# redis-py 8 默认 socket_timeout=5。ListQueueBroker.listen() 使用 BRPOP timeout=0
# （服务端无限阻塞等任务）；若不关掉客户端读超时，空闲约 5 秒就会
# Timeout reading from localhost:6379，Worker 崩溃后被 process-manager 反复拉起。
broker = ListQueueBroker(
    url=get_redis_url(),
    queue_name="lumiharbor_tasks",  # 任务队列名称
    max_connection_pool_size=10,  # 连接池大小（需 ≥ worker 数 + 1）
    socket_timeout=None,  # BRPOP 必须能无限等待
    socket_connect_timeout=5,  # 仅限制建连阶段
    maint_notifications_config=MaintNotificationsConfig(enabled=False) # 禁用维护通知，避免非redis 8 没有子命令，打印警告
)

logger.info(f"✅ Taskiq Broker 初始化完成 - Redis: {settings.REDIS_HOST}:{settings.REDIS_PORT}/{settings.REDIS_DB}")
