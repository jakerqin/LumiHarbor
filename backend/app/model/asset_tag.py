"""资源标签关联模型"""
from sqlalchemy import Column, String, DateTime, BIGINT, Boolean, Text
from datetime import datetime
from ..db import Base


class AssetTag(Base):
    """资源标签关联表

    用于存储资源与标签定义之间的多对多关系及标签值。

    Attributes:
        id: 关联记录ID
        asset_id: 资源ID（外键关联 assets 表）
        tag_id: 标签定义ID（外键关联 tag_definitions 表）
        tag_value: 标签值（根据标签类型存储不同格式的数据）
        created_at: 创建时间
        updated_at: 更新时间
        is_deleted: 是否删除（软删除标记）
    """
    __tablename__ = "asset_tags"

    # 主键
    id = Column(BIGINT, primary_key=True, autoincrement=True, comment='关联记录ID')

    # 关联外键
    asset_id = Column(
        BIGINT,
        nullable=False,
        index=True,
        comment='资源ID'
    )
    tag_id = Column(
        BIGINT,
        nullable=False,
        index=True,
        comment='标签定义ID'
    )

    # 标签值（多类型存储）
    tag_value = Column(
        Text,
        nullable=True,
        comment='标签值'
    )

    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow, comment='创建时间')
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        comment='更新时间'
    )
    is_deleted = Column(Boolean, nullable=False, default=False, comment='是否删除')
