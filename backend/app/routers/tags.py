"""标签定义与映射管理"""

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import Optional, List

from ..db import get_db
from .. import model, schema
from ..services.tags.admin import TagAdminService
from ..services.tags.mapping_service import TagMappingService

router = APIRouter(
    prefix="/tags",
    tags=["Tags"],
)


@router.get("/definitions", response_model=schema.ApiResponse[List[schema.TagDefinitionOut]])
def list_tag_definitions(
    template_type: Optional[str] = Query(None, description="兼容旧参数；优先用 /templates/resolve"),
    db: Session = Depends(get_db),
):
    """获取标签定义。"""
    query = db.query(model.TagDefinition).filter(model.TagDefinition.is_deleted == False)
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


@router.post("/definitions", response_model=schema.ApiResponse[schema.TagDefinitionOut])
def create_tag_definition(
    payload: schema.TagDefinitionCreate,
    db: Session = Depends(get_db),
):
    item = TagAdminService.create(db, payload)
    return schema.ApiResponse.success(data=schema.TagDefinitionOut.model_validate(item))


@router.patch("/definitions/{definition_id}", response_model=schema.ApiResponse[schema.TagDefinitionOut])
def update_tag_definition(
    definition_id: int,
    payload: schema.TagDefinitionUpdate,
    db: Session = Depends(get_db),
):
    item = TagAdminService.update(db, definition_id, payload)
    return schema.ApiResponse.success(data=schema.TagDefinitionOut.model_validate(item))


@router.delete("/definitions/{definition_id}", response_model=schema.ApiResponse[dict])
def delete_tag_definition(
    definition_id: int,
    db: Session = Depends(get_db),
):
    TagAdminService.delete(db, definition_id)
    return schema.ApiResponse.success(data={"deleted": True})


@router.get("/mappings", response_model=schema.ApiResponse[List[schema.TagMappingOut]])
def list_tag_mappings(
    tag_key: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    items = TagMappingService.list_all(db, tag_key)
    data = [schema.TagMappingOut.model_validate(item) for item in items]
    return schema.ApiResponse.success(data=data)


@router.post("/mappings", response_model=schema.ApiResponse[schema.TagMappingOut])
def create_tag_mapping(
    payload: schema.TagMappingCreate,
    db: Session = Depends(get_db),
):
    item = TagMappingService.create(db, payload)
    return schema.ApiResponse.success(data=schema.TagMappingOut.model_validate(item))


@router.patch("/mappings/{mapping_id}", response_model=schema.ApiResponse[schema.TagMappingOut])
def update_tag_mapping(
    mapping_id: int,
    payload: schema.TagMappingUpdate,
    db: Session = Depends(get_db),
):
    item = TagMappingService.update(db, mapping_id, payload)
    return schema.ApiResponse.success(data=schema.TagMappingOut.model_validate(item))


@router.delete("/mappings/{mapping_id}", response_model=schema.ApiResponse[dict])
def delete_tag_mapping(
    mapping_id: int,
    db: Session = Depends(get_db),
):
    TagMappingService.delete(db, mapping_id)
    return schema.ApiResponse.success(data={"deleted": True})
