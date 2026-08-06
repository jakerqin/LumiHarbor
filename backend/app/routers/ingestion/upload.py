"""HTTP 上传导入素材"""
from dataclasses import dataclass
from fastapi import APIRouter, UploadFile, File, Depends, Form, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pathlib import Path
from ...db import get_db
from ... import schema, model
from ...tools.utils import get_logger
from ...services.ingestion import AssetImportService, ImportConfig
from ...services.album import AlbumService
from ...services.tags import TagService
import os
import shutil
import tempfile

logger = get_logger(__name__)

router = APIRouter(
    prefix="/ingestion",
    tags=["Ingestion"],
)


@dataclass
class AlbumUploadParams:
    """上传时的相册关联参数（原始表单值，未解析）"""
    import_to_album: bool = False
    album_id: Optional[int] = None
    album_name: Optional[str] = None
    album_description: Optional[str] = None
    album_start_time: Optional[str] = None  # 'YYYY-MM-DD'
    album_end_time: Optional[str] = None  # 'YYYY-MM-DD'


@router.post("/upload", response_model=schema.ApiResponse[dict])
async def upload_single_asset(
    file: UploadFile = File(...),
    created_by: int = Form(1),
    visibility: str = Form("general"),
    location_poi: Optional[str] = Form(None),
    default_gps: Optional[str] = Form(None),
    import_to_album: bool = Form(False),
    album_id: Optional[int] = Form(None),
    album_name: Optional[str] = Form(None),
    album_description: Optional[str] = Form(None),
    album_start_time: Optional[str] = Form(None),
    album_end_time: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """通过 HTTP 上传单个素材文件

    参数:
        file: 上传的文件
        created_by: 创建者用户ID
        visibility: 素材可见性 ('general' | 'private')
        location_poi: 地标名称（可选）
        default_gps: 默认经纬度，格式：'经度,纬度'（可选）
        import_to_album: 是否关联相册（可选）
        album_id: 现有相册ID（与 album_name 二选一）
        album_name: 新建相册名称（与 album_id 二选一）
        album_description: 新建相册描述（可选）
        album_start_time / album_end_time: 新建相册时间范围，格式 'YYYY-MM-DD'（可选）

    返回:
        上传结果信息
    """
    logger.info(f"接收上传文件: {file.filename}, 类型: {file.content_type}")
    album_params = AlbumUploadParams(
        import_to_album, album_id, album_name, album_description, album_start_time, album_end_time
    )
    return await _handle_upload([file], created_by, visibility, location_poi, default_gps, album_params, db)


@router.post("/upload/batch", response_model=schema.ApiResponse[dict])
async def upload_batch_assets(
    files: List[UploadFile] = File(...),
    created_by: int = Form(1),
    visibility: str = Form("general"),
    location_poi: Optional[str] = Form(None),
    default_gps: Optional[str] = Form(None),
    import_to_album: bool = Form(False),
    album_id: Optional[int] = Form(None),
    album_name: Optional[str] = Form(None),
    album_description: Optional[str] = Form(None),
    album_start_time: Optional[str] = Form(None),
    album_end_time: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """批量上传素材文件

    参数同 `upload_single_asset`，`files` 为文件列表。

    返回:
        批量上传结果信息
    """
    logger.info(f"接收批量上传，共 {len(files)} 个文件")
    album_params = AlbumUploadParams(
        import_to_album, album_id, album_name, album_description, album_start_time, album_end_time
    )
    return await _handle_upload(files, created_by, visibility, location_poi, default_gps, album_params, db)


async def _handle_upload(
    files: List[UploadFile],
    created_by: int,
    visibility: str,
    location_poi: Optional[str],
    default_gps: Optional[str],
    album_params: AlbumUploadParams,
    db: Session
) -> schema.ApiResponse[dict]:
    if not files:
        raise HTTPException(status_code=400, detail="未选择上传文件")

    parsed_gps = _parse_default_gps(default_gps)
    album_kwargs = _parse_album_params(album_params)

    temp_dir = tempfile.mkdtemp(prefix="ingestion-upload-")
    normalized_location = _normalize_location_poi(location_poi)
    try:
        _save_upload_files(files, temp_dir)
        stats, imported_ids, album_result = _import_uploaded_files(
            temp_dir, created_by, visibility, parsed_gps, album_kwargs, db
        )
        location_tags = 0
        if normalized_location:
            location_tags = _apply_location_poi_tags(db, imported_ids, normalized_location)

        return schema.ApiResponse.success(data={
            "status": "completed",
            "total": stats.total,
            "imported": stats.imported,
            "skipped": stats.skipped,
            "failed": stats.failed,
            "location_tags": location_tags,
            "album": album_result
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


def _parse_default_gps(default_gps: Optional[str]) -> Optional[tuple[float, float]]:
    if not default_gps:
        return None
    try:
        lng_str, lat_str = default_gps.split(',')
        return (float(lng_str), float(lat_str))
    except ValueError:
        raise HTTPException(status_code=400, detail="经纬度格式错误，应为：'经度,纬度'")


def _parse_album_params(params: AlbumUploadParams) -> dict:
    """校验并解析相册关联参数，转换成 ImportConfig 需要的关键字参数

    与 ImportConfig.__post_init__ 保持一致的校验语义：
    - import_to_album=True 时 album_id / album_name 必须二选一
    """
    if not params.import_to_album:
        return {}

    if params.album_id is None and not params.album_name:
        raise HTTPException(status_code=400, detail="album_id 或 album_name 必须提供一个")
    if params.album_id is not None and params.album_name:
        raise HTTPException(status_code=400, detail="album_id 和 album_name 只能提供一个")

    start_dt = None
    end_dt = None
    try:
        if params.album_start_time:
            start_dt = AlbumService._parse_date_bound(params.album_start_time, "album_start_time", "start")
        if params.album_end_time:
            end_dt = AlbumService._parse_date_bound(params.album_end_time, "album_end_time", "end")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    return {
        "import_to_album": True,
        "album_id": params.album_id,
        "album_name": params.album_name,
        "album_description": params.album_description,
        "album_start_time": start_dt,
        "album_end_time": end_dt,
    }


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
    album_kwargs: dict,
    db: Session
):
    config = ImportConfig(
        scan_path=temp_dir,
        created_by=created_by,
        visibility=visibility,
        default_gps=default_gps,
        db=db,
        **album_kwargs
    )
    service = AssetImportService(config)
    stats = service.import_assets()
    return stats, service.imported_asset_ids, service.album_result


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
