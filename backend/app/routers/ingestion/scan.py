"""本地文件系统扫描导入

重构说明：
- 路由层仅负责参数验证和任务调度
- 业务逻辑完全委托给 AssetImportService
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from ...db import get_db
from ... import schema
from ...schema.ingestion import ScanRequest, ScanResponseData
from ...services.ingestion import AssetImportService, ImportConfig
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
    scan_path = request.source_path

    # 验证路径存在性
    if not os.path.exists(scan_path):
        logger.error(f"扫描路径不存在: {scan_path}")
        raise HTTPException(status_code=404, detail=f"扫描路径不存在: {scan_path}")

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

    logger.info(
        f"触发素材扫描任务 - "
        f"路径: {scan_path}, "
        f"用户: {request.created_by}, "
        f"可见性: {request.visibility}, "
        f"导入到相册: {request.import_to_album}, "
        f"默认GPS: {default_gps}"
    )

    # 添加后台任务
    background_tasks.add_task(_run_import_task, scan_path, request, db, default_gps)

    return schema.ApiResponse.success(
        data=ScanResponseData(
            status="scanning",
            path=scan_path
        ),
        message="素材扫描任务已在后台启动"
    )


def _run_import_task(
    scan_path: str,
    request: ScanRequest,
    db: Session,
    default_gps: tuple[float, float] = None
):
    """后台导入任务

    职责：
    - 创建导入配置
    - 执行导入服务
    - 记录最终结果
    """
    logger.info("后台任务开始执行: 素材导入")

    try:
        # 创建导入配置
        config = ImportConfig(
            scan_path=scan_path,
            created_by=request.created_by,
            visibility=request.visibility,
            db=db,
            import_to_album=request.import_to_album,
            album_id=request.album_info.album_id if request.album_info else None,
            album_name=request.album_info.album_name if request.album_info else None,
            album_start_time=request.album_info.start_time if request.album_info else None,
            album_end_time=request.album_info.end_time if request.album_info else None,
            default_gps=default_gps
        )

        # 执行导入服务
        service = AssetImportService(config)
        statistics = service.import_assets()

        # 最终统计
        logger.info(statistics.get_summary())

        # 如果有失败，记录详情
        if statistics.has_failures():
            logger.warning(f"以下 {statistics.failed} 个文件导入失败:")
            for file_path, error in statistics.failed_files[:10]:  # 最多显示 10 个
                logger.warning(f"  - {file_path}: {error}")

    except Exception as e:
        logger.error(f"导入任务执行失败: {e}")
        db.rollback()
