"""资源相关 Schema"""
from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class AssetBase(BaseModel):
    """资源基础 Schema

    Attributes:
        original_path: 资源原始路径
        asset_type: 资源类型（image, video, audio）
        file_size: 文件大小（字节）
        mime_type: MIME 类型
        shot_at: 拍摄时间
    """
    original_path: str
    asset_type: str
    file_size: int
    mime_type: Optional[str]
    shot_at: Optional[datetime]


class AssetOut(AssetBase):
    """资源输出 Schema（包含所有字段）

    继承 AssetBase 并添加数据库生成的字段

    Attributes:
        id: 资源唯一ID
        created_by: 创建者用户ID
        thumbnail_path: 缩略图路径
        visibility: 可见性（general: 公共, private: 私有）
        created_at: 创建时间
        updated_at: 更新时间
        is_deleted: 是否已删除
    """
    id: int
    created_by: int
    thumbnail_path: Optional[str]
    visibility: str
    created_at: datetime
    updated_at: datetime
    is_deleted: bool

    class Config:
        from_attributes = True
