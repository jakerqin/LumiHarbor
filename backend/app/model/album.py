"""相册模型"""
from sqlalchemy import Column, String, DateTime, BIGINT, Boolean, Text, Index, func
from ..db import Base


class Album(Base):
    """相册表（管理照片、视频等素材的集合）

    Attributes:
        id: 相册唯一ID
        name: 相册名称
        description: 相册描述
        start_time: 相册开始时间（素材最早拍摄时间，自动维护）
        end_time: 相册结束时间（素材最晚拍摄时间，自动维护）
        cover_asset_id: 封面素材ID（自动选择或手动指定）
        visibility: 可见性（general: 公共, private: 私有）
        created_by: 创建者用户ID
        created_at: 创建时间
        updated_at: 更新时间
        is_deleted: 是否删除（软删除标记）
    """
    __tablename__ = "albums"

    # 主键
    id = Column(BIGINT, primary_key=True, autoincrement=True, comment='相册唯一ID')

    # 基础信息
    name = Column(String(255), nullable=False, comment='相册名称')
    description = Column(Text, nullable=True, comment='相册描述')

    # 时间范围（自动维护）
    start_time = Column(DateTime, nullable=True, index=True, comment='相册开始时间（素材最早拍摄时间）')
    end_time = Column(DateTime, nullable=True, index=True, comment='相册结束时间（素材最晚拍摄时间）')

    # 封面设置
    cover_asset_id = Column(BIGINT, nullable=True, index=True, comment='封面素材ID（自动选择或手动指定）')

    # 权限控制
    visibility = Column(
        String(20),
        nullable=False,
        default='general',
        comment='可见性: general(公共), private(私有)'
    )
    created_by = Column(BIGINT, nullable=False, index=True, comment='创建者用户ID')

    # 时间戳
    created_at = Column(DateTime, server_default=func.now(), comment='创建时间')
    updated_at = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        comment='更新时间'
    )
    is_deleted = Column(Boolean, nullable=False, default=False, comment='是否删除（软删除标记）')

    # 复合索引（优化查询性能）
    __table_args__ = (
        # 基于时间范围查询优化
        Index('idx_time_range', 'start_time', 'end_time'),
    )
