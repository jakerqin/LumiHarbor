"""人脸 / 动物脸记录（业务权威；向量在 Qdrant）"""
from sqlalchemy import Column, String, DateTime, BIGINT, Boolean, Index, DECIMAL, func
from ..db import Base


class Face(Base):
    """素材上检出的一张脸。

    无外键；软删除。embedding 不落 MySQL。
    """
    __tablename__ = "faces"

    id = Column(BIGINT, primary_key=True, autoincrement=True, comment="脸记录ID")
    asset_id = Column(BIGINT, nullable=False, comment="素材ID")
    subject_id = Column(BIGINT, nullable=True, comment="名单成员ID")
    subject_type = Column(String(20), nullable=False, comment="human | animal")
    species = Column(String(50), nullable=True, comment="动物种类")
    bbox_x = Column(DECIMAL(8, 6), nullable=False, comment="归一化框左上 x")
    bbox_y = Column(DECIMAL(8, 6), nullable=False, comment="归一化框左上 y")
    bbox_w = Column(DECIMAL(8, 6), nullable=False, comment="归一化框宽")
    bbox_h = Column(DECIMAL(8, 6), nullable=False, comment="归一化框高")
    det_score = Column(DECIMAL(8, 6), nullable=True, comment="检测置信度")
    quality_score = Column(DECIMAL(8, 6), nullable=True, comment="质量分")
    embedding_model = Column(String(64), nullable=False, comment="embedding 模型名")
    qdrant_point_id = Column(String(64), nullable=True, comment="Qdrant point id")
    crop_path = Column(String(255), nullable=True, comment="脸裁剪相对路径")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    is_deleted = Column(Boolean, nullable=False, default=False, comment="软删除")

    __table_args__ = (
        Index("idx_faces_asset_deleted", "asset_id", "is_deleted"),
        Index("idx_faces_type_deleted", "subject_type", "is_deleted"),
        Index("idx_faces_subject_deleted", "subject_id", "is_deleted"),
    )
