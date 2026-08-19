"""模板管理与运行期解析"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional, List

from ..db import get_db
from .. import schema
from ..services.templates.service import TemplateService
from ..services.templates.registry import ASSET_FIELD_WHITELIST, RELATION_FIELD_WHITELIST

router = APIRouter(prefix="/templates", tags=["Templates"])


@router.get("", response_model=schema.ApiResponse[List[schema.TemplateOut]])
def list_templates(
    kind: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    items = TemplateService.list_templates(db, kind)
    data = [schema.TemplateOut.model_validate(item) for item in items]
    return schema.ApiResponse.success(data=data)


@router.get("/resolve", response_model=schema.ApiResponse[schema.TemplateResolveOut])
def resolve_template(
    kind: str = Query(..., description="ingest / detail / filter / card"),
    asset_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    template = TemplateService.resolve_template(db, kind, asset_type)
    if not template:
        return schema.ApiResponse.success(data=schema.TemplateResolveOut(
            template=None,
            fields=[],
            registry=_registry(),
        ))
    fields = TemplateService.list_fields(db, template.id)
    enriched = TemplateService.enrich_fields(db, fields)
    out = schema.TemplateOut.model_validate(template)
    out.fields = enriched
    return schema.ApiResponse.success(data=schema.TemplateResolveOut(
        template=out,
        fields=enriched,
        registry=_registry(),
    ))


@router.post("", response_model=schema.ApiResponse[schema.TemplateOut])
def create_template(payload: schema.TemplateCreate, db: Session = Depends(get_db)):
    item = TemplateService.create(db, payload)
    return schema.ApiResponse.success(data=schema.TemplateOut.model_validate(item))


@router.patch("/{template_id}", response_model=schema.ApiResponse[schema.TemplateOut])
def update_template(
    template_id: int,
    payload: schema.TemplateUpdate,
    db: Session = Depends(get_db),
):
    item = TemplateService.update(db, template_id, payload)
    return schema.ApiResponse.success(data=schema.TemplateOut.model_validate(item))


@router.delete("/{template_id}", response_model=schema.ApiResponse[dict])
def delete_template(template_id: int, db: Session = Depends(get_db)):
    TemplateService.delete(db, template_id)
    return schema.ApiResponse.success(data={"deleted": True})


@router.get("/{template_id}/fields", response_model=schema.ApiResponse[List[schema.TemplateFieldOut]])
def list_template_fields(template_id: int, db: Session = Depends(get_db)):
    fields = TemplateService.list_fields(db, template_id)
    return schema.ApiResponse.success(data=TemplateService.enrich_fields(db, fields))


@router.post("/{template_id}/fields", response_model=schema.ApiResponse[schema.TemplateFieldOut])
def add_template_field(
    template_id: int,
    payload: schema.TemplateFieldCreate,
    db: Session = Depends(get_db),
):
    item = TemplateService.add_field(db, template_id, payload)
    return schema.ApiResponse.success(
        data=TemplateService.enrich_fields(db, [item])[0]
    )


@router.patch("/fields/{field_id}", response_model=schema.ApiResponse[schema.TemplateFieldOut])
def update_template_field(
    field_id: int,
    payload: schema.TemplateFieldUpdate,
    db: Session = Depends(get_db),
):
    item = TemplateService.update_field(db, field_id, payload)
    return schema.ApiResponse.success(
        data=TemplateService.enrich_fields(db, [item])[0]
    )


@router.delete("/fields/{field_id}", response_model=schema.ApiResponse[dict])
def delete_template_field(field_id: int, db: Session = Depends(get_db)):
    TemplateService.delete_field(db, field_id)
    return schema.ApiResponse.success(data={"deleted": True})


def _registry() -> dict:
    return {
        "asset_fields": ASSET_FIELD_WHITELIST,
        "relation_fields": RELATION_FIELD_WHITELIST,
    }
