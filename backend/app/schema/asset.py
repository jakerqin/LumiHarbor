"""资源相关 Schema"""
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


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
        is_favorited: 是否被当前用户收藏
        aspect_ratio: 宽高比（从 asset_tags 获取）
        location_city: 城市名称（从 asset_tags 获取）
        location_poi: 兴趣点名称（从 asset_tags 获取）
    """
    id: int
    created_by: int
    thumbnail_path: Optional[str]
    visibility: str
    created_at: datetime
    updated_at: datetime
    is_deleted: bool

    # 对外可访问 URL（由后端根据存储策略生成）
    original_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    preview_url: Optional[str] = None  # 预览图 URL（用于 HEIC 等浏览器不支持的格式）

    # 扩展字段
    is_favorited: bool = False
    aspect_ratio: Optional[float] = None
    location_city: Optional[str] = None
    location_poi: Optional[str] = None

    class Config:
        from_attributes = True


class AssetsPageResponse(BaseModel):
    """素材列表分页响应

    Attributes:
        assets: 素材列表
        total: 总数量
        page: 当前页码
        page_size: 每页数量
        has_more: 是否还有下一页
    """
    assets: List[AssetOut]
    total: int
    page: int
    page_size: int
    has_more: bool
