"""人脸 / 动物脸业务：匹配名单才落库。"""
import os
from datetime import date, datetime, time, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Sequence, Set, Tuple

from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import model
from ..config import settings
from ..tools.face.geometry import crop_face, normalize_bbox
from ..tools.face.image_io import load_rgb
from ..tools.face.types import DetectedFace
from ..tools.utils import get_logger
from .asset import AssetService
from .vector_store import VectorStore

logger = get_logger(__name__)

HUMAN_MATCH = 0.32
PET_MATCH = 0.50
CROP_PAD = 0.32
CROP_PAD_PET = 0.45
_SKIP_INFER_SUFFIX = {".mov", ".mp4", ".m4v", ".avi", ".mkv", ".webm"}


class FaceService:
    """脸记录。检测引擎仅在 process_asset / 登记路径懒加载。"""

    @staticmethod
    def list_by_asset(db: Session, asset_id: int) -> List[model.Face]:
        return db.query(model.Face).filter(
            model.Face.asset_id == asset_id,
            model.Face.is_deleted == False,
        ).order_by(model.Face.id.asc()).all()

    @staticmethod
    def list_faces(
        db: Session,
        user_id: int,
        subject_type: Optional[str],
        page: int,
        page_size: int,
        subject_id: Optional[int] = None,
    ) -> tuple[List[model.Face], int]:
        query = db.query(model.Face).join(
            model.Asset, model.Asset.id == model.Face.asset_id
        ).filter(
            model.Face.is_deleted == False,
            model.Asset.is_deleted == False,
            model.Asset.created_by == user_id,
            model.Face.subject_id.isnot(None),
        )
        if subject_type:
            query = query.filter(model.Face.subject_type == subject_type)
        if subject_id:
            query = query.filter(model.Face.subject_id == subject_id)
        total = query.count()
        offset = (page - 1) * page_size
        faces = query.order_by(model.Face.id.desc()).offset(offset).limit(page_size).all()
        return faces, total

    @staticmethod
    def to_out(face: model.Face, names: Dict[int, str]) -> dict:
        url_provider = AssetService.get_url_provider()
        subject_name = names.get(face.subject_id) if face.subject_id else None
        return {
            "id": face.id,
            "asset_id": face.asset_id,
            "subject_id": face.subject_id,
            "subject_name": subject_name,
            "subject_type": face.subject_type,
            "species": face.species,
            "bbox_x": float(face.bbox_x),
            "bbox_y": float(face.bbox_y),
            "bbox_w": float(face.bbox_w),
            "bbox_h": float(face.bbox_h),
            "det_score": float(face.det_score) if face.det_score is not None else None,
            "quality_score": float(face.quality_score) if face.quality_score is not None else None,
            "embedding_model": face.embedding_model,
            "crop_path": face.crop_path,
            "crop_url": url_provider.maybe_to_public_url(face.crop_path),
            "created_at": face.created_at,
        }

    @staticmethod
    def to_out_many(db: Session, faces: Sequence[model.Face]) -> List[dict]:
        names = _load_subject_names(db, {f.subject_id for f in faces if f.subject_id})
        return [FaceService.to_out(face, names) for face in faces]

    @staticmethod
    def resolve_infer_path(asset: model.Asset) -> Optional[str]:
        root = settings.NAS_DATA_PATH
        for rel in (asset.preview_path, asset.original_path, asset.thumbnail_path):
            if not rel:
                continue
            if Path(rel).suffix.lower() in _SKIP_INFER_SUFFIX:
                continue
            full = os.path.join(root, rel)
            if os.path.isfile(full):
                return full
        return None

    @staticmethod
    def process_asset(db: Session, asset: model.Asset) -> dict:
        if asset.asset_type == "audio":
            return {"success": True, "face_count": 0, "message": "音频跳过"}
        infer_path = FaceService.resolve_infer_path(asset)
        if not infer_path:
            return {"success": False, "face_count": 0, "message": "找不到可推理图片"}
        kinds = enrolled_kinds(db, asset.created_by)
        if not kinds:
            FaceService.replace_faces(db, asset, infer_path, [])
            return {"success": True, "face_count": 0, "message": "名单为空"}
        from ..tools.face.pipeline import detect_faces_in_image

        detections = detect_faces_in_image(
            infer_path,
            include_human="human" in kinds,
            include_animal="pet" in kinds,
        )
        matched = match_detections(detections)
        FaceService.replace_faces(db, asset, infer_path, matched)
        return {"success": True, "face_count": len(matched), "message": "ok"}

    @staticmethod
    def replace_faces(
        db: Session,
        asset: model.Asset,
        infer_path: str,
        detections: Sequence[DetectedFace],
    ) -> None:
        FaceService.soft_delete_for_assets(db, [asset.id])
        if not detections:
            return
        image = load_rgb(infer_path)
        width, height = image.size
        for detected in detections:
            face = _insert_face(db, asset, detected, width, height)
            face.crop_path = _save_crop(image, detected, asset.id, face.id)
            db.commit()

    @staticmethod
    def soft_delete_for_assets(db: Session, asset_ids: List[int]) -> None:
        if not asset_ids:
            return
        faces = db.query(model.Face).filter(
            model.Face.asset_id.in_(asset_ids),
            model.Face.is_deleted == False,
        ).all()
        if not faces:
            return
        for face in faces:
            face.is_deleted = True
        db.commit()

    @staticmethod
    def assets_need_backfill(
        db: Session,
        asset_ids: Optional[List[int]],
        missing_only: bool,
        limit: int,
        shot_range: Optional[Tuple[Optional[date], Optional[date]]] = None,
    ) -> List[int]:
        query = db.query(model.Asset.id).filter(
            model.Asset.is_deleted == False,
            model.Asset.asset_type.in_(["image", "video"]),
        )
        if asset_ids:
            query = query.filter(model.Asset.id.in_(asset_ids))
        query = _filter_shot_range(query, shot_range)
        ids = [row[0] for row in query.order_by(model.Asset.id.desc()).limit(limit).all()]
        if not missing_only:
            return ids
        done = {
            row[0] for row in db.query(model.Face.asset_id).filter(
                model.Face.asset_id.in_(ids),
                model.Face.is_deleted == False,
                model.Face.subject_id.isnot(None),
            ).distinct().all()
        }
        return [asset_id for asset_id in ids if asset_id not in done]


