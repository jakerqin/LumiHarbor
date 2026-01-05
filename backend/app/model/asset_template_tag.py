"""资源模板与标签关联模型"""
from sqlalchemy import Column, String, DateTime, BIGINT, Boolean, Integer
from datetime import datetime
from ..db import Base


class AssetTemplateTag(Base):
    """资源模板与标签关联表

    用于定义每种资源类型（模板）应该提取哪些标签。

    Attributes:
        id: 关联记录ID
        template_type: 模板类型（image/video/audio）
        tag_key: 标签键名
        sort_order: 排序顺序（前端展示）
        is_required: 是否必填标签
        created_at: 创建时间
        updated_at: 更新时间
        is_deleted: 是否删除（软删除标记）
    """
    __tablename__ = "asset_template_tags"

    # 主键
    id = Column(BIGINT, primary_key=True, autoincrement=True, comment='关联记录ID')

    # 模板配置
    template_type = Column(
        String(20),
        nullable=False,
        index=True,
        comment='模板类型: image, video, audio'
    )
    tag_key = Column(
        String(100),
        nullable=False,
        index=True,
        comment='标签键名'
    )
    sort_order = Column(
        Integer,
        default=0,
        comment='排序顺序（前端展示）'
    )
    is_required = Column(
        Boolean,
        default=False,
        comment='是否必填标签'
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
