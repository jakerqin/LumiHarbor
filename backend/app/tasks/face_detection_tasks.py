"""人脸 / 动物脸异步检测。"""
from datetime import datetime

from .broker import broker
from ..db import SessionLocal
from .. import model
from ..services.face import FaceService
from ..tools.utils import get_logger

logger = get_logger(__name__)


@broker.task(task_name="detect_faces", retry_on_error=True, max_retries=2)
async def detect_faces_task(asset_id: int, task_log_id: int = None) -> dict:
    logger.info(f"开始人脸/动物脸检测 - Asset ID: {asset_id}")
    db = SessionLocal()
    try:
        _mark_log(db, task_log_id, "running")
        asset = db.query(model.Asset).filter(
            model.Asset.id == asset_id,
            model.Asset.is_deleted == False,
        ).first()
        if not asset:
            _mark_log(db, task_log_id, "failed", "素材不存在")
            return {"success": False, "asset_id": asset_id, "face_count": 0, "message": "素材不存在"}
        result = FaceService.process_asset(db, asset)
        status = "success" if result.get("success") else "failed"
        _mark_log(db, task_log_id, status, None if status == "success" else result.get("message"))
        logger.info(f"脸检测完成 - Asset ID: {asset_id}, count={result.get('face_count')}")
        return {"asset_id": asset_id, **result}
    except Exception as exc:
        logger.error(f"脸检测失败 - Asset ID: {asset_id}: {exc}", exc_info=True)
        _mark_log(db, task_log_id, "failed", str(exc))
        return {"success": False, "asset_id": asset_id, "face_count": 0, "message": str(exc)}
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
