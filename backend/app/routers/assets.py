"""资源相关路由"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from ..db import get_db
from .. import model, schema

router = APIRouter(
    prefix="/assets",
    tags=["Assets"],
)


@router.get("", response_model=List[schema.AssetOut])
def list_assets(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """获取素材列表

    参数:
        skip: 跳过的记录数（分页）
        limit: 返回的最大记录数（默认: 100）

    返回:
        资源列表，按拍摄时间倒序排列
    """
    assets = db.query(model.Asset).order_by(
        model.Asset.shot_at.desc()
    ).offset(skip).limit(limit).all()
    return assets
