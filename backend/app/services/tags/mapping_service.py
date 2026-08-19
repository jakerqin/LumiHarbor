"""标签映射读写"""
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException

from ... import model, schema
from ..templates.registry import ALLOWED_TRANSFORMS


class TagMappingService:
    @staticmethod
    def list_active(db: Session, asset_type: Optional[str] = None) -> List[model.TagMapping]:
        query = db.query(model.TagMapping).filter(model.TagMapping.is_deleted == False)
        if asset_type:
            query = query.filter(
                (model.TagMapping.asset_type == asset_type)
                | (model.TagMapping.asset_type.is_(None))
            )
        return query.order_by(
            model.TagMapping.tag_key.asc(),
            model.TagMapping.priority.asc(),
        ).all()

    @staticmethod
    def list_all(db: Session, tag_key: Optional[str] = None) -> List[model.TagMapping]:
        query = db.query(model.TagMapping).filter(model.TagMapping.is_deleted == False)
        if tag_key:
            query = query.filter(model.TagMapping.tag_key == tag_key)
        return query.order_by(model.TagMapping.tag_key.asc(), model.TagMapping.priority.asc()).all()

    @staticmethod
    def create(db: Session, payload: schema.TagMappingCreate) -> model.TagMapping:
        if payload.transform not in ALLOWED_TRANSFORMS:
            raise HTTPException(status_code=400, detail="不支持的 transform")
        item = model.TagMapping(**payload.model_dump())
        db.add(item)
        db.commit()
        db.refresh(item)
        return item

    @staticmethod
    def update(db: Session, mapping_id: int, payload: schema.TagMappingUpdate) -> model.TagMapping:
        item = db.query(model.TagMapping).filter(
            model.TagMapping.id == mapping_id,
            model.TagMapping.is_deleted == False,
        ).first()
        if not item:
            raise HTTPException(status_code=404, detail="映射不存在")
        data = payload.model_dump(exclude_unset=True)
        if data.get("transform") and data["transform"] not in ALLOWED_TRANSFORMS:
            raise HTTPException(status_code=400, detail="不支持的 transform")
        for key, value in data.items():
            setattr(item, key, value)
        db.commit()
        db.refresh(item)
        return item

    @staticmethod
    def delete(db: Session, mapping_id: int) -> None:
        item = db.query(model.TagMapping).filter(
            model.TagMapping.id == mapping_id,
            model.TagMapping.is_deleted == False,
        ).first()
        if not item:
            raise HTTPException(status_code=404, detail="映射不存在")
        item.is_deleted = True
        db.commit()
