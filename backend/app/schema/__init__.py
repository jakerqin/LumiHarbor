"""
Schemas Package

定义所有 Pydantic Schema，用于请求/响应验证。
导出所有 Schema 模型，使其他模块可以通过以下方式导入：
    from app.schema import AssetBase, AssetOut, AlbumCreate, AlbumOut, ApiResponse
    from app.schema.ingestion import ScanRequest, ScanResponse

Schema 说明：
    AssetBase: 资源基础 Schema（用于创建请求）
    AssetOut: 资源输出 Schema（用于响应）
    AlbumCreate: 创建相册请求 Schema
    AlbumUpdate: 更新相册请求 Schema
    AlbumOut: 相册输出 Schema
    AlbumDetailOut: 相册详情输出 Schema
    ApiResponse: 统一 API 响应格式
"""
from .asset import AssetBase, AssetOut, AssetsPageResponse
from .common import ApiResponse
from .tag_definition import TagDefinitionOut
from .album import (
    AlbumCreate,
    AlbumUpdate,
    AlbumOut,
    AlbumDetailOut,
    AlbumSortBy,
    AddAssetRequest,
    AddAssetsRequest,
    UpdateAssetSortRequest,
    SetCoverRequest,
    AlbumAssetOut,
)

# 导出所有 Schema，方便其他模块导入
__all__ = [
    'AssetBase',
    'AssetOut',
    'AssetsPageResponse',
    'ApiResponse',
    'TagDefinitionOut',
    'AlbumCreate',
    'AlbumUpdate',
    'AlbumOut',
    'AlbumDetailOut',
    'AlbumSortBy',
    'AddAssetRequest',
    'AddAssetsRequest',
    'UpdateAssetSortRequest',
    'SetCoverRequest',
    'AlbumAssetOut',
]
