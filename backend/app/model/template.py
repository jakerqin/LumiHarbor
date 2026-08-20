"""展示/导入/筛选模板模型"""
from sqlalchemy import Column, String, DateTime, BIGINT, Boolean, JSON, func
from ..db import Base


class Template(Base):
    """配置模板表

    按 kind 区分导入允许写入、详情展示、筛选栏、卡片展示。
    """
    __tablename__ = "templates"

    id = Column(BIGINT, primary_key=True, autoincrement=True, comment='模板ID')
    code = Column(String(80), unique=True, nullable=False, index=True, comment='稳定键: image_detail')
    name = Column(String(200), nullable=False, comment='后台展示名')
    kind = Column(
        String(20),
        nullable=False,
        index=True,
        comment='ingest / detail / filter / card'
    )
    asset_type = Column(
        String(20),
        nullable=True,
        index=True,
        comment='image / video / audio；空表示全类型'
    )
    is_default = Column(Boolean, nullable=False, default=False, comment='同 kind+asset_type 默认模板')
    extra_info = Column(JSON, nullable=True, comment='扩展信息')
    created_at = Column(DateTime, server_default=func.now(), comment='创建时间')
    updated_at = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        comment='更新时间'
    )
    is_deleted = Column(Boolean, nullable=False, default=False, server_default='0', comment='是否删除')
