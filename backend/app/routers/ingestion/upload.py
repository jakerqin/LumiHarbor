"""HTTP 上传导入素材"""
from fastapi import APIRouter, UploadFile, File, Depends, Form, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pathlib import Path
from ...db import get_db
from ... import schema, model
from ...tools.utils import get_logger
from ...services.ingestion import AssetImportService, ImportConfig
from ...services.tags import TagService
import os
import shutil
import tempfile

logger = get_logger(__name__)

router = APIRouter(
    prefix="/ingestion",
    tags=["Ingestion"],
)


@router.post("/upload", response_model=schema.ApiResponse[dict])
async def upload_single_asset(
    file: UploadFile = File(...),
    created_by: int = Form(1),
    visibility: str = Form("general"),
    location_poi: Optional[str] = Form(None),
    default_gps: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """通过 HTTP 上传单个素材文件

    参数:
        file: 上传的文件
        created_by: 创建者用户ID
        visibility: 素材可见性 ('general' | 'private')
        location_poi: 地标名称（可选）
        default_gps: 默认经纬度，格式：'经度,纬度'（可选）

    返回:
        上传结果信息
    """
    logger.info(f"接收上传文件: {file.filename}, 类型: {file.content_type}")
    return await _handle_upload([file], created_by, visibility, location_poi, default_gps, db)


@router.post("/upload/batch", response_model=schema.ApiResponse[dict])
async def upload_batch_assets(
    files: List[UploadFile] = File(...),
    created_by: int = Form(1),
    visibility: str = Form("general"),
    location_poi: Optional[str] = Form(None),
    default_gps: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """批量上传素材文件

    参数:
        files: 上传的文件列表
        created_by: 创建者用户ID
        visibility: 素材可见性 ('general' | 'private')
        location_poi: 地标名称（可选）
        default_gps: 默认经纬度，格式：'经度,纬度'（可选）

    返回:
        批量上传结果信息
    """
    logger.info(f"接收批量上传，共 {len(files)} 个文件")
    return await _handle_upload(files, created_by, visibility, location_poi, default_gps, db)


async def _handle_upload(
    files: List[UploadFile],
    created_by: int,
    visibility: str,
    location_poi: Optional[str],
    default_gps: Optional[str],
    db: Session
) -> schema.ApiResponse[dict]:
    if not files:
        raise HTTPException(status_code=400, detail="未选择上传文件")

    # 解析默认 GPS
    parsed_gps = None
    if default_gps:
        try:
            lng_str, lat_str = default_gps.split(',')
            parsed_gps = (float(lng_str), float(lat_str))
        except ValueError:
            raise HTTPException(status_code=400, detail="经纬度格式错误，应为：'经度,纬度'")

    temp_dir = tempfile.mkdtemp(prefix="ingestion-upload-")
    normalized_location = _normalize_location_poi(location_poi)
    try:
        _save_upload_files(files, temp_dir)
        stats, imported_ids = _import_uploaded_files(temp_dir, created_by, visibility, parsed_gps, db)
        location_tags = 0
        if normalized_location:
            location_tags = _apply_location_poi_tags(db, imported_ids, normalized_location)

        return schema.ApiResponse.success(data={
            "status": "completed",
            "total": stats.total,
            "imported": stats.imported,
            "skipped": stats.skipped,
            "failed": stats.failed,
            "location_tags": location_tags
        })
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.error(f"上传导入失败: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail="上传导入失败")
    finally:
        try:
            shutil.rmtree(temp_dir, ignore_errors=True)
        finally:
            for file in files:
                try:
                    await file.close()
                except Exception:
                    continue


def _save_upload_files(files: List[UploadFile], temp_dir: str) -> None:
    for index, file in enumerate(files, 1):
        filename = Path(file.filename or "").name
        if not filename:
            filename = f"upload_{index}"
        target_path = os.path.join(temp_dir, f"{index}_{filename}")
        with open(target_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)


def _import_uploaded_files(
    temp_dir: str,
    created_by: int,
    visibility: str,
    default_gps: Optional[tuple[float, float]],
    db: Session
):
    config = ImportConfig(
        scan_path=temp_dir,
        created_by=created_by,
        visibility=visibility,
        default_gps=default_gps,
        db=db
    )
    service = AssetImportService(config)
    stats = service.import_assets()
    return stats, service.imported_asset_ids


def _apply_location_poi_tags(db: Session, asset_ids: List[int], location_poi: str) -> int:
    if not asset_ids:
        return 0

    assets = db.query(model.Asset.id, model.Asset.asset_type).filter(
        model.Asset.id.in_(asset_ids),
        model.Asset.is_deleted == False
    ).all()

    saved_total = 0
    for asset_id, asset_type in assets:
        saved_total += TagService.batch_save_asset_tags(
            db=db,
            asset_id=asset_id,
            asset_type=asset_type,
            tag_data={"location_poi": location_poi}
        )

    return saved_total


def _normalize_location_poi(location_poi: Optional[str]) -> Optional[str]:
    if not location_poi:
        return None
    cleaned = location_poi.strip()
    return cleaned if cleaned else None
