"""文件哈希：导入去重用 SHA256。大文件（≥100MB）只采样头尾以换速度。"""
import hashlib
import os
from .utils import get_logger

logger = get_logger(__name__)

CHUNK_SIZE = 8192
LARGE_FILE_THRESHOLD = 100 * 1024 * 1024
SAMPLE_SIZE_MB = 10


def _full_hash(file_path: str) -> str:
    hash_func = hashlib.sha256()
    with open(file_path, 'rb') as f:
        while True:
            chunk = f.read(CHUNK_SIZE)
            if not chunk:
                break
            hash_func.update(chunk)
    return hash_func.hexdigest()


def _sample_hash(file_path: str, file_size: int) -> str:
    hash_func = hashlib.sha256()
    sample_bytes = SAMPLE_SIZE_MB * 1024 * 1024
    with open(file_path, 'rb') as f:
        hash_func.update(f.read(min(sample_bytes, file_size)))
        if file_size > sample_bytes * 2:
            f.seek(-sample_bytes, 2)
            hash_func.update(f.read(sample_bytes))
        hash_func.update(str(file_size).encode())
        hash_func.update(str(int(os.path.getmtime(file_path))).encode())
    return hash_func.hexdigest()


def calculate_file_hash(file_path: str, smart_mode: bool = True) -> str:
    """计算文件哈希。smart_mode 下 ≥100MB 走头尾采样。"""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"文件不存在: {file_path}")

    file_size = os.path.getsize(file_path)
    if smart_mode and file_size >= LARGE_FILE_THRESHOLD:
        logger.debug(f"大文件检测 ({file_size / 1024 / 1024:.2f}MB)，使用采样哈希")
        return _sample_hash(file_path, file_size)

    logger.debug(f"小文件 ({file_size / 1024 / 1024:.2f}MB)，使用完整哈希")
    return _full_hash(file_path)
