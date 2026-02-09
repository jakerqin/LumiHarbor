"""笔记相关 Schema"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from .asset import AssetOut


class NoteSortBy(str, Enum):
    """笔记排序字段枚举"""

    CREATED_AT = "created_at"  # 创建时间
    UPDATED_AT = "updated_at"  # 更新时间
    SHOT_AT = "shot_at"  # 叙事发生时间


class NoteCreate(BaseModel):
    """创建笔记请求 Schema"""

    title: Optional[str] = Field(None, min_length=1, max_length=255, description="笔记标题")
    content: Dict[str, Any] = Field(..., description="笔记内容（Tiptap JSONContent）")
    cover_asset_id: Optional[int] = Field(None, description="封面素材ID（可选）")
    shot_at: Optional[datetime] = Field(None, description="叙事发生时间（可选）")


class NoteUpdate(BaseModel):
    """更新笔记请求 Schema（仅更新提供的字段）"""

    title: Optional[str] = Field(None, min_length=1, max_length=255, description="笔记标题")
    content: Optional[Dict[str, Any]] = Field(None, description="笔记内容（Tiptap JSONContent）")
    cover_asset_id: Optional[int] = Field(None, description="封面素材ID（可为空表示移除封面）")
    shot_at: Optional[datetime] = Field(None, description="叙事发生时间（可选）")


class NoteSummaryOut(BaseModel):
    """笔记列表输出 Schema（摘要）"""

    id: int
    created_by: int
    title: Optional[str]
    excerpt: str = Field(..., description="内容摘要（从 JSON 内容派生）")
    cover_asset_id: Optional[int]
    cover_thumbnail_path: Optional[str] = Field(None, description="封面素材缩略图路径")
    cover_thumbnail_url: Optional[str] = Field(None, description="封面素材缩略图 URL")
    shot_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime


class NoteDetailOut(NoteSummaryOut):
    """笔记详情输出 Schema"""

    content: Dict[str, Any] = Field(..., description="笔记内容（Tiptap JSONContent）")
    # 详情页专用：高清封面（原图或预览图）
    cover_original_path: Optional[str] = Field(None, description="封面素材原图路径")
    cover_original_url: Optional[str] = Field(None, description="封面素材原图 URL")
    cover_preview_path: Optional[str] = Field(None, description="封面素材预览图路径（用于 HEIC 等格式）")
    cover_preview_url: Optional[str] = Field(None, description="封面素材预览图 URL（用于 HEIC 等格式）")


class NotesPageResponse(BaseModel):
    """笔记列表分页响应"""

    notes: List[NoteSummaryOut]
    total: int
    skip: int
    limit: int
    has_more: bool

