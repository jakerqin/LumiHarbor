"""本地文件系统扫描导入

重构说明：
- 原 194 行代码拆分为 5 个单一职责类
- 路由层仅负责参数验证和任务调度
- 业务逻辑完全委托给 AssetImportService
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from ...db import get_db
from ... import schema
from ...schema.ingestion import ScanRequest, ScanResponseData
from ...services.ingestion import AssetImportService, ImportConfig
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

    返回:
        任务状态信息
    """
    scan_path = request.source_path

    # 验证路径存在性
    if not os.path.exists(scan_path):
        logger.error(f"扫描路径不存在: {scan_path}")
        raise HTTPException(status_code=404, detail=f"扫描路径不存在: {scan_path}")

    logger.info(
        f"触发素材扫描任务 - "
        f"路径: {scan_path}, "
        f"用户: {request.created_by}, "
        f"可见性: {request.visibility}"
    )

    # 添加后台任务
    background_tasks.add_task(_run_import_task, scan_path, request, db)

    return schema.ApiResponse.success(
        data=ScanResponseData(
            status="scanning",
            path=scan_path
        ),
        message="素材扫描任务已在后台启动"
    )


def _run_import_task(scan_path: str, request: ScanRequest, db: Session):
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
            db=db
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
