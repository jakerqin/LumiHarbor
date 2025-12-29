from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional, Dict

class AssetBase(BaseModel):
    original_path: str
    asset_type: str
    file_size: int
    mime_type: Optional[str]
    shot_at: Optional[datetime]

class AssetOut(AssetBase):
    id: int
    owner_id: int
    thumbnail_path: Optional[str]
    exif_data: Optional[Dict]
    ai_tags: Optional[List[str]]
    gps_lat: Optional[float]
    gps_lng: Optional[float]
    city: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
