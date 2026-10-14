"""素材版本：保存 AI 修图结果、切换当前展示版本、删除版本

「设为当前」只改 assets.thumbnail_path / preview_path：全站 19 处用这两个字段出图（列表、首页、相册、
地图、笔记…），改字段就全部生效，不用逐处改。original_path、file_hash、向量、人脸、哈希都不动——
版本只是展示层，素材的身份仍由原图决定。
原图的缩略图/预览路径存在 kind=original 那行，第一次修图时创建，用来切回原图。
"""
import io
from pathlib import Path
from typing import List, Optional

from PIL import Image
from sqlalchemy.orm import Session

from ... import model
from ...config import settings
from ...tools.utils import get_logger
from ..thumbnail import ThumbnailGeneratorFactory

logger = get_logger(__name__)

VERSIONS_DIR = "processed/versions"
KIND_ORIGINAL = "original"
KIND_AI_EDIT = "ai_edit"
OUTPUT_QUALITY = 92


class VersionError(ValueError):
    """版本操作不合法（转成 400）"""


def version_dir(asset_id: int) -> str:
    return f"{VERSIONS_DIR}/{asset_id}"


def list_versions(db: Session, asset_id: int) -> List[model.AssetVersion]:
    rows = db.query(model.AssetVersion).filter(
        model.AssetVersion.asset_id == asset_id,
        model.AssetVersion.is_deleted == False,
    ).all()
    # 原图排第一，其余按生成先后
    return sorted(rows, key=lambda v: (v.kind != KIND_ORIGINAL, v.id))


def save_edit_version(db: Session, asset: model.Asset, job_id: int, created_by: int, png: bytes) -> model.AssetVersion:
    """修图结果落盘为 webp + 缩略图，新增一行版本（不自动设为当前）"""
    _ensure_original(db, asset, created_by)
    version = model.AssetVersion(asset_id=asset.id, kind=KIND_AI_EDIT, job_id=job_id, created_by=created_by)
    db.add(version)
    db.flush()  # 拿到 id 用于文件命名

    rel_dir = version_dir(asset.id)
    file_rel = f"{rel_dir}/v{version.id}.webp"
    thumb_rel = f"{rel_dir}/v{version.id}_thumbnail.webp"
    root = Path(settings.NAS_DATA_PATH)
    (root / rel_dir).mkdir(parents=True, exist_ok=True)
    with Image.open(io.BytesIO(png)) as image:
        image = image.convert("RGB")
        image.save(root / file_rel, format="WEBP", quality=OUTPUT_QUALITY)
        version.width, version.height = image.size
    if ThumbnailGeneratorFactory.generate("image", str(root / file_rel), str(root / thumb_rel)):
        version.thumbnail_path = thumb_rel
    else:
        logger.warning("版本缩略图生成失败，用大图兜底: %s", file_rel)
        version.thumbnail_path = file_rel
    version.file_path = file_rel
    version.preview_path = file_rel
    db.commit()
    return version


def set_current(db: Session, asset: model.Asset, version_id: Optional[int]) -> None:
    """切换当前展示版本；version_id 为空或指向原图行时切回原图"""
    version = _get(db, asset.id, version_id) if version_id else None
    if version is None or version.kind == KIND_ORIGINAL:
        original = _get_original(db, asset.id)
        if original is not None:
            asset.thumbnail_path = original.thumbnail_path
            asset.preview_path = original.preview_path
        asset.current_version_id = None
    else:
        asset.thumbnail_path = version.thumbnail_path
        asset.preview_path = version.preview_path
        asset.current_version_id = version.id
    db.commit()


def delete_version(db: Session, asset: model.Asset, version_id: int) -> None:
    """删除一个 AI 版本（原图不能删）；是当前版本时先切回原图，再删文件"""
    version = _get(db, asset.id, version_id)
    if version.kind == KIND_ORIGINAL:
        raise VersionError("原图不能删除")
    if asset.current_version_id == version.id:
        set_current(db, asset, None)
    version.is_deleted = True
    db.commit()
    for rel in {version.file_path, version.thumbnail_path}:
        if rel:
            Path(settings.NAS_DATA_PATH, rel).unlink(missing_ok=True)


def _get(db: Session, asset_id: int, version_id: int) -> model.AssetVersion:
    version = db.query(model.AssetVersion).filter(
        model.AssetVersion.id == version_id,
        model.AssetVersion.asset_id == asset_id,
        model.AssetVersion.is_deleted == False,
    ).first()
    if version is None:
        raise VersionError("版本不存在")
    return version


def _get_original(db: Session, asset_id: int) -> Optional[model.AssetVersion]:
    return db.query(model.AssetVersion).filter(
        model.AssetVersion.asset_id == asset_id,
        model.AssetVersion.kind == KIND_ORIGINAL,
        model.AssetVersion.is_deleted == False,
    ).first()


def _ensure_original(db: Session, asset: model.Asset, created_by: int) -> model.AssetVersion:
    """第一次修图时把原图的缩略图/预览路径存一份；此时素材必然还在展示原图"""
    original = _get_original(db, asset.id)
    if original is not None:
        return original
    if asset.current_version_id:
        raise VersionError("缺少原图版本记录，无法安全保存")
    original = model.AssetVersion(
        asset_id=asset.id,
        kind=KIND_ORIGINAL,
        file_path=None,
        thumbnail_path=asset.thumbnail_path,
        preview_path=asset.preview_path,
        created_by=created_by,
    )
    db.add(original)
    db.flush()
    return original


