"""元数据源键到 tag_key 的映射"""
from sqlalchemy import Column, String, DateTime, BIGINT, Boolean, Integer, func
from ..db import Base


class TagMapping(Base):
    """EXIF / FFmpeg 源键 → 统一 tag_key"""
    __tablename__ = "tag_mappings"

    id = Column(BIGINT, primary_key=True, autoincrement=True, comment='映射ID')
    tag_key = Column(String(100), nullable=False, index=True, comment='目标标签键')
    source_key = Column(String(200), nullable=False, comment='原始元数据键')
    asset_type = Column(
        String(20),
        nullable=True,
        comment='限定素材类型；空表示全类型'
    )
    transform = Column(
        String(40),
        nullable=False,
        default='identity',
        comment='identity / aspect_ratio / gps_dms'
    )
    priority = Column(Integer, nullable=False, default=0, comment='同 tag_key 优先级，小者优先')
    created_at = Column(DateTime, server_default=func.now(), comment='创建时间')
    updated_at = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        comment='更新时间'
    )
    is_deleted = Column(Boolean, nullable=False, default=False, server_default='0', comment='是否删除')
