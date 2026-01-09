"""精选照片 Schema"""
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime


class FeaturedAsset(BaseModel):
    """精选素材响应模型"""
    id: int
    type: str  # 'image' | 'video' | 'audio'
    thumbnail_url: str = Field(alias='thumbnailUrl')
    original_url: str = Field(alias='originalUrl')
    file_name: str = Field(alias='fileName')
    file_size: int = Field(alias='fileSize')
    aspect_ratio: str = Field(alias='aspectRatio')  # 'horizontal' | 'vertical' | 'square'
    shot_at: Optional[datetime] = Field(None, alias='shotAt')
    created_at: datetime = Field(alias='createdAt')
    favorited_at: Optional[datetime] = Field(alias='favoritedAt')
    is_favorited: bool = Field(default=True, alias='isFavorited')  # 精选列表中的素材都已收藏
    tags: Dict[str, Any] = {}  # 标签 JSON 对象

    class Config:
        populate_by_name = True  # 允许使用别名和原始字段名


class FeaturedResponse(BaseModel):
    """精选列表响应"""
    assets: List[FeaturedAsset]
    total: int
    user_id: int = Field(alias='userId')

    class Config:
        populate_by_name = True
