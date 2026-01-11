"""相册素材关联模型"""
from sqlalchemy import Column, DateTime, BIGINT, Boolean, Integer, Index, UniqueConstraint, func
from ..db import Base


class AlbumAsset(Base):
    """相册素材关联表（多对多关系）

    Attributes:
        id: 关联记录ID
        album_id: 相册ID
        asset_id: 素材ID
        sort_order: 排序顺序（数字越小越靠前）
        created_at: 添加时间
        updated_at: 更新时间
        is_deleted: 是否删除（软删除标记）
    """
    __tablename__ = "album_assets"

    # 主键
    id = Column(BIGINT, primary_key=True, autoincrement=True, comment='关联记录ID')

    # 关联字段
    album_id = Column(BIGINT, nullable=False, index=True, comment='相册ID')
    asset_id = Column(BIGINT, nullable=False, index=True, comment='素材ID')

    # 排序字段
    sort_order = Column(Integer, nullable=False, default=0, comment='排序顺序（数字越小越靠前）')

    # 时间戳
    created_at = Column(DateTime, server_default=func.now(), comment='添加时间')
    updated_at = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        comment='更新时间'
    )
    is_deleted = Column(Boolean, nullable=False, default=False, comment='是否删除（软删除标记）')

    # 复合索引和唯一约束
    __table_args__ = (
        # 相册内排序优化
        Index('idx_album_sort', 'album_id', 'sort_order'),
        # 唯一约束：同一相册内不能重复添加同一素材
        UniqueConstraint('album_id', 'asset_id', name='uk_album_asset'),
    )
