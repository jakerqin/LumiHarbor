"""叙事笔记模型"""
from sqlalchemy import Column, String, DateTime, BIGINT, Boolean, JSON, Text, func
from ..db import Base


class Note(Base):
    """叙事笔记表

    Attributes:
        id: 笔记唯一ID
        created_by: 创建者用户ID
        title: 笔记标题
        content: 笔记内容
        cover_asset_id: 封面素材ID（从素材库选择）
        is_encrypted: 是否加密
        related_assets: 关联的资源列表（JSON数组）
        shot_at: 叙事发生时间
        created_at: 创建时间
        updated_at: 更新时间
        is_deleted: 是否删除（软删除标记）
    """
    __tablename__ = "notes"

    # 主键
    id = Column(BIGINT, primary_key=True, autoincrement=True, comment='笔记ID')
    created_by = Column(BIGINT, nullable=False, index=True, comment='创建者用户ID')

    # 笔记内容
    title = Column(String(255), nullable=True, comment='笔记标题')
    content = Column(JSON, nullable=False, comment='笔记内容（Tiptap JSONContent）')
    cover_asset_id = Column(BIGINT, nullable=True, index=True, comment='封面素材ID')
    is_encrypted = Column(Boolean, default=False, comment='是否加密')
    related_assets = Column(JSON, nullable=True, comment='关联资源列表 (JSON 数组)')

    # 时间戳
    shot_at = Column(DateTime, nullable=True, index=True, comment='叙事发生时间')
    created_at = Column(DateTime, server_default=func.now(), comment='创建时间')
    updated_at = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        comment='更新时间'
    )
    is_deleted = Column(Boolean, nullable=False, default=False, comment='是否删除（软删除标记）')
