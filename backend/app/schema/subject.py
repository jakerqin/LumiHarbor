"""家庭面孔名单 Schema"""
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class SubjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    kind: str = Field(..., description="human | pet")
    species: Optional[str] = Field(None, description="pet 时 cat | dog")


class SubjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)


class SubjectOut(BaseModel):
    id: int
    name: str
    kind: str
    species: Optional[str] = None
    cover_path: Optional[str] = None
    cover_url: Optional[str] = None
    face_count: int = 0
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SubjectsPageResponse(BaseModel):
    subjects: List[SubjectOut]
    total: int


class FaceCandidateOut(BaseModel):
    bbox_x: float
    bbox_y: float
    bbox_w: float
    bbox_h: float
    subject_type: str
    species: Optional[str] = None
    det_score: float
