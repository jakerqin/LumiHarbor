"""素材验证器

负责素材的去重检查和验证逻辑。
"""
from sqlalchemy.orm import Session
from ...model import Asset
from ...tools.file_hash import calculate_file_hash
from ...tools.utils import get_logger
import os

logger = get_logger(__name__)


class AssetValidator:
    """素材验证器

    职责：
    - 计算文件哈希
    - 基于文件哈希去重
    - 区分完全相同和重复备份
    """

    def __init__(self, db: Session):
        """初始化验证器

        Args:
            db: 数据库会话
        """
        self.db = db

    def calculate_hash(self, file_path: str) -> str:
        """计算文件哈希

        Args:
            file_path: 文件完整路径

        Returns:
            SHA256 哈希值
        """
        return calculate_file_hash(file_path, smart_mode=True)

    def check_duplicate(self, file_hash: str, original_path: str) -> tuple[bool, str]:
        """检查素材是否重复

        Args:
            file_hash: 文件哈希
            original_path: 原始路径（相对路径）

        Returns:
            (是否重复, 重复类型)
            - (False, '') - 不重复
            - (True, 'same') - 完全相同（路径也相同）
            - (True, 'duplicate') - 重复备份（内容相同但路径不同）
        """
        existing = self.db.query(Asset).filter(
            Asset.file_hash == file_hash,
            Asset.is_deleted == False
        ).first()

        if not existing:
            return False, ''

        # 完全相同的文件（路径也相同）
        if existing.original_path == original_path:
            return True, 'same'

        # 重复备份/副本（内容相同，路径不同）
        return True, 'duplicate'

    def validate_asset(self, file_path: str, relative_path: str) -> tuple[bool, str, str]:
        """验证素材（组合方法）

        Args:
            file_path: 文件完整路径
            relative_path: 相对路径

        Returns:
            (是否通过验证, 文件哈希, 拒绝原因)
        """
        # 计算哈希
        file_hash = self.calculate_hash(file_path)

        # 去重检查
        is_duplicate, dup_type = self.check_duplicate(file_hash, relative_path)

        if is_duplicate:
            if dup_type == 'same':
                return False, file_hash, "已存在相同文件"
            else:
                return False, file_hash, "发现重复备份"

        return True, file_hash, ""
