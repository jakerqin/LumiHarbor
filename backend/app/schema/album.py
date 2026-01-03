"""相册相关 Schema"""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List
from enum import Enum


class AlbumSortBy(str, Enum):
    """相册排序字段枚举"""
    CREATED_AT = "created_at"  # 创建时间
    UPDATED_AT = "updated_at"  # 更新时间
    NAME = "name"              # 相册名称
    START_TIME = "start_time"  # 开始时间


class AlbumCreate(BaseModel):
    """创建相册请求 Schema

    Attributes:
        name: 相册名称
        description: 相册描述
        visibility: 可见性（general: 公共, private: 私有）
    """
    name: str = Field(..., min_length=1, max_length=255, description="相册名称")
    description: Optional[str] = Field(None, description="相册描述")
    visibility: str = Field(default="general", description="可见性: general(公共), private(私有)")


class AlbumUpdate(BaseModel):
    """更新相册请求 Schema

    Attributes:
        name: 相册名称
        description: 相册描述
        visibility: 可见性
    """
    name: Optional[str] = Field(None, min_length=1, max_length=255, description="相册名称")
    description: Optional[str] = Field(None, description="相册描述")
    visibility: Optional[str] = Field(None, description="可见性: general(公共), private(私有)")


class AlbumOut(BaseModel):
    """相册输出 Schema

    Attributes:
        id: 相册唯一ID
        name: 相册名称
        description: 相册描述
        start_time: 相册开始时间
        end_time: 相册结束时间
        cover_asset_id: 封面素材ID
        visibility: 可见性
        created_by: 创建者用户ID
        created_at: 创建时间
        updated_at: 更新时间
        asset_count: 相册内素材数量（可选）
    """
    id: int
    name: str
    description: Optional[str]
    start_time: Optional[datetime]
    end_time: Optional[datetime]
    cover_asset_id: Optional[int]
    visibility: str
    created_by: int
    created_at: datetime
    updated_at: datetime
    asset_count: Optional[int] = Field(None, description="相册内素材数量")

    class Config:
        from_attributes = True


class AlbumDetailOut(AlbumOut):
    """相册详情输出 Schema（包含封面缩略图路径）

    继承 AlbumOut 并添加封面缩略图路径
    """
    cover_thumbnail_path: Optional[str] = Field(None, description="封面素材的缩略图路径")


class AddAssetRequest(BaseModel):
    """添加单个素材到相册请求 Schema

    Attributes:
        asset_id: 素材ID
    """
    asset_id: int = Field(..., description="素材ID")


class AddAssetsRequest(BaseModel):
    """批量添加素材到相册请求 Schema

    Attributes:
        asset_ids: 素材ID列表
    """
    asset_ids: List[int] = Field(..., min_length=1, description="素材ID列表")


class UpdateAssetSortRequest(BaseModel):
    """更新素材排序请求 Schema

    Attributes:
        sort_order: 排序顺序（数字越小越靠前）
    """
    sort_order: int = Field(..., description="排序顺序")


class SetCoverRequest(BaseModel):
    """设置相册封面请求 Schema

    Attributes:
        cover_asset_id: 封面素材ID
    """
    cover_asset_id: int = Field(..., description="封面素材ID")


class AlbumAssetOut(BaseModel):
    """相册素材关联输出 Schema

    Attributes:
        id: 关联记录ID
        album_id: 相册ID
        asset_id: 素材ID
        sort_order: 排序顺序
        created_at: 添加时间
    """
    id: int
    album_id: int
    asset_id: int
    sort_order: int
    created_at: datetime

    class Config:
        from_attributes = True
