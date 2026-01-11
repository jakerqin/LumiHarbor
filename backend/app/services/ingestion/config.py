"""导入配置对象"""
from dataclasses import dataclass
from typing import Optional
from datetime import datetime


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

    # 相册导入配置
    import_to_album: bool = False  # 是否导入到相册
    album_id: Optional[int] = None  # 现有相册ID
    album_name: Optional[str] = None  # 新建相册名称
    album_start_time: Optional[datetime] = None  # 相册开始时间（仅创建新相册时使用）
    album_end_time: Optional[datetime] = None  # 相册结束时间（仅创建新相册时使用）

    # 默认经纬度配置
    default_gps: Optional[tuple[float, float]] = None  # 默认经纬度 (longitude, latitude)

    def __post_init__(self):
        """验证配置参数"""
        if not self.scan_path:
            raise ValueError("scan_path 不能为空")

        if not self.created_by:
            raise ValueError("created_by 不能为空")

        if self.visibility not in ["general", "private"]:
            raise ValueError(f"visibility 必须是 'general' 或 'private', 当前值: {self.visibility}")

        # 验证相册配置
        if self.import_to_album:
            if self.album_id is None and self.album_name is None:
                raise ValueError("当 import_to_album=True 时，album_id 或 album_name 必须提供一个")
            if self.album_id is not None and self.album_name is not None:
                raise ValueError("album_id 和 album_name 只能提供一个")
