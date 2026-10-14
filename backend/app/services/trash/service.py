"""回收站：列出可恢复的素材、恢复

恢复 = 文件挪回原位置 + 撤销删除时的级联软删（标签、相册关系、人脸）+ 重新算语义向量。
级联记录按「updated_at 不早于素材行的 updated_at」识别（删除时同一次提交写入、同一个数据库时钟），
避免把删除前就单独删掉的标签一起恢复。不用回收站目录名的时间：那是后端进程的本地时间，和数据库时区可能不同。
收藏不恢复：user_favorites 没有更新时间，分不清是随素材删的还是之前取消的。
"""
import math
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Set

from sqlalchemy.orm import Session

from ... import model
from ...config import settings
from ...tasks.clip_tasks import compute_clip_task
from ...tasks.sender import run_coroutine_sync
from ...tools.utils import get_logger
from ..album import AlbumService
from ..asset_url import AssetUrlProviderFactory
from ..metadata_dictionary import MetadataDictionaryService
from ..tasks import TaskDefinitionService
from .store import TrashEntry, nas_root, remove_entry, scan_entries

logger = get_logger(__name__)

# 素材行和级联行在同一次提交里更新，留 2 秒余量防秒级取整
CASCADE_WINDOW = timedelta(seconds=2)
REASON_REIMPORTED = "相同文件已重新导入，恢复会重复"
REASON_PATH_TAKEN = "原位置已有文件"
REASON_NOT_FOUND = "不在回收站中"


class TrashService:

    @staticmethod
    def list_items(db: Session, user_id: int) -> List[dict]:
        entries = scan_entries()
        if not entries:
            return []
        assets = db.query(model.Asset).filter(
            model.Asset.id.in_(list(entries)),
            model.Asset.is_deleted == True,
            model.Asset.created_by == user_id,
        ).all()
        aspect = _aspect_ratios(db, [a.id for a in assets])
        reimported = _reimported_hashes(db, assets)
        items = [
            _to_item(asset, entries[asset.id], aspect.get(asset.id), asset.file_hash in reimported)
            for asset in assets
        ]
        return sorted(items, key=lambda item: item["deleted_at"], reverse=True)

    @staticmethod
    def restore(db: Session, asset_ids: List[int], user_id: int) -> dict:
        entries = scan_entries()
        restored, failed = [], []
        for asset_id in dict.fromkeys(asset_ids):
            reason = _restore_one(db, asset_id, user_id, entries.get(asset_id))
            if reason:
                failed.append({"asset_id": asset_id, "reason": reason})
            else:
                restored.append(asset_id)
        _enqueue_clip(db, restored)
        return {"restored": restored, "failed": failed}


def _restore_one(db: Session, asset_id: int, user_id: int, entry: Optional[TrashEntry]) -> Optional[str]:
    """恢复单个素材；不能恢复时返回原因"""
    asset = db.query(model.Asset).filter(
        model.Asset.id == asset_id,
        model.Asset.is_deleted == True,
        model.Asset.created_by == user_id,
    ).first()
    root = nas_root()
    if not asset or not entry or not root:
        return REASON_NOT_FOUND
    if asset.file_hash and asset.file_hash in _reimported_hashes(db, [asset]):
        return REASON_REIMPORTED
    moves = [(path, root / path.relative_to(entry.root)) for path in entry.files()]
    if any(target.exists() for _, target in moves):
        return REASON_PATH_TAKEN

    for source, target in moves:
        target.parent.mkdir(parents=True, exist_ok=True)
        source.rename(target)
    remove_entry(entry)
    try:
        _revive_rows(db, asset)
    except Exception:
        # 数据库失败时把文件挪回回收站，保持「文件在哪、记录就是什么状态」一致
        db.rollback()
        for source, target in moves:
            source.parent.mkdir(parents=True, exist_ok=True)
            target.rename(source)
        raise
    return None


