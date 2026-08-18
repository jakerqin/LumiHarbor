"""通用工具：日志入口。格式在模块加载时配置一次。"""
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(name)s %(levelname)s %(filename)s:%(lineno)d - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
)


def get_logger(name) -> logging.Logger:
    return logging.getLogger(name)
