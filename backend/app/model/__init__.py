"""
Models Package

导出所有数据库模型，使其他模块可以通过以下方式导入：
    from app.model import User, Asset, Note, TagDefinition, AssetTag, AssetTemplateTag, Album, AlbumAsset, TaskLog, Base

模型说明：
    User: 用户表
    Asset: 资源表（图片、视频、音频等多媒体素材）
    Note: 叙事笔记表
    TagDefinition: 标签元数据定义表（全局）
    AssetTag: 资源标签关联表
    AssetTemplateTag: 资源模板与标签关联表
    Album: 相册表
    AlbumAsset: 相册素材关联表
    TaskLog: 异步任务日志表（通用）
"""
from ..db import Base
from .user import User
from .asset import Asset
from .note import Note
from .tag_definition import TagDefinition
from .asset_tag import AssetTag
from .asset_template_tag import AssetTemplateTag
from .album import Album
from .album_asset import AlbumAsset
from .task_log import TaskLog

# 导出所有模型，方便其他模块导入
__all__ = [
    'Base',
    'User',
    'Asset',
    'Note',
    'TagDefinition',
    'AssetTag',
    'AssetTemplateTag',
    'Album',
    'AlbumAsset',
    'TaskLog',
]
