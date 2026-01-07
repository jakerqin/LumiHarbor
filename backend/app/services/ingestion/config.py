"""导入配置对象"""
from dataclasses import dataclass


@dataclass
class ImportConfig:
    """素材导入配置

    封装所有导入相关的配置参数，避免方法参数过多。
    """

    # 基础配置
    scan_path: str  # 扫描路径
    created_by: int  # 创建者用户ID
    visibility: str = "general"  # 可见性: general/private

    # 数据库配置
    db: any = None  # 数据库会话

    def __post_init__(self):
        """验证配置参数"""
        if not self.scan_path:
            raise ValueError("scan_path 不能为空")

        if not self.created_by:
            raise ValueError("created_by 不能为空")

        if self.visibility not in ["general", "private"]:
            raise ValueError(f"visibility 必须是 'general' 或 'private', 当前值: {self.visibility}")
