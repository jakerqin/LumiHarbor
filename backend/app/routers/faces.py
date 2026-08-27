"""已匹配名单的脸分页。"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .. import schema
from ..db import get_db
from ..services.face import FaceService

router = APIRouter(prefix="/faces", tags=["Faces"])


@router.get("", response_model=schema.ApiResponse[schema.FacesPageResponse])
def list_faces(
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=100),
    subject_type: Optional[str] = Query(None, description="human | animal"),
    subject_id: Optional[int] = Query(None),
    user_id: int = Query(1, description="当前用户ID"),
    db: Session = Depends(get_db),
):
    if subject_type and subject_type not in ("human", "animal"):
        raise HTTPException(status_code=400, detail="subject_type 只能是 human 或 animal")
    faces, total = FaceService.list_faces(db, user_id, subject_type, page, page_size, subject_id)
    return schema.ApiResponse.success(data=schema.FacesPageResponse(
        faces=[schema.FaceOut(**item) for item in FaceService.to_out_many(db, faces)],
        total=total,
        page=page,
        page_size=page_size,
        has_more=total > page * page_size,
    ))
