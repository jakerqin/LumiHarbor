"""通用工具：日志入口。格式在模块加载时配置一次。"""
import logging

# Pillow 在 DEBUG 下会把每张图的 EXIF tag 打出来，和业务 DEBUG 无关
_NOISY = (
    "PIL",
    "PIL.TiffImagePlugin",
    "PIL.Image",
    "httpcore",
    "httpx",
    "urllib3",
    "taskiq.receiver.params_parser",
    "qdrant_client",
    "onnxruntime",
    "insightface",
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(name)s %(levelname)s %(filename)s:%(lineno)d - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
)


def quiet_third_party_logs() -> None:
    for name in _NOISY:
        noisy = logging.getLogger(name)
        noisy.setLevel(logging.WARNING)
        noisy.propagate = False


quiet_third_party_logs()


def get_logger(name) -> logging.Logger:
    quiet_third_party_logs()
    return logging.getLogger(name)
