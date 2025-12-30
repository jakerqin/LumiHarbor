"""
Models Package

导出所有数据库模型，使其他模块可以通过以下方式导入：
    from app.model import User, Asset, Note, TagDefinition, AssetTag, Base

模型说明：
    User: 用户表
    Asset: 资源表（图片、视频、音频等多媒体素材）
    Note: 叙事笔记表
    TagDefinition: 标签元数据定义表
    AssetTag: 资源标签关联表
"""
from ..db import Base
from .user import User
from .asset import Asset
from .note import Note
from .tag_definition import TagDefinition
from .asset_tag import AssetTag

# 导出所有模型，方便其他模块导入
__all__ = [
    'Base',
    'User',
    'Asset',
    'Note',
    'TagDefinition',
    'AssetTag',
]
