"""AI 修图 / 生图 Schema"""
from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class AiImageJobCreate(BaseModel):
    """job_type=edit 需要 asset_id；generate 可带 size 与参考图"""
    job_type: Literal["edit", "generate"]
    asset_id: Optional[int] = None
    preset_code: Optional[str] = Field(default=None, max_length=50)
    prompt: Optional[str] = Field(default=None, max_length=2000)
    tier: Literal["standard", "hq"] = Field(default="standard", description="标准 / 精细")
    size: Optional[Literal["square", "landscape", "portrait"]] = Field(default=None, description="仅生图")
    reference_asset_ids: Optional[List[int]] = Field(default=None, description="仅生图，最多 4 张")


class AiImageJobOut(BaseModel):
    id: int
    job_type: str
    asset_id: Optional[int] = None
    preset_code: Optional[str] = None
    prompt: Optional[str] = None
    model: str
    quality: str
    size: Optional[str] = None
    status: Literal["pending", "running", "success", "failed"]
    error_message: Optional[str] = None
    result_version_id: Optional[int] = None
    result_asset_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AiImagePreset(BaseModel):
    code: str
    name: str
    description: str
    needs_input: bool
    hq: bool


class AiImageStatus(BaseModel):
    """enabled = 总开关打开 且 已配置 OPENAI_API_KEY"""
    enabled: bool
    switch_on: bool
    configured: bool
    model: str
    edit: List[AiImagePreset]
    generate: List[AiImagePreset]
    sizes: List[str]


class AssetVersionOut(BaseModel):
    id: int
    kind: Literal["original", "ai_edit"]
    job_id: Optional[int] = None
    thumbnail_url: Optional[str] = None
    image_url: Optional[str] = Field(default=None, description="版本大图；原图行为原图/预览图")
    width: Optional[int] = None
    height: Optional[int] = None
    is_current: bool
    created_at: Optional[datetime] = None


class AssetVersionsResponse(BaseModel):
    current_version_id: Optional[int] = None
    versions: List[AssetVersionOut]


class SetCurrentVersionRequest(BaseModel):
    version_id: Optional[int] = Field(default=None, description="空或原图行 ID 表示切回原图")
