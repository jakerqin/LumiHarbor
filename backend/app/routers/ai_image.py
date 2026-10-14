"""AI 修图 / 生图路由：任务、预设、素材版本"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .. import model, schema
from ..config import settings
from ..db import get_db
from ..schema.ai_image import (
    AiImageJobCreate,
    AiImageJobOut,
    AiImageStatus,
    AssetVersionOut,
    AssetVersionsResponse,
    SetCurrentVersionRequest,
)
from ..services.ai_image import (
    AiImageDisabled,
    AiImageError,
    AiImageLimitExceeded,
    VersionError,
    service,
    versions,
)
from ..services.asset_url import AssetUrlProviderFactory
from ..tasks.ai_image_tasks import ai_image_task
from ..tasks.sender import run_coroutine_sync
from ..tools.utils import get_logger

logger = get_logger(__name__)

router = APIRouter(tags=["AI Image"])


@router.get("/ai-image/status", response_model=schema.ApiResponse[AiImageStatus])
def get_status(db: Session = Depends(get_db)):
    """总开关 / Key 配置状态 + 预设列表（前端据此决定是否显示入口）"""
    return schema.ApiResponse.success(data=AiImageStatus(
        **service.availability(db), model=settings.AI_IMAGE_MODEL, **service.presets_payload(),
    ))


@router.post("/ai-image/jobs", response_model=schema.ApiResponse[AiImageJobOut])
def create_job(
    payload: AiImageJobCreate,
    user_id: int = Query(1, description="用户ID"),
    db: Session = Depends(get_db),
):
    """建任务并投递到 Worker，立即返回；前端轮询 GET /ai-image/jobs/{id}"""
    try:
        job = service.create_job(db, user_id=user_id, **payload.model_dump())
    except AiImageDisabled as exc:
        raise HTTPException(status_code=403, detail=str(exc))
    except AiImageLimitExceeded as exc:
        raise HTTPException(status_code=429, detail=str(exc))
    except (ValueError, AiImageError) as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    try:
        run_coroutine_sync(ai_image_task.kiq(job_id=job.id))
    except Exception:
        logger.exception("AI 任务投递失败 - job %s", job.id)
        job.status, job.error_message = "failed", "任务队列不可用（检查 Redis 和 Worker）"
        db.commit()
    return schema.ApiResponse.success(data=AiImageJobOut.model_validate(job))


@router.get("/ai-image/jobs/{job_id}", response_model=schema.ApiResponse[AiImageJobOut])
def get_job(job_id: int, db: Session = Depends(get_db)):
    job = db.get(model.AiImageJob, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="任务不存在")
    return schema.ApiResponse.success(data=AiImageJobOut.model_validate(job))


@router.get("/assets/{asset_id}/versions", response_model=schema.ApiResponse[AssetVersionsResponse])
def list_versions(asset_id: int, db: Session = Depends(get_db)):
    """原图排第一；还没修过图时只返回一行虚拟的「原图」"""
    asset = _get_asset(db, asset_id)
    rows = versions.list_versions(db, asset_id)
    items = [_version_out(asset, v) for v in rows] or [_virtual_original(asset)]
    return schema.ApiResponse.success(data=AssetVersionsResponse(
        current_version_id=asset.current_version_id, versions=items,
    ))


@router.put("/assets/{asset_id}/current-version", response_model=schema.ApiResponse[dict])
def set_current_version(asset_id: int, payload: SetCurrentVersionRequest, db: Session = Depends(get_db)):
    asset = _get_asset(db, asset_id)
    try:
        versions.set_current(db, asset, payload.version_id)
    except VersionError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return schema.ApiResponse.success(data={"current_version_id": asset.current_version_id})


@router.delete("/assets/{asset_id}/versions/{version_id}", response_model=schema.ApiResponse[dict])
def delete_version(asset_id: int, version_id: int, db: Session = Depends(get_db)):
    asset = _get_asset(db, asset_id)
    try:
        versions.delete_version(db, asset, version_id)
    except VersionError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return schema.ApiResponse.success(data={"current_version_id": asset.current_version_id})


def _get_asset(db: Session, asset_id: int) -> model.Asset:
    asset = db.query(model.Asset).filter(model.Asset.id == asset_id, model.Asset.is_deleted == False).first()
    if asset is None:
        raise HTTPException(status_code=404, detail="素材不存在")
    return asset


def _version_out(asset: model.Asset, version: model.AssetVersion) -> AssetVersionOut:
    urls = AssetUrlProviderFactory.create()
    is_original = version.kind == versions.KIND_ORIGINAL
    image_rel = (version.preview_path or asset.original_path) if is_original else version.file_path
    return AssetVersionOut(
        id=version.id, kind=version.kind, job_id=version.job_id,
        thumbnail_url=urls.maybe_to_public_url(version.thumbnail_path),
        image_url=urls.maybe_to_public_url(image_rel),
        width=version.width, height=version.height,
        is_current=(asset.current_version_id == version.id) or (is_original and not asset.current_version_id),
        created_at=version.created_at,
    )


def _virtual_original(asset: model.Asset) -> AssetVersionOut:
    urls = AssetUrlProviderFactory.create()
    return AssetVersionOut(
        id=0, kind=versions.KIND_ORIGINAL,
        thumbnail_url=urls.maybe_to_public_url(asset.thumbnail_path),
        image_url=urls.maybe_to_public_url(asset.preview_path or asset.original_path),
        is_current=True, created_at=asset.created_at,
    )
