"""家庭成员 / 宠物名单。"""
from sqlalchemy import Column, String, DateTime, BIGINT, Boolean, Index, func
from ..db import Base


class Subject(Base):
    """已登记的家人或宠物。无外键；软删除。"""
    __tablename__ = "subjects"

    id = Column(BIGINT, primary_key=True, autoincrement=True, comment="成员ID")
    name = Column(String(100), nullable=False, comment="显示名")
    kind = Column(String(20), nullable=False, comment="human | pet")
    species = Column(String(20), nullable=True, comment="宠物 cat/dog")
    cover_path = Column(String(255), nullable=True, comment="封面裁剪相对路径")
    created_by = Column(BIGINT, nullable=False, comment="创建者")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    is_deleted = Column(Boolean, nullable=False, default=False, comment="软删除")

    __table_args__ = (
        Index("idx_subjects_user_deleted", "created_by", "is_deleted"),
        Index("idx_subjects_kind_deleted", "kind", "is_deleted"),
    )
