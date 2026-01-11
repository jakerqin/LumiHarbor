"""用户收藏模型"""
from sqlalchemy import Column, BIGINT, DateTime, Boolean, Index, UniqueConstraint, func
from ..db import Base


class UserFavorite(Base):
    """用户收藏表（多对多关系）

    实现多对多关系：
    - 一个用户可以收藏多个素材
    - 一个素材可以被多个用户收藏

    设计要点：
    - uk_user_asset 唯一约束防止重复收藏
    - idx_user_favorited 索引优化收藏列表查询
    - favorited_at 字段用于排序
    - is_deleted 软删除字段（系统标准）

    数据示例：
        user_id=1, asset_id=123  → 用户1收藏照片123
        user_id=2, asset_id=123  → 用户2也收藏照片123（完全独立）
        user_id=1, asset_id=456  → 用户1收藏照片456
    """
    __tablename__ = "user_favorites"

    id = Column(
        BIGINT,
        primary_key=True,
        autoincrement=True,
        comment='收藏记录ID'
    )
    user_id = Column(
        BIGINT,
        nullable=False,
        index=True,
        comment='用户ID（关联 users 表）'
    )
    asset_id = Column(
        BIGINT,
        nullable=False,
        index=True,
        comment='素材ID（关联 assets 表）'
    )
    favorited_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now(),
        comment='收藏时间（用于排序）'
    )
    created_at = Column(
        DateTime,
        server_default=func.now(),
        comment='创建时间'
    )
    is_deleted = Column(
        Boolean,
        default=False,
        nullable=False,
        comment='软删除标记'
    )

    __table_args__ = (
        # 唯一约束：同一用户不能重复收藏同一素材
        UniqueConstraint('user_id', 'asset_id', name='uk_user_asset'),
        # 性能索引：查询用户收藏列表（按时间排序）
        Index('idx_user_favorited', 'user_id', 'favorited_at'),
    )
