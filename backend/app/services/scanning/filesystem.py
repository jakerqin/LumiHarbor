"""文件系统扫描器

负责扫描本地文件系统并发现支持的素材文件。
"""
import os
from pathlib import Path
from typing import List, Dict, Set
from datetime import datetime
from ...tools.utils import get_logger

logger = get_logger(__name__)


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
        supported_extensions = cls.get_supported_extensions()

        logger.info(f"开始扫描目录: {root_path}")

        for root, dirs, files in os.walk(root_path):
            for file in files:
                ext = Path(file).suffix.lower()

                if ext not in supported_extensions:
                    continue

                try:
                    full_path = os.path.join(root, file)
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
                    logger.error(f"处理文件失败 {file}: {e}")
                    continue

        logger.info(f"扫描完成，共发现 {len(assets_to_import)} 个素材文件")
        return assets_to_import
