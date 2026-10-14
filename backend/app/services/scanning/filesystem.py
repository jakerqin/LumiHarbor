"""文件系统扫描器

负责扫描本地文件系统并发现支持的素材文件。
"""
import os
from pathlib import Path
from typing import Iterator, List, Dict, Set, Tuple
from datetime import datetime
from ...config import settings
from ...tools.utils import get_logger

logger = get_logger(__name__)

# NAS 根下的系统目录：回收站与派生文件（缩略图/预览图），扫描时不能当素材导入
RECYCLE_BIN_DIR = "recycle_bin"
PROCESSED_DIR = "processed"
NAS_RESERVED_DIRS = (RECYCLE_BIN_DIR, PROCESSED_DIR)


class FilesystemScanner:
    """文件系统扫描器

    支持的文件格式：
        图片: .jpg, .jpeg, .png, .heic, .raw
        视频: .mp4, .mov, .avi
    """

    # 支持的文件格式
    SUPPORTED_IMAGES: Set[str] = {'.jpg', '.jpeg', '.png', '.heic', '.raw'}
    SUPPORTED_VIDEOS: Set[str] = {'.mp4', '.mov', '.avi'}

    @classmethod
    def get_supported_extensions(cls) -> Set[str]:
        """获取所有支持的文件扩展名"""
        return cls.SUPPORTED_IMAGES | cls.SUPPORTED_VIDEOS

    @classmethod
    def get_asset_type(cls, file_ext: str) -> str:
        """根据文件扩展名判断素材类型

        Args:
            file_ext: 文件扩展名（如 '.jpg'）

        Returns:
            'image' 或 'video'

        Raises:
            ValueError: 不支持的文件格式
        """
        ext = file_ext.lower()
        if ext in cls.SUPPORTED_IMAGES:
            return 'image'
        elif ext in cls.SUPPORTED_VIDEOS:
            return 'video'
        else:
            raise ValueError(f"不支持的文件格式: {file_ext}")

    @classmethod
    def scan(
        cls,
        root_path: str,
        created_by: int,
        visibility: str = 'general'
    ) -> List[Dict]:
        """扫描目录并返回待导入的素材列表

        Args:
            root_path: 扫描根路径
            created_by: 创建者用户ID
            visibility: 素材可见性 ('general' 或 'private')

        Returns:
            素材信息字典列表，每个字典包含基础文件信息（不含元数据）
        """
        if not os.path.exists(root_path):
            logger.error(f"扫描路径不存在: {root_path}")
            raise FileNotFoundError(f"扫描路径不存在: {root_path}")

        assets_to_import = []

        logger.info(f"开始扫描目录: {root_path}")

        for full_path, ext in cls._iter_media_files(root_path):
            try:
                rel_path = os.path.relpath(full_path, root_path)

                # 获取文件基础信息
                file_size = os.path.getsize(full_path)
                asset_type = cls.get_asset_type(ext)
                created_time = datetime.fromtimestamp(os.path.getctime(full_path))

                asset = {
                    "created_by": created_by,
                    "original_path": rel_path,
                    "asset_type": asset_type,
                    "file_size": file_size,
                    "mime_type": f"{asset_type}/{ext.lstrip('.')}",
                    "visibility": visibility,
                    "file_created_at": created_time,  # 文件创建时间（备用）
                    "is_deleted": False,
                }

                assets_to_import.append(asset)

            except Exception as e:
                logger.error(f"处理文件失败 {full_path}: {e}")
                continue

        logger.info(f"扫描完成，共发现 {len(assets_to_import)} 个素材文件")
        return assets_to_import

    @classmethod
    def _iter_media_files(cls, root_path: str) -> Iterator[Tuple[str, str]]:
        """递归列出支持的素材文件，返回 (完整路径, 小写扩展名)

        跳过：
        - NAS 根下的 recycle_bin/、processed/（只按 NAS 根精确匹配，不误伤同名普通目录）
        - 隐藏目录（macOS 的 .Trashes、.Spotlight-V100、.fseventsd 等）
        - macOS 在 exFAT/FAT（SD 卡、外接盘）上生成的 `._xxx` 伴生文件（扩展名同原图，但不是图片）
        """
        supported_extensions = cls.get_supported_extensions()
        reserved_dirs = cls._nas_reserved_dirs()

        for root, dirs, files in os.walk(root_path):
            dirs[:] = [
                d for d in dirs
                if not d.startswith('.') and Path(root, d).resolve() not in reserved_dirs
            ]
            for file in files:
                ext = Path(file).suffix.lower()
                if file.startswith('._') or ext not in supported_extensions:
                    continue
                yield os.path.join(root, file), ext

    @staticmethod
    def _nas_reserved_dirs() -> Set[Path]:
        if not settings.NAS_DATA_PATH:
            return set()
        nas_root = Path(settings.NAS_DATA_PATH).expanduser().resolve()
        return {nas_root / name for name in NAS_RESERVED_DIRS}
