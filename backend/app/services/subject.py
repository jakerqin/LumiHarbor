"""家庭名单：成员 CRUD、上传登记照。"""
import tempfile
from dataclasses import replace
from pathlib import Path
from typing import List, Optional, Sequence

from sqlalchemy import func
from sqlalchemy.orm import Session
from fastapi import UploadFile

from .. import model
from ..config import settings
from ..tools.face.geometry import crop_face, iou, normalize_bbox
from ..tools.face.image_io import load_rgb
from ..tools.face.types import DetectedFace
from .asset import AssetService
from .vector_store import VectorStore

PET_SPECIES = frozenset({"cat", "dog"})
PICK_IOU = 0.25


class SubjectService:
    @staticmethod
    def list_subjects(db: Session, user_id: int, kind: Optional[str]) -> List[dict]:
        query = db.query(model.Subject).filter(
            model.Subject.created_by == user_id,
            model.Subject.is_deleted == False,
        )
        if kind:
            query = query.filter(model.Subject.kind == kind)
        subjects = query.order_by(model.Subject.id.desc()).all()
        counts = _face_counts(db, {item.id for item in subjects})
        return [SubjectService.to_out(item, counts.get(item.id, 0)) for item in subjects]

    @staticmethod
    def get(db: Session, subject_id: int, user_id: int) -> Optional[model.Subject]:
        return db.query(model.Subject).filter(
            model.Subject.id == subject_id,
            model.Subject.created_by == user_id,
            model.Subject.is_deleted == False,
        ).first()

    @staticmethod
    def create(db: Session, user_id: int, name: str, kind: str, species: Optional[str]) -> model.Subject:
        kind, species = _validate_kind(kind, species)
        subject = model.Subject(
            name=name.strip(),
            kind=kind,
            species=species,
            created_by=user_id,
        )
        db.add(subject)
        db.commit()
        db.refresh(subject)
        return subject

    @staticmethod
    def update(db: Session, subject: model.Subject, name: Optional[str]) -> model.Subject:
        if name:
            subject.name = name.strip()
        db.commit()
        db.refresh(subject)
        return subject

    @staticmethod
    def soft_delete(db: Session, subject: model.Subject) -> None:
        refs = db.query(model.SubjectRef).filter(
            model.SubjectRef.subject_id == subject.id,
            model.SubjectRef.is_deleted == False,
        ).all()
        point_ids = [_ref_point_id(ref) for ref in refs]
        for ref in refs:
            ref.is_deleted = True
        faces = db.query(model.Face).filter(
            model.Face.subject_id == subject.id,
            model.Face.is_deleted == False,
        ).all()
        for face in faces:
            face.is_deleted = True
        subject.is_deleted = True
        db.commit()
        store = VectorStore.instance()
        store.delete_points(subject.kind, [pid for pid in point_ids if pid])

    @staticmethod
    def to_out(subject: model.Subject, face_count: int = 0) -> dict:
        url_provider = AssetService.get_url_provider()
        return {
            "id": subject.id,
            "name": subject.name,
            "kind": subject.kind,
            "species": subject.species,
            "cover_path": subject.cover_path,
            "cover_url": url_provider.maybe_to_public_url(subject.cover_path),
            "face_count": face_count,
            "created_at": subject.created_at,
        }

    @staticmethod
    def candidates_for_upload(file: UploadFile) -> List[dict]:
        path = _save_temp_upload(file)
        try:
            return _candidates_from_path(path)
        finally:
            Path(path).unlink(missing_ok=True)

    @staticmethod
    def add_ref_upload(
        db: Session,
        subject: model.Subject,
        file: UploadFile,
        bbox: Optional[tuple] = None,
    ) -> model.SubjectRef:
        path = _save_temp_upload(file)
        try:
            detected = _pick_detection(path, subject, bbox)
            return _persist_ref(db, subject, detected, load_rgb(path))
        finally:
            Path(path).unlink(missing_ok=True)


def _validate_kind(kind: str, species: Optional[str]) -> tuple[str, Optional[str]]:
    if kind not in ("human", "pet"):
        raise ValueError("kind 只能是 human 或 pet")
    if kind == "human":
        return kind, None
    if species not in PET_SPECIES:
        raise ValueError("宠物必须指定 species=cat 或 dog")
    return kind, species


