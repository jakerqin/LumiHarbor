"""元数据字典表模型"""
from sqlalchemy import Column, String, DateTime, BIGINT, Boolean, Index, UniqueConstraint, func
from ..db import Base


class MetadataDictionary(Base):
    """元数据字典表

    用于维护系统内可复用的元数据值（如 location_poi），并按场景区分。

    Attributes:
        id: 记录ID
        scene_type: 场景类型（如 location_poi）
        value: 元数据值
        created_at: 创建时间
        updated_at: 更新时间
        is_deleted: 是否删除（软删除标记）
    """
    __tablename__ = "metadata_dictionary"

    id = Column(BIGINT, primary_key=True, autoincrement=True, comment='记录ID')
    scene_type = Column(String(100), nullable=False, index=True, comment='场景类型')
    value = Column(String(255), nullable=False, comment='元数据值')

    created_at = Column(DateTime, server_default=func.now(), comment='创建时间')
    updated_at = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        comment='更新时间'
    )
    is_deleted = Column(Boolean, nullable=False, default=False, comment='是否删除（软删除标记）')

    __table_args__ = (
        UniqueConstraint('scene_type', 'value', name='uk_scene_value'),
        Index('idx_scene_type', 'scene_type'),
    )
