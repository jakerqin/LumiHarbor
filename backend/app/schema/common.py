"""
统一API响应模型
"""
from typing import TypeVar, Generic, Optional
from pydantic import BaseModel, Field


# 泛型类型变量,用于 result 字段
T = TypeVar('T')


class ApiResponse(BaseModel, Generic[T]):
    """统一API响应格式

    Attributes:
        code: 响应码，'0' 表示成功，其他值表示错误码
        message: 响应消息，成功时为 'success'，失败时为错误描述
        result: 响应数据，泛型字段，成功时包含实际数据，失败时为 None
    """
    code: str = Field(description="响应码，'0'表示成功")
    message: str = Field(description="响应消息")
    result: Optional[T] = Field(default=None, description="响应数据")

    class Config:
        json_schema_extra = {
            "example": {
                "code": "0",
                "message": "success",
                "result": {"key": "value"}
            }
        }

    @classmethod
    def success(cls, data: T = None, message: str = "success") -> "ApiResponse[T]":
        """创建成功响应

        Args:
            data: 响应数据
            message: 成功消息，默认为 'success'

        Returns:
            ApiResponse 实例
        """
        return cls(code="0", message=message, result=data)

    @classmethod
    def error(cls, code: str, message: str) -> "ApiResponse[None]":
        """创建错误响应

        Args:
            code: 错误码
            message: 错误消息

        Returns:
            ApiResponse 实例
        """
        return cls(code=code, message=message, result=None)