def enrolled_kinds(db: Session, user_id: int) -> Set[str]:
    rows = db.query(model.Subject.kind).filter(
        model.Subject.created_by == user_id,
        model.Subject.is_deleted == False,
    ).distinct().all()
    return {row[0] for row in rows}


def match_detections(detections: Sequence[DetectedFace]) -> List[DetectedFace]:
    store = VectorStore.instance()
    best: Dict[int, DetectedFace] = {}
    for detected in detections:
        kind = "human" if detected.subject_type == "human" else "pet"
        thresh = HUMAN_MATCH if kind == "human" else PET_MATCH
        hits = store.search(kind, detected.embedding, 1, 0.0)
        score = hits[0]["score"] if hits else 0.0
        if not hits or score < thresh:
            logger.info(f"{kind} 未命中 score={score:.3f} thresh={thresh}")
            continue
        subject_id = hits[0].get("payload", {}).get("subject_id")
        if not subject_id:
            continue
        detected.subject_id = int(subject_id)
        prev = best.get(detected.subject_id)
        if prev is None or detected.det_score > prev.det_score:
            best[detected.subject_id] = detected
    return list(best.values())


def _insert_face(db: Session, asset: model.Asset, detected: DetectedFace, width: int, height: int) -> model.Face:
    nx, ny, nw, nh = normalize_bbox(detected.bbox, width, height)
    face = model.Face(
        asset_id=asset.id,
        subject_id=detected.subject_id,
        subject_type=detected.subject_type,
        species=detected.species,
        bbox_x=nx,
        bbox_y=ny,
        bbox_w=nw,
        bbox_h=nh,
        det_score=detected.det_score,
        quality_score=detected.quality_score or detected.det_score,
        embedding_model=detected.embedding_model,
    )
    db.add(face)
    db.flush()
    return face


def _save_crop(image, detected: DetectedFace, asset_id: int, face_id: int) -> str:
    rel = f"processed/faces/{asset_id}_{face_id}.webp"
    dest = Path(settings.NAS_DATA_PATH) / rel
    dest.parent.mkdir(parents=True, exist_ok=True)
    pad = CROP_PAD_PET if detected.subject_type == "animal" else CROP_PAD
    crop_face(image, detected.bbox, padding=pad).save(dest, "WEBP", quality=88)
    return rel


def shot_range_bounds(
    shot_from: Optional[date],
    shot_to: Optional[date],
) -> Tuple[Optional[datetime], Optional[datetime]]:
    start = datetime.combine(shot_from, time.min) if shot_from else None
    end = datetime.combine(shot_to + timedelta(days=1), time.min) if shot_to else None
    return start, end


def _filter_shot_range(query, shot_range: Optional[Tuple[Optional[date], Optional[date]]]):
    if not shot_range:
        return query
    start, end = shot_range_bounds(*shot_range)
    if start is None and end is None:
        return query
    when = func.coalesce(model.Asset.shot_at, model.Asset.created_at)
    if start is not None:
        query = query.filter(when >= start)
    if end is not None:
        query = query.filter(when < end)
    return query


def _load_subject_names(db: Session, ids: Set[int]) -> Dict[int, str]:
    if not ids:
        return {}
    rows = db.query(model.Subject.id, model.Subject.name).filter(
        model.Subject.id.in_(ids),
        model.Subject.is_deleted == False,
    ).all()
    return {row[0]: row[1] for row in rows}
