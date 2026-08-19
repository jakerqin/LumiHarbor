"""模板与字段 Schema"""

from pydantic import BaseModel, Field
from typing import Optional, Any, Dict, List


class TemplateFieldOut(BaseModel):
    id: int
    template_id: int
    field_source: str
    field_key: str
    sort_order: int = 0
    is_required: bool = False
    is_readonly: bool = False
    widget_override: Optional[int] = None
    extra_info: Optional[Dict[str, Any]] = None
    tag_name: Optional[str] = None
    input_type: Optional[int] = None
    tag_source: Optional[str] = None
    tag_extra_info: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


class TemplateOut(BaseModel):
    id: int
    code: str
    name: str
    kind: str
    asset_type: Optional[str] = None
    is_default: bool = False
    extra_info: Optional[Dict[str, Any]] = None
    fields: Optional[List[TemplateFieldOut]] = None

    class Config:
        from_attributes = True


class TemplateCreate(BaseModel):
    code: str = Field(..., min_length=1, max_length=80)
    name: str = Field(..., min_length=1, max_length=200)
    kind: str
    asset_type: Optional[str] = None
    is_default: bool = False
    extra_info: Optional[Dict[str, Any]] = None


class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    kind: Optional[str] = None
    asset_type: Optional[str] = None
    is_default: Optional[bool] = None
    extra_info: Optional[Dict[str, Any]] = None


class TemplateFieldCreate(BaseModel):
    field_source: str
    field_key: str
    sort_order: int = 0
    is_required: bool = False
    is_readonly: bool = False
    widget_override: Optional[int] = None
    extra_info: Optional[Dict[str, Any]] = None


class TemplateFieldUpdate(BaseModel):
    sort_order: Optional[int] = None
    is_required: Optional[bool] = None
    is_readonly: Optional[bool] = None
    widget_override: Optional[int] = None
    extra_info: Optional[Dict[str, Any]] = None


class TemplateResolveOut(BaseModel):
    template: Optional[TemplateOut] = None
    fields: List[TemplateFieldOut] = []
    registry: Dict[str, Any] = {}
