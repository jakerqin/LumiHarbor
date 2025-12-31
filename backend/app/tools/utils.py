"""
通用工具模块
"""
import logging
import sys
from typing import Optional
from ..config import settings


def get_logger(name) -> logging.Logger:
    """获取配置好的logger实例

    日志格式: 时间戳 模块名 日志级别 文件名:行号 - 日志内容
    示例: 2024-01-15 10:30:45,123 app.routers.management INFO management.py:36 - 开始触发历史素材导入任务

    Args:
        name: logger名称,通常传入 __name__,如果不传则使用根logger

    Returns:
        配置好的Logger实例

    使用示例:
        from app.tools.utils import get_logger

        logger = get_logger(__name__)
        logger.info("这是一条信息日志")
        logger.error("这是一条错误日志")
    """
    # 获取logger实例
    _logger = logging.getLogger(name or settings.PROJECT_NAME)

    # 避免重复添加handler(如果已经配置过就直接返回)
    if _logger.handlers:
        return _logger

    # 设置日志级别
    _logger.setLevel(logging.INFO)

    # 创建控制台输出handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)

    # 自定义日志格式
    # 设置日志格式 时间戳 模块名 日志级别 文件名:行号 - 日志内容
    formatter = logging.Formatter(
        fmt='%(asctime)s %(name)s %(levelname)s %(filename)s:%(lineno)d - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )

    # 将格式化器添加到handler
    console_handler.setFormatter(formatter)

    # 将handler添加到logger
    _logger.addHandler(console_handler)

    # 防止日志传播到父logger(避免重复输出)
    _logger.propagate = False

    return _logger

