"""标签相关路由"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import Optional, List

from ..db import get_db
from .. import model, schema

router = APIRouter(
    prefix="/tags",
    tags=["Tags"],
)


@router.get("/definitions", response_model=schema.ApiResponse[List[schema.TagDefinitionOut]])
def list_tag_definitions(
    template_type: Optional[str] = Query(None, description="模板类型: image/video/audio"),
    db: Session = Depends(get_db),
):
    """获取所有标签定义（元数据）。

    - 默认返回系统所有可用标签定义（未删除）。
    - 传入 template_type 时，仅返回该模板类型（image/video/audio）相关标签，并按模板 sort_order 排序。
    """

    query = db.query(model.TagDefinition).filter(
        model.TagDefinition.is_deleted == False
    )

    if template_type:
        query = query.join(
            model.AssetTemplateTag,
            and_(
                model.AssetTemplateTag.tag_key == model.TagDefinition.tag_key,
                model.AssetTemplateTag.template_type == template_type,
                model.AssetTemplateTag.is_deleted == False,
            ),
        ).order_by(
            model.AssetTemplateTag.sort_order.asc(),
            model.TagDefinition.tag_name.asc(),
        )
    else:
        query = query.order_by(model.TagDefinition.tag_name.asc())

    items = query.all()
    data = [schema.TagDefinitionOut.model_validate(item) for item in items]
    return schema.ApiResponse.success(data=data)

