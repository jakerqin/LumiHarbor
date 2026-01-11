"""资源模型"""
from sqlalchemy import Column, String, DateTime, BIGINT, Boolean, Index, func
from ..db import Base


class Asset(Base):
    """资源表（图片、视频、音频等多媒体素材）

    Attributes:
        id: 资源唯一ID
        created_by: 创建者用户ID
        original_path: NAS 物理相对路径
        thumbnail_path: 缩略图路径
        asset_type: 资源类型（image, video, audio）
        mime_type: MIME类型
        file_size: 文件大小（字节）
        file_hash: 文件内容哈希（SHA256，用于精确去重）
        phash: 感知哈希（用于查找相似素材）
        visibility: 可见性（general: 公共, private: 私有）
        shot_at: 拍摄时间
        created_at: 创建时间
        updated_at: 更新时间
        is_deleted: 是否删除（软删除标记）
    """
    __tablename__ = "assets"

    # 主键
    id = Column(BIGINT, primary_key=True, autoincrement=True, comment='资源唯一ID')
    created_by = Column(BIGINT, nullable=False, index=True, comment='创建者用户ID')

    # 核心物理属性
    original_path = Column(String(255), nullable=False, index=True, comment='NAS 物理相对路径')
    thumbnail_path = Column(String(255), nullable=True, comment='缩略图路径')

    # 文件基础信息
    asset_type = Column(String(20), nullable=False, comment='资源类型: image, video, audio')
    mime_type = Column(String(100), comment='MIME类型: image/jpeg, video/mp4')
    file_size = Column(BIGINT, comment='文件大小（字节）')

    # 哈希字段（用于去重和相似搜索）
    file_hash = Column(String(64), nullable=True, index=True, comment='文件内容哈希（SHA256，用于精确去重）')
    phash = Column(String(64), nullable=True, comment='感知哈希（用于查找相似素材，如相似图片搜索）')

    # 权限控制
    visibility = Column(
        String(20),
        nullable=False,
        default='general',
        comment='可见性: general(公共), private(私有)'
    )

    # 时间戳
    shot_at = Column(DateTime, nullable=True, index=True, comment='拍摄时间')
    created_at = Column(DateTime, server_default=func.now(), comment='创建时间')
    updated_at = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        comment='更新时间'
    )
    is_deleted = Column(Boolean, nullable=False, default=False, comment='是否删除')

    # 复合索引（优化查询性能）
    __table_args__ = (
        # 基于哈希去重查询优化
        Index('idx_file_hash_not_deleted', 'file_hash', 'is_deleted'),
        # 基于路径查询优化（使用前缀索引，避免超过 3072 字节限制）
        Index('idx_original_path_not_deleted', 'original_path', 'is_deleted',
              mysql_length={'original_path': 255}),
        # 基于创建者和时间查询优化
        Index('idx_created_by_shot_at', 'created_by', 'shot_at'),
    )
