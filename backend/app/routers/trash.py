"""回收站路由"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from .. import schema
from ..config import settings
from ..db import get_db
from ..schema.trash import TrashListResponse, TrashRestoreRequest, TrashRestoreResponse
from ..services.trash import TrashService

router = APIRouter(
    prefix="/trash",
    tags=["Trash"],
)


@router.get("", response_model=schema.ApiResponse[TrashListResponse])
def list_trash(
    user_id: int = Query(1, description="用户ID"),
    db: Session = Depends(get_db),
):
    """回收站里的素材（按删除时间倒序），只列出文件还在回收站里的"""
    items = TrashService.list_items(db, user_id)
    return schema.ApiResponse.success(data=TrashListResponse(
        items=items,
        total=len(items),
        retention_days=max(settings.RECYCLE_RETENTION_DAYS, 0),
    ))


@router.post("/restore", response_model=schema.ApiResponse[TrashRestoreResponse])
def restore_trash(
    payload: TrashRestoreRequest,
    user_id: int = Query(1, description="用户ID"),
    db: Session = Depends(get_db),
):
    """恢复素材：文件挪回原位置，标签/相册关系/人脸一并恢复；收藏不恢复"""
    return schema.ApiResponse.success(data=TrashService.restore(db, payload.asset_ids, user_id))
