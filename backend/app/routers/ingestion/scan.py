"""本地文件系统扫描导入

重构说明：
- 路由层仅负责参数验证和任务调度
- 业务逻辑完全委托给 AssetImportService
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from ...db import get_db, SessionLocal
from ... import schema
from ...config import settings
from ...schema.ingestion import ScanRequest, ScanResponseData, ScanStatusData
from ...services.ingestion import AssetImportService, ImportConfig
from ...services.ingestion.scan_state import scan_state
from ...services.album import AlbumService
from ...tools.utils import get_logger
import os

logger = get_logger(__name__)

router = APIRouter(
    prefix="/ingestion",
    tags=["Ingestion"],
)


@router.post("/scan", response_model=schema.ApiResponse[ScanResponseData])
def scan_and_import(
    request: ScanRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """扫描文件系统并导入素材

    参数:
        request: 扫描请求参数
            - source_path: 扫描路径（默认使用配置的 NAS_DATA_PATH）
            - created_by: 创建者用户ID（默认: 1）
            - visibility: 素材可见性，可选 'general'(公共) 或 'private'(私有)（默认: general）
            - import_to_album: 是否导入到相册（默认: False）
            - album_info: 相册信息（当 import_to_album=True 时必填）
            - default_gps: 默认经纬度，格式：'经度,纬度'（可选）

    返回:
        任务状态信息
    """
    scan_path = request.source_path or settings.NAS_DATA_PATH

    # 验证 NAS_DATA_PATH（入库目标目录）
    if not settings.NAS_DATA_PATH or not os.path.isdir(settings.NAS_DATA_PATH):
        raise HTTPException(
            status_code=500,
            detail=f"NAS_DATA_PATH 未配置或目录不存在: {settings.NAS_DATA_PATH}"
        )

    # 验证路径存在性
    if not scan_path or not os.path.isdir(scan_path):
        logger.error(f"扫描路径不存在或不是目录: {scan_path}")
        raise HTTPException(status_code=404, detail=f"扫描路径不存在或不是目录: {scan_path}")

    # 验证相册参数
    if request.import_to_album:
        if not request.album_info:
            raise HTTPException(status_code=400, detail="当 import_to_album=True 时，album_info 必填")

        # 如果传入 album_id，验证相册是否存在
        if request.album_info.album_id:
            album = AlbumService.get_album_by_id(db, request.album_info.album_id)
            if not album:
                raise HTTPException(
                    status_code=404,
                    detail=f"相册不存在: ID={request.album_info.album_id}"
                )

    # 解析默认 GPS
    default_gps = None
    if request.default_gps:
        try:
            lng_str, lat_str = request.default_gps.split(',')
            default_gps = (float(lng_str), float(lat_str))
        except ValueError:
            raise HTTPException(status_code=400, detail="经纬度格式错误")

    # 同一时间只允许一个扫描：两个扫描同时导入同一批文件，哈希去重来不及生效会插出重复记录
    if not scan_state.try_start(scan_path):
        running = scan_state.snapshot()
        raise HTTPException(status_code=409, detail=f"已有扫描在进行中: {running['path']}，进度见 GET /ingestion/scan/status")

    # 后台任务自己开会话，不复用请求级 db（请求结束后它的生命周期由 FastAPI 管）
    background_tasks.add_task(_run_import_task, scan_path, request, default_gps)

    return schema.ApiResponse.success(
        data=ScanResponseData(
            status="scanning",
            path=scan_path
        ),
        message="素材扫描任务已在后台启动"
    )


@router.get("/scan/status", response_model=schema.ApiResponse[ScanStatusData])
def get_scan_status():
    """查询扫描进度（只反映当前后端进程内的扫描）"""
    return schema.ApiResponse.success(data=ScanStatusData(**scan_state.snapshot()))


def _run_import_task(
    scan_path: str,
    request: ScanRequest,
    default_gps: tuple[float, float] = None
):
    """后台导入任务：执行导入、维护扫描状态、记录结果"""
    logger.info("后台任务开始执行: 素材导入")
    db = SessionLocal()
    try:
        album_info = request.album_info
        config = ImportConfig(
            scan_path=scan_path,
            created_by=request.created_by,
            visibility=request.visibility,
            db=db,
            import_to_album=request.import_to_album,
            album_id=album_info.album_id if album_info else None,
            album_name=album_info.album_name if album_info else None,
            album_start_time=album_info.start_time if album_info else None,
            album_end_time=album_info.end_time if album_info else None,
            default_gps=default_gps
        )
        service = AssetImportService(config)
        scan_state.attach(service.statistics)
        statistics = service.import_assets()

        if statistics.has_failures():
            logger.warning(f"以下 {statistics.failed} 个文件导入失败:")
            for file_path, error in statistics.failed_files[:10]:  # 最多显示 10 个
                logger.warning(f"  - {file_path}: {error}")
        scan_state.finish()

    except Exception as e:
        # 详情只进日志，状态接口只给异常类型
        logger.exception(f"导入任务执行失败: {e}")
        db.rollback()
        scan_state.finish(error=f"{type(e).__name__}（详情见后端日志）")
    finally:
        db.close()
