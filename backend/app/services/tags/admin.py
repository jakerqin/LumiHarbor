"""标签定义管理"""
from sqlalchemy.orm import Session
from fastapi import HTTPException

from ... import model, schema


class TagAdminService:
    @staticmethod
    def create(db: Session, payload: schema.TagDefinitionCreate) -> model.TagDefinition:
        if payload.source not in {"system", "user"}:
            raise HTTPException(status_code=400, detail="source 只能是 system 或 user")
        exists = db.query(model.TagDefinition).filter(
            model.TagDefinition.tag_key == payload.tag_key
        ).first()
        if exists and not exists.is_deleted:
            raise HTTPException(status_code=400, detail="tag_key 已存在")
        if exists and exists.is_deleted:
            exists.is_deleted = False
            for key, value in payload.model_dump().items():
                setattr(exists, key, value)
            db.commit()
            db.refresh(exists)
            return exists
        item = model.TagDefinition(**payload.model_dump())
        db.add(item)
        db.commit()
        db.refresh(item)
        return item

    @staticmethod
    def update(
        db: Session,
        definition_id: int,
        payload: schema.TagDefinitionUpdate,
    ) -> model.TagDefinition:
        item = db.query(model.TagDefinition).filter(
            model.TagDefinition.id == definition_id,
            model.TagDefinition.is_deleted == False,
        ).first()
        if not item:
            raise HTTPException(status_code=404, detail="标签定义不存在")
        for key, value in payload.model_dump(exclude_unset=True).items():
            setattr(item, key, value)
        db.commit()
        db.refresh(item)
        return item

    @staticmethod
    def delete(db: Session, definition_id: int) -> None:
        item = db.query(model.TagDefinition).filter(
            model.TagDefinition.id == definition_id,
            model.TagDefinition.is_deleted == False,
        ).first()
        if not item:
            raise HTTPException(status_code=404, detail="标签定义不存在")
        if item.source == "system":
            raise HTTPException(status_code=400, detail="系统标签不可删除")
        item.is_deleted = True
        db.commit()
