"""时间轴 Schema"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime


class CoverAsset(BaseModel):
    """封面素材信息"""
    model_config = ConfigDict(populate_by_name=True)

    id: int = Field(description="素材ID")
    thumbnail_url: str = Field(description="缩略图URL", serialization_alias="thumbnailUrl")
    type: str = Field(description="素材类型")


class TimelineNote(BaseModel):
    """时间轴笔记项"""
    model_config = ConfigDict(populate_by_name=True)

    id: int = Field(description="笔记ID")
    title: str = Field(description="笔记标题")
    cover_asset: Optional[CoverAsset] = Field(default=None, description="封面素材", serialization_alias="coverAsset")
    created_at: datetime = Field(description="创建时间", serialization_alias="createdAt")


class TimelineResponse(BaseModel):
    """时间轴响应"""
    notes: List[TimelineNote] = Field(description="笔记列表")
