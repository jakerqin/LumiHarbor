"""本地文件系统扫描导入相关 Schema"""
from pydantic import BaseModel, Field
from typing import Optional, Literal


class ScanRequest(BaseModel):
    """扫描导入请求模型

    Attributes:
        source_path: 扫描路径（默认使用配置的 NAS_DATA_PATH）
        created_by: 创建者用户ID（默认: 1）
        visibility: 素材可见性，可选 'general'(公共) 或 'private'(私有)（默认: general）
    """
    source_path: Optional[str] = Field(
        default=None,
        description="扫描路径（默认使用配置的 NAS_DATA_PATH）"
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


class ScanResponse(BaseModel):
    """扫描任务响应

    Attributes:
        status: 任务状态
        path: 扫描路径
        message: 任务消息
    """
    status: str = Field(description="任务状态")
    path: str = Field(description="扫描路径")
    message: str = Field(description="任务消息")
