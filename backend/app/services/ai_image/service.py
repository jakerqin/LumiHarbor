"""AI 修图 / 生图任务：创建校验、Worker 内执行

接口只建任务行并投递 Taskiq，立刻返回 job_id；调用模型要 30 秒到数分钟，前端轮询任务状态。
任务行本身就是日志（task_logs.asset_id 必填，生图没有源素材，不适合记在那里）。
"""
import shutil
import tempfile
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from sqlalchemy.orm import Session

from ... import model
from ...config import settings
from ...tools.utils import get_logger
from ..face import FaceService
from ..ingestion import AssetImportService, ImportConfig
from ..tasks import TaskDefinitionService
from . import client, versions
from .client import AiImageError
from .presets import EDIT_PRESETS, GENERATE_PRESETS, build_prompt

logger = get_logger(__name__)

TASK_CODE = "ai_image"
MAX_REFERENCES = 4
STATUS_PENDING, STATUS_RUNNING, STATUS_SUCCESS, STATUS_FAILED = "pending", "running", "success", "failed"
GENERIC_FAILURE = "处理失败，请稍后再试"


class AiImageDisabled(Exception):
    """总开关关闭或未配置 Key（转成 403）"""


class AiImageLimitExceeded(Exception):
    """超出每日任务上限（转成 429）"""


def availability(db: Session) -> dict:
    enabled = TaskDefinitionService.is_enabled(db, TASK_CODE)
    configured = client.is_configured()
    return {"enabled": enabled and configured, "switch_on": enabled, "configured": configured}


def presets_payload() -> dict:
    def dump(items):
        return [{"code": p.code, "name": p.name, "description": p.description,
                 "needs_input": p.needs_input, "hq": p.hq} for p in items]
    return {"edit": dump(EDIT_PRESETS), "generate": dump(GENERATE_PRESETS),
            "sizes": list(client.GENERATE_SIZES)}


def create_job(db: Session, *, job_type: str, user_id: int, asset_id: Optional[int] = None,
               preset_code: Optional[str] = None, prompt: Optional[str] = None,
               tier: str = "standard", size: Optional[str] = None,
               reference_asset_ids: Optional[List[int]] = None) -> model.AiImageJob:
    """校验并建任务行（不投递）；参数不合法抛 ValueError"""
    if not availability(db)["enabled"]:
        raise AiImageDisabled("AI 修图未开启或未配置 OPENAI_API_KEY")
    _check_daily_limit(db, user_id)
    build_prompt(job_type, preset_code, prompt)  # 提前校验预设与描述
    if job_type == "edit":
        size = _edit_size(_require_image_asset(db, asset_id), tier)
        reference_asset_ids = None
    else:
        size, reference_asset_ids = _check_generate_args(db, size, reference_asset_ids)
        asset_id = None

    job = model.AiImageJob(
        job_type=job_type, asset_id=asset_id,
        reference_asset_ids=reference_asset_ids or None, preset_code=preset_code,
        prompt=(prompt or "").strip() or None, model=settings.AI_IMAGE_MODEL,
        quality=client.quality_for(tier), size=size, status=STATUS_PENDING,
        created_by=user_id,
    )
    db.add(job)
    db.commit()
    return job


async def run_job(db: Session, job_id: int) -> None:
    """Worker 内执行；失败原因写回任务行，不向外抛"""
    job = db.get(model.AiImageJob, job_id)
    if job is None or job.status not in (STATUS_PENDING, STATUS_RUNNING):
        return
    job.status = STATUS_RUNNING
    db.commit()
    try:
        prompt = build_prompt(job.job_type, job.preset_code, job.prompt)
        if job.job_type == "edit":
            await _run_edit(db, job, prompt)
        else:
            await _run_generate(db, job, prompt)
        job.status, job.error_message = STATUS_SUCCESS, None
    except (AiImageError, ValueError) as exc:
        db.rollback()
        job.status, job.error_message = STATUS_FAILED, str(exc)
    except Exception:
        logger.exception("AI 任务执行失败 - job %s", job_id)
        db.rollback()
        job.status, job.error_message = STATUS_FAILED, GENERIC_FAILURE
    db.commit()


def _edit_size(asset: model.Asset, tier: str) -> str:
    """按当前展示图的宽高比算输出尺寸（建任务时算好，Worker 直接用）"""
    width, height = client.image_size(_source_path(asset))
    return client.edit_size(width, height, tier)


def _source_path(asset: model.Asset) -> str:
    # preview_path 优先：设为当前的版本会写进 preview_path，所以能在上一次修图结果上接着修
    path = FaceService.resolve_infer_path(asset)
    if not path:
        raise AiImageError("找不到可用于修图的图片文件")
    return path


def _check_generate_args(db: Session, size: Optional[str], reference_asset_ids: Optional[List[int]]):
    resolved = client.GENERATE_SIZES.get(size or "square")
    if resolved is None:
        raise ValueError("不支持的尺寸")
    refs = list(dict.fromkeys(reference_asset_ids or []))
    if len(refs) > MAX_REFERENCES:
        raise ValueError(f"参考图最多 {MAX_REFERENCES} 张")
    for ref_id in refs:
        _require_image_asset(db, ref_id)
    return resolved, refs


async def _run_edit(db: Session, job: model.AiImageJob, prompt: str) -> None:
    asset = _require_image_asset(db, job.asset_id)
    source = _source_path(asset)
    png = await client.call_images_api(prompt, [client.prepare_input(source)], job.size, job.quality)
    version = versions.save_edit_version(db, asset, job.id, job.created_by, png)
    job.result_version_id = version.id


async def _run_generate(db: Session, job: model.AiImageJob, prompt: str) -> None:
    references = []
    for ref_id in job.reference_asset_ids or []:
        path = FaceService.resolve_infer_path(_require_image_asset(db, ref_id))
        if path:
            references.append(client.prepare_input(path))
    png = await client.call_images_api(prompt, references, job.size, job.quality)
    job.result_asset_id = _import_generated(db, job, png)


def _import_generated(db: Session, job: model.AiImageJob, png: bytes) -> int:
    """生图结果走正常导入（缩略图、哈希、语义向量都有），再打 ai_generated 标签"""
    temp_dir = tempfile.mkdtemp(prefix="ai-image-")
    try:
        Path(temp_dir, f"ai_{job.id}.png").write_bytes(png)
        service = AssetImportService(ImportConfig(scan_path=temp_dir, created_by=job.created_by, db=db))
        service.import_assets()
        if not service.imported_asset_ids:
            raise AiImageError("生成的图片入库失败")
        asset_id = service.imported_asset_ids[0]
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)
    db.add(model.AssetTag(asset_id=asset_id, tag_key="ai_generated", tag_value="1"))
    db.commit()
    return asset_id


def _require_image_asset(db: Session, asset_id: Optional[int]) -> model.Asset:
    asset = db.query(model.Asset).filter(
        model.Asset.id == asset_id, model.Asset.is_deleted == False,
    ).first() if asset_id else None
    if asset is None:
        raise ValueError("素材不存在")
    if asset.asset_type != "image":
        raise ValueError("只支持图片")
    return asset


def _check_daily_limit(db: Session, user_id: int) -> None:
    limit = settings.AI_IMAGE_DAILY_LIMIT
    if limit <= 0:
        return
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    count = db.query(model.AiImageJob).filter(
        model.AiImageJob.created_by == user_id,
        model.AiImageJob.created_at >= today,
    ).count()
    if count >= limit:
        raise AiImageLimitExceeded(f"今天已发起 {count} 次，达到上限 {limit}（AI_IMAGE_DAILY_LIMIT）")
