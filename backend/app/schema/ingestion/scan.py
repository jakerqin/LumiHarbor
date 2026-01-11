"""本地文件系统扫描导入相关 Schema"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal
from datetime import datetime
import re


class AlbumInfo(BaseModel):
    """相册信息（album_id 和 album_name 二选一）

    Attributes:
        album_id: 现有相册ID（使用现有相册）
        album_name: 新建相册名称（创建新相册）
        start_time: 相册开始时间（仅在创建新相册时使用，可选）
        end_time: 相册结束时间（仅在创建新相册时使用，可选）
    """
    album_id: Optional[int] = Field(
        default=None,
        ge=1,
        description="现有相册ID"
    )
    album_name: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=255,
        description="新建相册名称"
    )
    start_time: Optional[datetime] = Field(
        default=None,
        description="相册开始时间（仅在创建新相册时使用）"
    )
    end_time: Optional[datetime] = Field(
        default=None,
        description="相册结束时间（仅在创建新相册时使用）"
    )

    @field_validator('album_id', 'album_name')
    @classmethod
    def validate_album_info(cls, v, info):
        """验证 album_id 和 album_name 二选一"""
        # 这个验证会在 model_validator 中进行
        return v

    class Config:
        json_schema_extra = {
            "examples": [
                {"album_id": 123},
                {
                    "album_name": "2024春节旅行",
                    "start_time": "2024-02-10T00:00:00",
                    "end_time": "2024-02-17T23:59:59"
                }
            ]
        }


class ScanRequest(BaseModel):
    """扫描导入请求模型

    Attributes:
        source_path: 扫描路径
        created_by: 创建者用户ID（默认: 1）
        visibility: 素材可见性，可选 'general'(公共) 或 'private'(私有)（默认: general）
        import_to_album: 是否导入到相册（默认: False）
        album_info: 相册信息（当 import_to_album=True 时必填）
        default_gps: 默认经纬度，格式：'经度,纬度'，小数点后不超过6位（可选）
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
    import_to_album: bool = Field(
        default=False,
        description="是否导入到相册"
    )
    album_info: Optional[AlbumInfo] = Field(
        default=None,
        description="相册信息（当 import_to_album=True 时必填）"
    )
    default_gps: Optional[str] = Field(
        default=None,
        description="默认经纬度（格式：'经度,纬度'，例如：'120.814675,32.103241'）"
    )

    @field_validator('default_gps')
    @classmethod
    def validate_gps_format(cls, v):
        """验证经纬度格式"""
        if v is None:
            return v

        # 格式：经度,纬度，小数点后不超过6位
        pattern = r'^-?\d+(\.\d{1,6})?,-?\d+(\.\d{1,6})?$'
        if not re.match(pattern, v):
            raise ValueError(
                "经纬度格式错误，正确格式：'经度,纬度'，小数点后不超过6位，例如：'120.814675,32.103241'"
            )

        # 解析并验证范围
        try:
            lng_str, lat_str = v.split(',')
            lng = float(lng_str)
            lat = float(lat_str)

            if not (-180 <= lng <= 180):
                raise ValueError(f"经度必须在 -180 到 180 之间，当前值：{lng}")
            if not (-90 <= lat <= 90):
                raise ValueError(f"纬度必须在 -90 到 90 之间，当前值：{lat}")

        except ValueError as e:
            raise ValueError(f"经纬度解析失败：{str(e)}")

        return v

    @field_validator('album_info')
    @classmethod
    def validate_album_info_presence(cls, v, info):
        """验证相册信息的完整性"""
        if v is not None:
            # album_id 和 album_name 必须二选一
            if v.album_id is None and v.album_name is None:
                raise ValueError("album_info 中 album_id 和 album_name 必须至少提供一个")
            if v.album_id is not None and v.album_name is not None:
                raise ValueError("album_info 中 album_id 和 album_name 只能提供一个")
        return v

    class Config:
        json_schema_extra = {
            "examples": [
                {
                    "source_path": "/Volumes/NAS/media",
                    "created_by": 1,
                    "visibility": "general"
                },
                {
                    "source_path": "/Volumes/NAS/media",
                    "created_by": 1,
                    "visibility": "general",
                    "import_to_album": True,
                    "album_info": {"album_name": "2024春节旅行"},
                    "default_gps": "120.814675,32.103241"
                }
            ]
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
