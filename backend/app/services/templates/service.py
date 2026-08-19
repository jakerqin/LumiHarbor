"""模板与字段编排"""
from typing import Optional, List
from sqlalchemy.orm import Session
from fastapi import HTTPException

from ... import model, schema
from .registry import (
    ALLOWED_FIELD_SOURCES,
    ALLOWED_TEMPLATE_KINDS,
    ASSET_FIELD_WHITELIST,
    RELATION_FIELD_WHITELIST,
    field_label,
    validate_field_key,
)


class TemplateService:
    @staticmethod
    def list_templates(db: Session, kind: Optional[str] = None) -> List[model.Template]:
        query = db.query(model.Template).filter(model.Template.is_deleted == False)
        if kind:
            query = query.filter(model.Template.kind == kind)
        return query.order_by(model.Template.kind.asc(), model.Template.name.asc()).all()

    @staticmethod
    def get_or_404(db: Session, template_id: int) -> model.Template:
        item = db.query(model.Template).filter(
            model.Template.id == template_id,
            model.Template.is_deleted == False,
        ).first()
        if not item:
            raise HTTPException(status_code=404, detail="模板不存在")
        return item

    @staticmethod
    def resolve_template(
        db: Session,
        kind: str,
        asset_type: Optional[str] = None,
    ) -> Optional[model.Template]:
        query = db.query(model.Template).filter(
            model.Template.kind == kind,
            model.Template.is_deleted == False,
            model.Template.is_default == True,
        )
        typed = None
        if asset_type:
            typed = query.filter(model.Template.asset_type == asset_type).first()
        if typed:
            return typed
        return query.filter(model.Template.asset_type.is_(None)).first()

    @staticmethod
    def create(db: Session, payload: schema.TemplateCreate) -> model.Template:
        if payload.kind not in ALLOWED_TEMPLATE_KINDS:
            raise HTTPException(status_code=400, detail="不支持的模板 kind")
        exists = db.query(model.Template).filter(model.Template.code == payload.code).first()
        if exists:
            raise HTTPException(status_code=400, detail="模板 code 已存在")
        item = model.Template(**payload.model_dump())
        db.add(item)
        db.flush()
        if payload.is_default:
            TemplateService._clear_other_defaults(db, payload.kind, payload.asset_type, item.id)
        db.commit()
        db.refresh(item)
        return item

    @staticmethod
    def update(db: Session, template_id: int, payload: schema.TemplateUpdate) -> model.Template:
        item = TemplateService.get_or_404(db, template_id)
        data = payload.model_dump(exclude_unset=True)
        if data.get("kind") and data["kind"] not in ALLOWED_TEMPLATE_KINDS:
            raise HTTPException(status_code=400, detail="不支持的模板 kind")
        for key, value in data.items():
            setattr(item, key, value)
        if data.get("is_default"):
            TemplateService._clear_other_defaults(
                db, item.kind, item.asset_type, item.id
            )
        db.commit()
        db.refresh(item)
        return item

    @staticmethod
    def delete(db: Session, template_id: int) -> None:
        item = TemplateService.get_or_404(db, template_id)
        item.is_deleted = True
        db.query(model.TemplateField).filter(
            model.TemplateField.template_id == template_id
        ).update({"is_deleted": True})
        db.commit()

    @staticmethod
    def _clear_other_defaults(
        db: Session,
        kind: str,
        asset_type: Optional[str],
        keep_id: Optional[int],
    ) -> None:
        query = db.query(model.Template).filter(
            model.Template.kind == kind,
            model.Template.is_deleted == False,
        )
        if asset_type:
            query = query.filter(model.Template.asset_type == asset_type)
        else:
            query = query.filter(model.Template.asset_type.is_(None))
        if keep_id:
            query = query.filter(model.Template.id != keep_id)
        query.update({"is_default": False})

    @staticmethod
    def list_fields(db: Session, template_id: int) -> List[model.TemplateField]:
        TemplateService.get_or_404(db, template_id)
        return db.query(model.TemplateField).filter(
            model.TemplateField.template_id == template_id,
            model.TemplateField.is_deleted == False,
        ).order_by(model.TemplateField.sort_order.asc()).all()

    @staticmethod
    def add_field(
        db: Session,
        template_id: int,
        payload: schema.TemplateFieldCreate,
    ) -> model.TemplateField:
        TemplateService.get_or_404(db, template_id)
        if payload.field_source not in ALLOWED_FIELD_SOURCES:
            raise HTTPException(status_code=400, detail="不支持的 field_source")
        try:
            validate_field_key(payload.field_source, payload.field_key)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))
        item = model.TemplateField(template_id=template_id, **payload.model_dump())
        db.add(item)
        db.commit()
        db.refresh(item)
        return item

    @staticmethod
    def update_field(
        db: Session,
        field_id: int,
        payload: schema.TemplateFieldUpdate,
    ) -> model.TemplateField:
        item = db.query(model.TemplateField).filter(
            model.TemplateField.id == field_id,
            model.TemplateField.is_deleted == False,
        ).first()
        if not item:
            raise HTTPException(status_code=404, detail="模板字段不存在")
        for key, value in payload.model_dump(exclude_unset=True).items():
            setattr(item, key, value)
        db.commit()
        db.refresh(item)
        return item

    @staticmethod
    def delete_field(db: Session, field_id: int) -> None:
        item = db.query(model.TemplateField).filter(
            model.TemplateField.id == field_id,
            model.TemplateField.is_deleted == False,
        ).first()
        if not item:
            raise HTTPException(status_code=404, detail="模板字段不存在")
        item.is_deleted = True
        db.commit()

    @staticmethod
    def enrich_fields(
        db: Session,
        fields: List[model.TemplateField],
    ) -> List[schema.TemplateFieldOut]:
        keys = [f.field_key for f in fields if f.field_source == "tag"]
        defs = {}
        if keys:
            rows = db.query(model.TagDefinition).filter(
                model.TagDefinition.tag_key.in_(keys),
                model.TagDefinition.is_deleted == False,
            ).all()
            defs = {row.tag_key: row for row in rows}
        result = []
        for field in fields:
            tag = defs.get(field.field_key) if field.field_source == "tag" else None
            out = schema.TemplateFieldOut.model_validate(field)
            out.tag_name = field_label(field.field_source, field.field_key, tag.tag_name if tag else None)
            out.input_type = field.widget_override or (
                tag.input_type if tag else _registry_input_type(field.field_source, field.field_key)
            )
            out.tag_source = tag.source if tag else None
            out.tag_extra_info = tag.extra_info if tag else None
            result.append(out)
        return result


def _registry_input_type(field_source: str, field_key: str) -> Optional[int]:
    if field_source == "asset":
        return ASSET_FIELD_WHITELIST.get(field_key, {}).get("input_type")
    if field_source == "relation":
        return RELATION_FIELD_WHITELIST.get(field_key, {}).get("input_type")
    return 1
