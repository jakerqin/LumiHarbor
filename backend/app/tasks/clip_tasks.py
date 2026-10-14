"""素材语义向量异步任务。"""
from datetime import datetime

from .broker import broker
from ..db import SessionLocal
from .. import model
from ..services.clip import ClipService
from ..tools.utils import get_logger

logger = get_logger(__name__)


@broker.task(task_name="compute_clip", retry_on_error=True, max_retries=2)
async def compute_clip_task(asset_id: int, task_log_id: int = None) -> dict:
    logger.info(f"开始语义向量 - Asset ID: {asset_id}")
    db = SessionLocal()
    try:
        _mark_log(db, task_log_id, "running")
        asset = db.query(model.Asset).filter(
            model.Asset.id == asset_id,
            model.Asset.is_deleted == False,
        ).first()
        if not asset:
            _mark_log(db, task_log_id, "failed", "素材不存在")
            return {"success": False, "asset_id": asset_id, "message": "素材不存在"}
        result = ClipService.process_asset(db, asset)
        status = "success" if result.get("success") else "failed"
        _mark_log(db, task_log_id, status, None if status == "success" else result.get("message"))
        logger.info(f"语义向量完成 - Asset ID: {asset_id}, {result.get('message')}")
        return {"asset_id": asset_id, **result}
    except Exception as exc:
        logger.error(f"语义向量失败 - Asset ID: {asset_id}: {exc}", exc_info=True)
        _mark_log(db, task_log_id, "failed", str(exc))
        return {"success": False, "asset_id": asset_id, "message": str(exc)}
    finally:
        db.close()


def _mark_log(db, task_log_id, status: str, error_msg: str = None) -> None:
    if not task_log_id:
        return
    payload = {"task_status": status, "executed_at": datetime.now(), "updated_at": datetime.now()}
    if error_msg:
        payload["error_message"] = error_msg
    db.query(model.TaskLog).filter(model.TaskLog.id == task_log_id).update(payload)
    db.commit()
