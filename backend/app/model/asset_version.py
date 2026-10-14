"""素材版本（AI 修图结果；kind=original 记录原图的缩略图/预览路径，用于切回）"""
from sqlalchemy import BIGINT, Boolean, Column, DateTime, Index, Integer, String, func

from ..db import Base


class AssetVersion(Base):
    """素材的一个展示版本。

    原图文件（assets.original_path）永不改动；「设为当前」只改 assets.thumbnail_path / preview_path。
    无外键；软删除。
    """
    __tablename__ = "asset_versions"

    id = Column(BIGINT, primary_key=True, autoincrement=True, comment="版本ID")
    asset_id = Column(BIGINT, nullable=False, comment="素材ID")
    kind = Column(String(20), nullable=False, comment="original | ai_edit")
    job_id = Column(BIGINT, nullable=True, comment="生成它的 ai_image_jobs.id")
    file_path = Column(String(255), nullable=True, comment="版本大图相对路径（original 为空，用素材原图）")
    thumbnail_path = Column(String(255), nullable=True, comment="缩略图相对路径")
    preview_path = Column(String(255), nullable=True, comment="预览图相对路径")
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    created_by = Column(BIGINT, nullable=False, comment="创建者")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    is_deleted = Column(Boolean, nullable=False, default=False, comment="软删除")

    __table_args__ = (
        Index("idx_asset_versions_asset_deleted", "asset_id", "is_deleted"),
    )
