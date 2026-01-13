"""标签定义 Schema"""

from pydantic import BaseModel
from typing import Optional, Any, Dict


class TagDefinitionOut(BaseModel):
    """标签定义输出 Schema

    用于前端展示与动态表单渲染（基于 input_type/extra_info）。
    """

    tag_key: str
    tag_name: str
    input_type: Optional[int] = None
    extra_info: Optional[Dict[str, Any]] = None
    description: Optional[str] = None

    class Config:
        from_attributes = True

