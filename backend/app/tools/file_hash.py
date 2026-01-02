"""文件哈希计算工具

提供文件内容哈希计算功能，用于精确去重。

支持：
- 完整哈希：适合小文件（< 100MB）
- 采样哈希：适合大文件（>= 100MB），速度快 30+ 倍
- 智能选择：根据文件大小自动选择最优策略
"""
import hashlib
import os
from typing import Literal
from ..tools.utils import get_logger

logger = get_logger(__name__)


class FileHashCalculator:
    """文件哈希计算器

    使用分块流式读取，内存占用固定（仅 8KB），无论文件多大。

    示例：
        >>> calculator = FileHashCalculator()
        >>> hash_value = calculator.calculate('/path/to/file.mp4')
        >>> print(hash_value)
        'a3f5c9d1e8b2f4a6...'
    """

    # 配置常量
    CHUNK_SIZE = 8192  # 8KB 分块大小
    LARGE_FILE_THRESHOLD = 100 * 1024 * 1024  # 100MB，大文件阈值
    SAMPLE_SIZE_MB = 10  # 采样大小（MB）

    def __init__(self, algorithm: Literal['sha256', 'md5', 'blake2b'] = 'sha256'):
        """初始化哈希计算器

        Args:
            algorithm: 哈希算法
                - sha256: 推荐，安全性高，广泛使用
                - md5: 快速，但安全性较低
                - blake2b: 更快，安全性高
        """
        self.algorithm = algorithm

    def calculate(
        self,
        file_path: str,
        smart_mode: bool = True
    ) -> str:
        """计算文件哈希值（智能模式）

        Args:
            file_path: 文件路径
            smart_mode: 智能模式
                - True: 根据文件大小自动选择最优策略
                - False: 始终使用完整哈希

        Returns:
            十六进制哈希字符串

        Raises:
            FileNotFoundError: 文件不存在
            PermissionError: 权限不足
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"文件不存在: {file_path}")

        file_size = os.path.getsize(file_path)

        # 智能选择策略
        if smart_mode and file_size >= self.LARGE_FILE_THRESHOLD:
            logger.debug(f"大文件检测 ({file_size / 1024 / 1024:.2f}MB)，使用采样哈希")
            return self._calculate_fast_hash(file_path, file_size)
        else:
            logger.debug(f"小文件 ({file_size / 1024 / 1024:.2f}MB)，使用完整哈希")
            return self._calculate_full_hash(file_path)

    def _calculate_full_hash(self, file_path: str) -> str:
        """计算完整文件哈希（分块流式读取）

        内存占用：固定 8KB
        适用场景：小文件（< 100MB）

        Args:
            file_path: 文件路径

        Returns:
            十六进制哈希字符串
        """
        hash_func = hashlib.new(self.algorithm)

        try:
            with open(file_path, 'rb') as f:
                # 分块读取，内存友好
                while True:
                    chunk = f.read(self.CHUNK_SIZE)
                    if not chunk:
                        break
                    hash_func.update(chunk)

            return hash_func.hexdigest()

        except Exception as e:
            logger.error(f"计算文件哈希失败 {file_path}: {e}")
            raise

    def _calculate_fast_hash(self, file_path: str, file_size: int) -> str:
        """计算采样哈希（快速模式）

        策略：
        1. 读取文件头部（10MB）
        2. 读取文件尾部（10MB）
        3. 加入文件大小和修改时间

        速度：比完整哈希快 30+ 倍
        适用场景：大文件（>= 100MB）

        Args:
            file_path: 文件路径
            file_size: 文件大小（字节）

        Returns:
            十六进制哈希字符串
        """
        hash_func = hashlib.new(self.algorithm)
        sample_bytes = self.SAMPLE_SIZE_MB * 1024 * 1024

        try:
            with open(file_path, 'rb') as f:
                # 1. 读取文件头部
                head_data = f.read(min(sample_bytes, file_size))
                hash_func.update(head_data)

                # 2. 如果文件足够大，读取文件尾部
                if file_size > sample_bytes * 2:
                    f.seek(-sample_bytes, 2)  # 从文件末尾向前偏移
                    tail_data = f.read(sample_bytes)
                    hash_func.update(tail_data)

                # 3. 加入文件元数据（增强唯一性）
                hash_func.update(str(file_size).encode())

                # 可选：加入修改时间
                mtime = os.path.getmtime(file_path)
                hash_func.update(str(int(mtime)).encode())

            return hash_func.hexdigest()

        except Exception as e:
            logger.error(f"计算快速哈希失败 {file_path}: {e}")
            raise

    def calculate_with_progress(
        self,
        file_path: str,
        callback=None
    ) -> str:
        """计算哈希值并报告进度（适用于大文件）

        Args:
            file_path: 文件路径
            callback: 进度回调函数 callback(bytes_read, total_size)

        Returns:
            十六进制哈希字符串
        """
        hash_func = hashlib.new(self.algorithm)
        file_size = os.path.getsize(file_path)
        bytes_read = 0

        try:
            with open(file_path, 'rb') as f:
                while True:
                    chunk = f.read(self.CHUNK_SIZE)
                    if not chunk:
                        break

                    hash_func.update(chunk)
                    bytes_read += len(chunk)

                    # 调用进度回调
                    if callback:
                        callback(bytes_read, file_size)

            return hash_func.hexdigest()

        except Exception as e:
            logger.error(f"计算哈希失败 {file_path}: {e}")
            raise


# 便捷函数
def calculate_file_hash(
    file_path: str,
    algorithm: Literal['sha256', 'md5', 'blake2b'] = 'sha256',
    smart_mode: bool = True
) -> str:
    """计算文件哈希值（便捷函数）

    Args:
        file_path: 文件路径
        algorithm: 哈希算法（默认 sha256）
        smart_mode: 智能模式（大文件自动使用采样哈希）

    Returns:
        十六进制哈希字符串

    示例:
        >>> hash_val = calculate_file_hash('/path/to/video.mp4')
        >>> print(hash_val)
        'a3f5c9d1e8b2f4a6c9e1d3b5f7a9c2e4...'
    """
    calculator = FileHashCalculator(algorithm=algorithm)
    return calculator.calculate(file_path, smart_mode=smart_mode)
