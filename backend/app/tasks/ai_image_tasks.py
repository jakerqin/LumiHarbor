"""AI 修图 / 生图异步任务（只等 OpenAI 网络返回，不占本机 GPU）"""
from .broker import broker
from ..db import SessionLocal
from ..tools.utils import get_logger

logger = get_logger(__name__)


# 不自动重试：模型调用按次计费，失败原因写回任务行，由用户决定是否重来
@broker.task(task_name="ai_image", retry_on_error=False)
async def ai_image_task(job_id: int) -> dict:
    # 延迟导入：services.tasks → app.tasks → 本模块 → services.ai_image → services.ingestion 会循环导入
    from ..services.ai_image import service

    logger.info(f"开始 AI 图像任务 - job {job_id}")
    db = SessionLocal()
    try:
        await service.run_job(db, job_id)
        return {"job_id": job_id}
    finally:
        db.close()
