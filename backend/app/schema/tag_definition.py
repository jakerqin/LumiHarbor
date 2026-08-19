"""标签定义与映射 Schema"""

from pydantic import BaseModel, Field
from typing import Optional, Any, Dict, List


class TagDefinitionOut(BaseModel):
    """标签定义输出"""

    id: Optional[int] = None
    tag_key: str
    tag_name: str
    input_type: Optional[int] = None
    extra_info: Optional[Dict[str, Any]] = None
    description: Optional[str] = None
    source: str = "system"

    class Config:
        from_attributes = True


class TagDefinitionCreate(BaseModel):
    tag_key: str = Field(..., min_length=1, max_length=100)
    tag_name: str = Field(..., min_length=1, max_length=200)
    input_type: Optional[int] = 1
    extra_info: Optional[Dict[str, Any]] = None
    description: Optional[str] = None
    source: str = "user"


class TagDefinitionUpdate(BaseModel):
    tag_name: Optional[str] = None
    input_type: Optional[int] = None
    extra_info: Optional[Dict[str, Any]] = None
    description: Optional[str] = None


class TagMappingOut(BaseModel):
    id: int
    tag_key: str
    source_key: str
    asset_type: Optional[str] = None
    transform: str = "identity"
    priority: int = 0

    class Config:
        from_attributes = True


class TagMappingCreate(BaseModel):
    tag_key: str
    source_key: str
    asset_type: Optional[str] = None
    transform: str = "identity"
    priority: int = 0


class TagMappingUpdate(BaseModel):
    source_key: Optional[str] = None
    asset_type: Optional[str] = None
    transform: Optional[str] = None
    priority: Optional[int] = None


class AssetTagUpsert(BaseModel):
    """人工覆盖用户标签"""
    tags: Dict[str, Optional[str]]


class AssetTagFilter(BaseModel):
    field_source: str = "tag"
    field_key: str
    value: str
