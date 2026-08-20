"""任务开关与补跑"""
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException

from ... import model, schema
from ..templates.registry import ALLOWED_TASK_CODES
from ...tasks.phash_tasks import batch_calculate_phash_task
from ...tasks.sender import run_coroutine_sync


class TaskDefinitionService:
    @staticmethod
    def list_all(db: Session) -> List[model.TaskDefinition]:
        return db.query(model.TaskDefinition).filter(
            model.TaskDefinition.is_deleted == False
        ).order_by(model.TaskDefinition.id.asc()).all()

    @staticmethod
    def is_enabled(db: Session, task_code: str, default: bool = True) -> bool:
        item = db.query(model.TaskDefinition).filter(
            model.TaskDefinition.task_code == task_code,
            model.TaskDefinition.is_deleted == False,
        ).first()
        if not item:
            return default
        return bool(item.is_enabled)

    @staticmethod
    def update(
        db: Session,
        task_code: str,
        payload: schema.TaskDefinitionUpdate,
    ) -> model.TaskDefinition:
        if task_code not in ALLOWED_TASK_CODES:
            raise HTTPException(status_code=400, detail="未知任务")
        item = db.query(model.TaskDefinition).filter(
            model.TaskDefinition.task_code == task_code,
            model.TaskDefinition.is_deleted == False,
        ).first()
        if not item:
            raise HTTPException(status_code=404, detail="任务定义不存在")
        for key, value in payload.model_dump(exclude_unset=True).items():
            setattr(item, key, value)
        db.commit()
        db.refresh(item)
        return item

    @staticmethod
    def list_logs(
        db: Session,
        task_type: Optional[str] = None,
        limit: int = 50,
    ) -> List[model.TaskLog]:
        query = db.query(model.TaskLog)
        if task_type:
            query = query.filter(model.TaskLog.task_type == task_type)
        return query.order_by(model.TaskLog.id.desc()).limit(limit).all()

    @staticmethod
    def trigger_batch_phash(db: Session, payload: schema.BatchPhashRequest) -> dict:
        if not TaskDefinitionService.is_enabled(db, "batch_phash"):
            raise HTTPException(status_code=400, detail="批量补算任务已关闭")
        asset_ids = payload.asset_ids
        if not asset_ids:
            query = db.query(model.Asset.id).filter(model.Asset.is_deleted == False)
            if payload.missing_only:
                query = query.filter(model.Asset.phash.is_(None))
            asset_ids = [row[0] for row in query.limit(500).all()]
        if not asset_ids:
            return {"queued": 0, "message": "没有需要补算的素材"}
        run_coroutine_sync(batch_calculate_phash_task.kiq(asset_ids=asset_ids))
        return {"queued": len(asset_ids), "message": "已发送批量补算"}