def _revive_rows(db: Session, asset: model.Asset) -> None:
    since = asset.updated_at - CASCADE_WINDOW
    asset.is_deleted = False
    asset.clip_model = None  # 删除时语义向量已从向量库移除，恢复后重算
    tags = _deleted_since(db, model.AssetTag, asset.id, since)
    links = _deleted_since(db, model.AlbumAsset, asset.id, since)
    for row in tags + links + _deleted_since(db, model.Face, asset.id, since):
        row.is_deleted = False
    for link in links:
        AlbumService._update_album_time_range(db, link.album_id)
        AlbumService._update_album_cover_if_needed(db, link.album_id)
    db.commit()
    for tag in tags:
        if tag.tag_key == "location_poi":
            MetadataDictionaryService.upsert_location_poi(db, tag.tag_value)


def _deleted_since(db: Session, table, asset_id: int, since: datetime) -> list:
    return db.query(table).filter(
        table.asset_id == asset_id,
        table.is_deleted == True,
        table.updated_at >= since,
    ).all()


def _enqueue_clip(db: Session, asset_ids: List[int]) -> None:
    if not asset_ids or not TaskDefinitionService.is_enabled(db, "compute_clip"):
        return
    for asset_id in asset_ids:
        try:
            task_log = model.TaskLog(
                task_type="compute_clip",
                task_status="pending",
                asset_id=asset_id,
                task_params={"source": "trash_restore"},
                retry_count=0,
                max_retries=2,
                created_at=datetime.now(),
            )
            db.add(task_log)
            db.commit()
            run_coroutine_sync(compute_clip_task.kiq(asset_id=asset_id, task_log_id=task_log.id))
        except Exception as exc:
            logger.warning("恢复后语义向量任务发送失败 - Asset ID: %s: %s", asset_id, exc)


def _reimported_hashes(db: Session, assets: List[model.Asset]) -> Set[str]:
    """这些素材的哈希里，已经有未删除素材占用的（删除后又导入了同一个文件）"""
    hashes = {a.file_hash for a in assets if a.file_hash}
    if not hashes:
        return set()
    rows = db.query(model.Asset.file_hash).filter(
        model.Asset.file_hash.in_(hashes),
        model.Asset.is_deleted == False,
    ).distinct()
    return {row.file_hash for row in rows}


def _aspect_ratios(db: Session, asset_ids: List[int]) -> Dict[int, float]:
    """宽高比标签（素材删除后标签也是已删除状态，这里不过滤 is_deleted）"""
    if not asset_ids:
        return {}
    rows = db.query(model.AssetTag.asset_id, model.AssetTag.tag_value).filter(
        model.AssetTag.asset_id.in_(asset_ids),
        model.AssetTag.tag_key == "aspect_ratio",
    )
    result = {}
    for row in rows:
        try:
            result[row.asset_id] = float(row.tag_value)
        except (TypeError, ValueError):
            continue
    return result


def _to_item(asset: model.Asset, entry: TrashEntry, aspect_ratio: Optional[float], reimported: bool) -> dict:
    retention = settings.RECYCLE_RETENTION_DAYS
    expires_at = entry.deleted_at + timedelta(days=retention) if retention > 0 else None
    days_left = None
    if expires_at:
        days_left = max(0, math.ceil((expires_at - datetime.now()).total_seconds() / 86400))
    return {
        "id": asset.id,
        "asset_type": asset.asset_type,
        "mime_type": asset.mime_type,
        "file_size": asset.file_size,
        "shot_at": asset.shot_at,
        "aspect_ratio": aspect_ratio,
        "thumbnail_url": _trash_url(entry, asset.thumbnail_path) or _trash_url(entry, asset.preview_path),
        "deleted_at": entry.deleted_at,
        "expires_at": expires_at,
        "days_left": days_left,
        "restorable": not reimported,
        "reason": REASON_REIMPORTED if reimported else None,
    }


def _trash_url(entry: TrashEntry, relative_path: Optional[str]) -> Optional[str]:
    path = entry.find(relative_path)
    root = nas_root()
    if not path or not root:
        return None
    return AssetUrlProviderFactory.create().to_public_url(str(Path(path).relative_to(root)))