def _face_counts(db: Session, ids: set) -> dict:
    if not ids:
        return {}
    rows = db.query(model.Face.subject_id, func.count(model.Face.id)).filter(
        model.Face.subject_id.in_(ids),
        model.Face.is_deleted == False,
    ).group_by(model.Face.subject_id).all()
    return {row[0]: row[1] for row in rows}


def _candidates_from_path(image_path: str) -> List[dict]:
    from ..tools.face.pipeline import detect_faces_in_image

    detections = detect_faces_in_image(image_path)
    image = load_rgb(image_path)
    width, height = image.size
    return [_candidate_out(det, width, height) for det in detections]


def _candidate_out(det: DetectedFace, width: int, height: int) -> dict:
    nx, ny, nw, nh = normalize_bbox(det.bbox, width, height)
    return {
        "bbox_x": nx,
        "bbox_y": ny,
        "bbox_w": nw,
        "bbox_h": nh,
        "subject_type": det.subject_type,
        "species": det.species,
        "det_score": det.det_score,
    }


def _save_temp_upload(file: UploadFile) -> str:
    suffix = Path(file.filename or "face.jpg").suffix or ".jpg"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(file.file.read())
        return tmp.name


def _pick_detection(image_path: str, subject: model.Subject, bbox=None) -> DetectedFace:
    from ..tools.face.pipeline import detect_faces_in_image

    include_human = subject.kind == "human"
    detections = detect_faces_in_image(
        image_path,
        include_human=include_human,
        include_animal=not include_human,
    )
    detections = _filter_for_subject(detections, subject)
    if not detections:
        raise ValueError("这张图上没有对得上的脸")
    if bbox is None:
        return max(detections, key=lambda item: item.bbox[2] * item.bbox[3])
    image = load_rgb(image_path)
    target = _pixel_bbox(bbox, image.size)
    best = max(detections, key=lambda item: iou(item.bbox, target))
    if iou(best.bbox, target) < PICK_IOU and not _center_inside(target, best.bbox):
        raise ValueError("点选的框对不上检出的脸")
    # 用用户调过的框裁切，embedding 仍来自最近的检出
    return replace(best, bbox=target)


def _filter_for_subject(detections: Sequence[DetectedFace], subject: model.Subject) -> List[DetectedFace]:
    if subject.kind == "human":
        return [item for item in detections if item.subject_type == "human"]
    return [
        item for item in detections
        if item.subject_type == "animal" and item.species == subject.species
    ]


def _persist_ref(
    db: Session,
    subject: model.Subject,
    detected: DetectedFace,
    image,
) -> model.SubjectRef:
    ref = model.SubjectRef(
        subject_id=subject.id,
        source="upload",
        asset_id=None,
        embedding_model=detected.embedding_model,
    )
    db.add(ref)
    db.flush()
    rel = _save_ref_crop(image, detected, subject.id, ref.id)
    ref.crop_path = rel
    ref.qdrant_point_id = str(ref.id)
    if not subject.cover_path:
        subject.cover_path = rel
    db.commit()
    VectorStore.instance().upsert_face(
        subject.kind,
        ref.id,
        detected.embedding,
        {"subject_id": subject.id, "ref_id": ref.id, "kind": subject.kind},
    )
    return ref


def _save_ref_crop(image, detected: DetectedFace, subject_id: int, ref_id: int) -> str:
    rel = f"processed/subjects/{subject_id}_{ref_id}.webp"
    dest = Path(settings.NAS_DATA_PATH) / rel
    dest.parent.mkdir(parents=True, exist_ok=True)
    crop_face(image, detected.bbox, padding=0).save(dest, "WEBP", quality=88)
    return rel


def _pixel_bbox(norm, size) -> tuple:
    width, height = size
    return (norm[0] * width, norm[1] * height, norm[2] * width, norm[3] * height)


def _center_inside(inner, outer) -> bool:
    cx = inner[0] + inner[2] / 2
    cy = inner[1] + inner[3] / 2
    return outer[0] <= cx <= outer[0] + outer[2] and outer[1] <= cy <= outer[1] + outer[3]


def _ref_point_id(ref: model.SubjectRef) -> Optional[int]:
    if ref.qdrant_point_id and str(ref.qdrant_point_id).isdigit():
        return int(ref.qdrant_point_id)
    return int(ref.id) if ref.id else None
