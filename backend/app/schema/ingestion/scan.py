"""本地文件系统扫描导入相关 Schema"""
from pydantic import BaseModel, Field
from typing import Optional, Literal


class ScanRequest(BaseModel):
    """扫描导入请求模型

    Attributes:
        source_path: 扫描路径
        created_by: 创建者用户ID（默认: 1）
        visibility: 素材可见性，可选 'general'(公共) 或 'private'(私有)（默认: general）
    """
    source_path: Optional[str] = Field(
        default=None,
        description="扫描路径"
    )
    created_by: int = Field(
        default=1,
        ge=1,
        description="创建者用户ID"
    )
    visibility: Literal["general", "private"] = Field(
        default="general",
        description="素材可见性：general(公共) 或 private(私有)"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "source_path": "/Volumes/NAS/media",
                "created_by": 1,
                "visibility": "general"
            }
        }


class ScanResponseData(BaseModel):
    """扫描任务响应数据（作为 ApiResponse[ScanResponseData] 的 result 字段）

    Attributes:
        status: 任务状态（'scanning', 'completed', 'failed'）
        path: 扫描路径
    """
    status: Literal["scanning", "completed", "failed"] = Field(
        description="任务状态"
    )
    path: str = Field(
        description="扫描路径"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "status": "scanning",
                "path": "/Volumes/NAS/media"
            }
        }
