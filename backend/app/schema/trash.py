"""回收站 Schema"""
from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class TrashItem(BaseModel):
    """回收站里的素材（缩略图地址指向 recycle_bin 下的文件）"""
    id: int
    asset_type: Literal["image", "video", "audio"]
    mime_type: Optional[str] = None
    file_size: Optional[int] = None
    shot_at: Optional[datetime] = None
    aspect_ratio: Optional[float] = None
    thumbnail_url: Optional[str] = None
    deleted_at: datetime
    expires_at: Optional[datetime] = Field(default=None, description="到期彻底删除的时间；自动清理关闭时为空")
    days_left: Optional[int] = Field(default=None, description="距彻底删除剩余天数（向上取整）")
    restorable: bool
    reason: Optional[str] = Field(default=None, description="不能恢复的原因")


class TrashListResponse(BaseModel):
    items: List[TrashItem]
    total: int
    retention_days: int = Field(description="保留天数；0 表示不自动清理")


class TrashRestoreRequest(BaseModel):
    asset_ids: List[int] = Field(min_length=1, max_length=500)


class TrashRestoreFailure(BaseModel):
    asset_id: int
    reason: str


class TrashRestoreResponse(BaseModel):
    restored: List[int]
    failed: List[TrashRestoreFailure]
