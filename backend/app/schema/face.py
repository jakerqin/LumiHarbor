"""人脸 / 动物脸 API Schema"""
from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class FaceOut(BaseModel):
    id: int
    asset_id: int
    subject_id: Optional[int] = None
    subject_name: Optional[str] = None
    subject_type: str
    species: Optional[str] = None
    bbox_x: float
    bbox_y: float
    bbox_w: float
    bbox_h: float
    det_score: Optional[float] = None
    quality_score: Optional[float] = None
    embedding_model: str
    crop_path: Optional[str] = None
    crop_url: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class FacesPageResponse(BaseModel):
    faces: List[FaceOut]
    total: int
    page: int
    page_size: int
    has_more: bool


class FaceBackfillRequest(BaseModel):
    asset_ids: Optional[List[int]] = None
    missing_only: bool = True
    limit: int = Field(default=200, ge=1, le=20000)
    shot_at_from: Optional[date] = None
    shot_at_to: Optional[date] = None
