"""地图相关的响应模型"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class AssetBrief(BaseModel):
    """素材简要信息"""
    id: int = Field(..., description="素材ID")
    thumbnail_url: str = Field(..., description="缩略图URL")
    shot_at: datetime = Field(..., description="拍摄时间")
    asset_type: str = Field(..., description="素材类型")


class Footprint(BaseModel):
    """足迹点模型"""
    id: str = Field(..., description="足迹点ID（格式：fp_{lat}_{lng}）")
    latitude: float = Field(..., description="纬度")
    longitude: float = Field(..., description="经度")
    location_city: Optional[str] = Field(None, description="城市")
    location_country: Optional[str] = Field(None, description="国家")
    location_poi: Optional[str] = Field(None, description="兴趣点")
    asset_count: int = Field(..., description="素材数量")
    first_shot_at: datetime = Field(..., description="首次拍摄时间")
    last_shot_at: datetime = Field(..., description="最后拍摄时间")
    cover_asset_id: int = Field(..., description="封面素材ID")


class FootprintsResponse(BaseModel):
    """足迹点列表响应"""
    footprints: List[Footprint] = Field(..., description="足迹点列表")
    total: int = Field(..., description="总数")


class FootprintDetail(BaseModel):
    """足迹点详情模型"""
    id: str = Field(..., description="足迹点ID")
    latitude: float = Field(..., description="纬度")
    longitude: float = Field(..., description="经度")
    location_city: Optional[str] = Field(None, description="城市")
    location_country: Optional[str] = Field(None, description="国家")
    location_formatted: Optional[str] = Field(None, description="完整地址")
    assets: List[AssetBrief] = Field(..., description="素材列表")
    asset_count: int = Field(..., description="素材数量")
    first_shot_at: datetime = Field(..., description="首次拍摄时间")
    last_shot_at: datetime = Field(..., description="最后拍摄时间")


class MapStatistics(BaseModel):
    """地图统计数据模型"""
    country_count: int = Field(..., description="访问国家数")
    city_count: int = Field(..., description="访问城市数")
    total_distance_km: float = Field(..., description="总里程（公里）")
    first_shot_at: Optional[datetime] = Field(None, description="首次拍摄时间")
    last_shot_at: Optional[datetime] = Field(None, description="最后拍摄时间")
    total_days: int = Field(..., description="时间跨度（天）")
