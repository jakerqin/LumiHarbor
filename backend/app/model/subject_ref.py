"""名单登记照（参考向量落 Qdrant）。"""
from sqlalchemy import Column, String, DateTime, BIGINT, Boolean, Index, func
from ..db import Base


class SubjectRef(Base):
    """一条登记照。无外键；软删除。"""
    __tablename__ = "subject_refs"

    id = Column(BIGINT, primary_key=True, autoincrement=True, comment="登记照ID")
    subject_id = Column(BIGINT, nullable=False, comment="成员ID")
    source = Column(String(20), nullable=False, comment="upload | asset")
    asset_id = Column(BIGINT, nullable=True, comment="来源素材，上传可空")
    crop_path = Column(String(255), nullable=True, comment="裁剪相对路径")
    embedding_model = Column(String(64), nullable=False, comment="buffalo_s / animal-onnx-768")
    qdrant_point_id = Column(String(64), nullable=True, comment="Qdrant point id")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    is_deleted = Column(Boolean, nullable=False, default=False, comment="软删除")

    __table_args__ = (
        Index("idx_subject_refs_subject_deleted", "subject_id", "is_deleted"),
    )
