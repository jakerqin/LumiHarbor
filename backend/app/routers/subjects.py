"""家庭面孔名单。"""
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from .. import schema
from ..db import get_db
from ..services.face import FaceService
from ..services.subject import SubjectService

router = APIRouter(prefix="/subjects", tags=["Subjects"])


@router.get("", response_model=schema.ApiResponse[schema.SubjectsPageResponse])
def list_subjects(
    kind: Optional[str] = Query(None, description="human | pet"),
    user_id: int = Query(1),
    db: Session = Depends(get_db),
):
    if kind and kind not in ("human", "pet"):
        raise HTTPException(status_code=400, detail="kind 只能是 human 或 pet")
    items = SubjectService.list_subjects(db, user_id, kind)
    return schema.ApiResponse.success(data=schema.SubjectsPageResponse(
        subjects=[schema.SubjectOut(**item) for item in items],
        total=len(items),
    ))


@router.post("", response_model=schema.ApiResponse[schema.SubjectOut])
def create_subject(payload: schema.SubjectCreate, user_id: int = Query(1), db: Session = Depends(get_db)):
    try:
        subject = SubjectService.create(db, user_id, payload.name, payload.kind, payload.species)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return schema.ApiResponse.success(data=schema.SubjectOut(**SubjectService.to_out(subject)))


@router.post("/face-candidates", response_model=schema.ApiResponse[List[schema.FaceCandidateOut]])
def candidates_from_upload(file: UploadFile = File(...)):
    """上传图当场检脸，不落库。须注册在 /{subject_id} 之前。"""
    try:
        items = SubjectService.candidates_for_upload(file)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return schema.ApiResponse.success(data=[schema.FaceCandidateOut(**item) for item in items])


@router.get("/{subject_id}", response_model=schema.ApiResponse[schema.SubjectOut])
def get_subject(subject_id: int, user_id: int = Query(1), db: Session = Depends(get_db)):
    subject = _require_subject(db, subject_id, user_id)
    counts = SubjectService.list_subjects(db, user_id, None)
    face_count = next((item["face_count"] for item in counts if item["id"] == subject.id), 0)
    return schema.ApiResponse.success(data=schema.SubjectOut(**SubjectService.to_out(subject, face_count)))


@router.patch("/{subject_id}", response_model=schema.ApiResponse[schema.SubjectOut])
def update_subject(
    subject_id: int,
    payload: schema.SubjectUpdate,
    user_id: int = Query(1),
    db: Session = Depends(get_db),
):
    subject = _require_subject(db, subject_id, user_id)
    subject = SubjectService.update(db, subject, payload.name)
    return schema.ApiResponse.success(data=schema.SubjectOut(**SubjectService.to_out(subject)))


@router.delete("/{subject_id}", response_model=schema.ApiResponse[dict])
def delete_subject(subject_id: int, user_id: int = Query(1), db: Session = Depends(get_db)):
    subject = _require_subject(db, subject_id, user_id)
    SubjectService.soft_delete(db, subject)
    return schema.ApiResponse.success(data={"id": subject_id, "deleted": True})


@router.post("/{subject_id}/refs", response_model=schema.ApiResponse[schema.SubjectOut])
def upload_ref(
    subject_id: int,
    file: UploadFile = File(...),
    bbox_x: Optional[float] = Form(None),
    bbox_y: Optional[float] = Form(None),
    bbox_w: Optional[float] = Form(None),
    bbox_h: Optional[float] = Form(None),
    user_id: int = Query(1),
    db: Session = Depends(get_db),
):
    subject = _require_subject(db, subject_id, user_id)
    bbox = _optional_bbox(bbox_x, bbox_y, bbox_w, bbox_h)
    try:
        SubjectService.add_ref_upload(db, subject, file, bbox)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return schema.ApiResponse.success(data=schema.SubjectOut(**SubjectService.to_out(subject)))


@router.get("/{subject_id}/faces", response_model=schema.ApiResponse[schema.FacesPageResponse])
def list_subject_faces(
    subject_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=100),
    user_id: int = Query(1),
    db: Session = Depends(get_db),
):
    _require_subject(db, subject_id, user_id)
    faces, total = FaceService.list_faces(db, user_id, None, page, page_size, subject_id)
    return schema.ApiResponse.success(data=schema.FacesPageResponse(
        faces=[schema.FaceOut(**item) for item in FaceService.to_out_many(db, faces)],
        total=total,
        page=page,
        page_size=page_size,
        has_more=total > page * page_size,
    ))


def _optional_bbox(x, y, w, h):
    if None in (x, y, w, h):
        return None
    return (x, y, w, h)


def _require_subject(db, subject_id: int, user_id: int):
    subject = SubjectService.get(db, subject_id, user_id)
    if not subject:
        raise HTTPException(status_code=404, detail="成员不存在")
    return subject
