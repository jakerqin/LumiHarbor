"""回收站到期清理：超过保留天数的素材彻底删除文件（数据库记录保留为已删除）

在后端进程内定时执行：启动时一次，之后每 24 小时一次（用户的机器不一定常开，启动时补跑更可靠）。
清理可重复执行，多个进程或多次重启各跑一遍也只是重复检查。
"""
import threading
import time
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import List, Optional

from sqlalchemy.orm import Session

from ... import model
from ...config import settings
from ...db import SessionLocal
from ...tools.utils import get_logger
from .store import TrashEntry, remove_entry, remove_face_crops, scan_entries

logger = get_logger(__name__)

PURGE_INTERVAL_SECONDS = 24 * 60 * 60
_loop_started = False
_loop_lock = threading.Lock()


@dataclass
class PurgeItem:
    asset_id: int
    deleted_at: datetime
    size_bytes: int


def find_expired(db: Session, retention_days: int, now: Optional[datetime] = None) -> List[TrashEntry]:
    """到期且仍处于删除状态的回收站条目（已恢复的素材不碰）"""
    cutoff = (now or datetime.now()) - timedelta(days=retention_days)
    expired = [e for e in scan_entries().values() if e.deleted_at < cutoff]
    if not expired:
        return []
    alive_ids = {
        row.id for row in db.query(model.Asset.id).filter(
            model.Asset.id.in_([e.asset_id for e in expired]),
            model.Asset.is_deleted == False,
        )
    }
    return sorted((e for e in expired if e.asset_id not in alive_ids), key=lambda e: e.deleted_at)


def purge_expired(
    db: Session,
    retention_days: int,
    apply: bool,
    now: Optional[datetime] = None,
) -> List[PurgeItem]:
    """清理到期素材的文件；apply=False 只返回清单"""
    items = []
    for entry in find_expired(db, retention_days, now):
        items.append(PurgeItem(entry.asset_id, entry.deleted_at, entry.size_bytes()))
        if apply:
            remove_face_crops(entry.asset_id)
            remove_entry(entry)
    return items


def run_once() -> None:
    retention_days = settings.RECYCLE_RETENTION_DAYS
    if retention_days <= 0:
        return
    db = SessionLocal()
    try:
        items = purge_expired(db, retention_days, apply=True)
        if items:
            total_mb = sum(i.size_bytes for i in items) / 1024 / 1024
            logger.info(
                "回收站清理：彻底删除 %d 个超过 %d 天的素材，释放 %.1fMB，ID: %s",
                len(items), retention_days, total_mb, [i.asset_id for i in items],
            )
    except Exception:
        logger.exception("回收站清理失败")
    finally:
        db.close()


def start_purge_loop() -> None:
    """后台线程：立即清理一次，之后每 24 小时一次。重复调用只启动一个线程"""
    global _loop_started
    if settings.RECYCLE_RETENTION_DAYS <= 0:
        logger.info("回收站自动清理已关闭（RECYCLE_RETENTION_DAYS<=0）")
        return
    with _loop_lock:
        if _loop_started:
            return
        _loop_started = True

    def _loop():
        while True:
            run_once()
            time.sleep(PURGE_INTERVAL_SECONDS)

    threading.Thread(target=_loop, name="recycle-bin-purge", daemon=True).start()
