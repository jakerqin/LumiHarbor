"""HTTP 上传导入素材"""
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ...db import get_db
from ...config import settings
from ... import schema
from ...tools.utils import get_logger
import os
import shutil
from datetime import datetime

logger = get_logger(__name__)

router = APIRouter(
    prefix="/ingestion",
    tags=["Ingestion"],
)


@router.post("/upload", response_model=schema.ApiResponse[dict])
async def upload_single_asset(
    file: UploadFile = File(...),
    created_by: int = 1,
    visibility: str = "general",
    db: Session = Depends(get_db)
):
    """通过 HTTP 上传单个素材文件

    参数:
        file: 上传的文件
        created_by: 创建者用户ID
        visibility: 素材可见性 ('general' | 'private')

    返回:
        上传结果信息
    """
    logger.info(f"接收上传文件: {file.filename}, 类型: {file.content_type}")

    # TODO: 实现上传逻辑
    # 1. 验证文件类型和大小
    # 2. 生成唯一文件名
    # 3. 保存到 NAS 存储
    # 4. 提取元数据
    # 5. 创建数据库记录
    # 6. 生成缩略图

    return schema.ApiResponse.success(data={
        "status": "pending",
        "message": "上传功能即将推出"
    })


@router.post("/upload/batch", response_model=schema.ApiResponse[dict])
async def upload_batch_assets(
    files: List[UploadFile] = File(...),
    created_by: int = 1,
    visibility: str = "general",
    db: Session = Depends(get_db)
):
    """批量上传素材文件

    参数:
        files: 上传的文件列表
        created_by: 创建者用户ID
        visibility: 素材可见性 ('general' | 'private')

    返回:
        批量上传结果信息
    """
    logger.info(f"接收批量上传，共 {len(files)} 个文件")

    # TODO: 实现批量上传逻辑
    # 1. 并发处理多个文件
    # 2. 错误处理和部分成功
    # 3. 进度追踪

    return schema.ApiResponse.success(data={
        "status": "pending",
        "total": len(files),
        "message": "批量上传功能即将推出"
    })
