"""AI 修图 / 生图任务"""
from sqlalchemy import BIGINT, JSON, Column, DateTime, Index, String, Text, func

from ..db import Base


class AiImageJob(Base):
    """一次调用图像模型的请求。修图结果落 asset_versions，生图结果入库成新素材。"""
    __tablename__ = "ai_image_jobs"

    id = Column(BIGINT, primary_key=True, autoincrement=True, comment="任务ID")
    job_type = Column(String(20), nullable=False, comment="edit | generate")
    asset_id = Column(BIGINT, nullable=True, comment="修图的源素材")
    reference_asset_ids = Column(JSON, nullable=True, comment="生图参考素材ID列表")
    preset_code = Column(String(50), nullable=True, comment="预设代码")
    prompt = Column(Text, nullable=True, comment="用户输入的描述")
    model = Column(String(64), nullable=False, comment="模型名")
    quality = Column(String(20), nullable=False, comment="low | medium | high ...")
    size = Column(String(20), nullable=True, comment="WIDTHxHEIGHT 或 auto")
    status = Column(String(20), nullable=False, default="pending", comment="pending | running | success | failed")
    error_message = Column(Text, nullable=True, comment="失败原因（面向用户）")
    result_version_id = Column(BIGINT, nullable=True, comment="修图结果版本")
    result_asset_id = Column(BIGINT, nullable=True, comment="生图结果素材")
    created_by = Column(BIGINT, nullable=False, comment="创建者")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index("idx_ai_image_jobs_user_created", "created_by", "created_at"),
        Index("idx_ai_image_jobs_asset", "asset_id"),
    )
