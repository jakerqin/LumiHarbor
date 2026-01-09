"""素材收藏路由"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from ..db import get_db
from ..model.asset import Asset
from ..model.user_favorite import UserFavorite

router = APIRouter(prefix="/assets", tags=["assets"])


@router.post("/{asset_id}/favorite")
def favorite_asset(
    asset_id: int,
    user_id: int = Query(default=1, description="用户ID（v1.0 默认1）"),
    db: Session = Depends(get_db)
):
    """收藏素材（多用户支持）

    业务逻辑：
    1. 检查素材是否存在且未删除
    2. 检查是否已收藏（避免重复）
    3. 创建收藏记录

    Args:
        asset_id: 素材ID
        user_id: 用户ID（当前默认1，未来从 JWT 获取）
        db: 数据库会话

    Returns:
        收藏成功信息
    """

    # 1. 检查素材是否存在
    asset = db.get(Asset, asset_id)
    if not asset or asset.is_deleted:
        raise HTTPException(404, "素材不存在或已删除")

    # 2. 检查是否已收藏
    existing_query = select(UserFavorite).where(
        UserFavorite.user_id == user_id,
        UserFavorite.asset_id == asset_id,
        UserFavorite.is_deleted == False
    )
    existing = db.scalar(existing_query)
    if existing:
        raise HTTPException(400, "已收藏该素材")

    # 3. 创建收藏记录
    favorite = UserFavorite(
        user_id=user_id,
        asset_id=asset_id,
        favorited_at=datetime.utcnow()
    )
    db.add(favorite)

    try:
        db.commit()
        db.refresh(favorite)
    except IntegrityError:
        db.rollback()
        raise HTTPException(400, "收藏失败：可能已存在")

    return {
        "code": 200,
        "message": "收藏成功",
        "data": {
            "favoriteId": favorite.id,
            "userId": user_id,
            "assetId": asset_id,
            "favoritedAt": favorite.favorited_at
        }
    }


@router.delete("/{asset_id}/favorite")
def unfavorite_asset(
    asset_id: int,
    user_id: int = Query(default=1, description="用户ID（v1.0 默认1）"),
    db: Session = Depends(get_db)
):
    """取消收藏（多用户支持）

    业务逻辑：
    1. 查找收藏记录
    2. 删除收藏记录

    Args:
        asset_id: 素材ID
        user_id: 用户ID（当前默认1，未来从 JWT 获取）
        db: 数据库会话

    Returns:
        取消收藏成功信息
    """

    # 查找收藏记录
    query = select(UserFavorite).where(
        UserFavorite.user_id == user_id,
        UserFavorite.asset_id == asset_id,
        UserFavorite.is_deleted == False
    )
    favorite = db.scalar(query)

    if not favorite:
        raise HTTPException(404, "未收藏该素材")

    # 软删除收藏记录
    favorite.is_deleted = True
    db.commit()

    return {
        "code": 200,
        "message": "已取消收藏",
        "data": {
            "userId": user_id,
            "assetId": asset_id
        }
    }
