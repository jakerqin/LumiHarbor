"""资源相关路由"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from typing import Optional
from datetime import datetime
from ..db import get_db
from .. import model, schema
from ..services.asset import AssetService
from ..tools.perceptual_hash import find_similar_assets

router = APIRouter(
    prefix="/assets",
    tags=["Assets"],
)


@router.get("", response_model=schema.ApiResponse[schema.AssetsPageResponse])
def list_assets(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(30, ge=1, le=100, description="每页数量"),
    user_id: int = Query(1, description="当前用户ID"),
    asset_type: Optional[str] = Query(None, description="资源类型: image/video/audio"),
    location: Optional[str] = Query(None, description="地点筛选（城市或POI）"),
    sort_by: str = Query("shot_at", description="排序字段"),
    sort_order: str = Query("desc", description="排序方向: asc/desc"),
    db: Session = Depends(get_db)
):
    """获取素材列表（支持筛选、分页、收藏状态）

    参数:
        page: 页码（从 1 开始）
        page_size: 每页数量（默认 30，最大 100）
        user_id: 当前用户ID（用于判断收藏状态）
        asset_type: 资源类型筛选
        location: 地点筛选（匹配 location_city 或 location_poi）
        sort_by: 排序字段（shot_at/created_at）
        sort_order: 排序方向（asc/desc）

    返回:
        分页的素材列表，包含标签信息和收藏状态
    """
    # 1. 构建基础查询
    query = db.query(
        model.Asset,
        func.count(model.UserFavorite.id).label('is_favorited')
    ).outerjoin(
        model.UserFavorite,
        and_(
            model.UserFavorite.asset_id == model.Asset.id,
            model.UserFavorite.user_id == user_id,
            model.UserFavorite.is_deleted == False
        )
    ).filter(
        model.Asset.is_deleted == False
    ).group_by(model.Asset.id)

    # 2. 应用筛选条件
    if asset_type:
        query = query.filter(model.Asset.asset_type == asset_type)

    # 地点筛选（需要子查询）
    if location:
        location_asset_ids = db.query(model.AssetTag.asset_id).filter(
            and_(
                model.AssetTag.tag_key.in_(['location_city', 'location_poi']),
                model.AssetTag.tag_value.like(f'%{location}%'),
                model.AssetTag.is_deleted == False
            )
        ).distinct()
        query = query.filter(model.Asset.id.in_(location_asset_ids))

    # 3. 排序
    sort_column = getattr(model.Asset, sort_by, model.Asset.shot_at)
    if sort_order == 'desc':
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())

    # 4. 总数统计
    total = query.count()

    # 5. 分页
    offset = (page - 1) * page_size
    results = query.offset(offset).limit(page_size).all()

    # 6. 批量查询标签
    asset_ids = [asset.id for asset, _ in results]
    tags_map = AssetService.batch_query_asset_tags(db, asset_ids)

    # 7. 构建响应数据
    url_provider = AssetService.get_url_provider()
    assets_out = [
        schema.AssetOut(**AssetService.build_asset_dict(
            asset,
            url_provider,
            is_favorited=is_favorited_count > 0,
            tags_map=tags_map.get(asset.id, {})
        ))
        for asset, is_favorited_count in results
    ]

    # 9. 判断是否还有下一页
    has_more = total > page * page_size

    return schema.ApiResponse.success(data=schema.AssetsPageResponse(
        assets=assets_out,
        total=total,
        page=page,
        page_size=page_size,
        has_more=has_more
    ))


@router.get("/{asset_id}", response_model=schema.ApiResponse[schema.AssetOut])
def get_asset(
    asset_id: int,
    user_id: int = Query(1, description="当前用户ID"),
    db: Session = Depends(get_db)
):
    """获取单个素材详情（包含收藏状态与常用标签）"""
    row = db.query(
        model.Asset,
        func.count(model.UserFavorite.id).label('is_favorited')
    ).outerjoin(
        model.UserFavorite,
        and_(
            model.UserFavorite.asset_id == model.Asset.id,
            model.UserFavorite.user_id == user_id,
            model.UserFavorite.is_deleted == False
        )
    ).filter(
        model.Asset.id == asset_id,
        model.Asset.is_deleted == False
    ).group_by(model.Asset.id).first()

    if not row:
        raise HTTPException(status_code=404, detail="素材不存在")

    asset, is_favorited_count = row
    tags_map = AssetService.batch_query_asset_tags(db, [asset_id]).get(asset_id, {})
    url_provider = AssetService.get_url_provider()

    return schema.ApiResponse.success(data=schema.AssetOut(**AssetService.build_asset_dict(
        asset,
        url_provider,
        is_favorited=is_favorited_count > 0,
        tags_map=tags_map
    )))


@router.get("/{asset_id}/tags", response_model=schema.ApiResponse[dict])
def get_asset_tags(
    asset_id: int,
    db: Session = Depends(get_db)
):
    """获取素材的全部标签（key/value）"""
    asset = db.query(model.Asset).filter(
        and_(
            model.Asset.id == asset_id,
            model.Asset.is_deleted == False
        )
    ).first()

    if not asset:
        raise HTTPException(status_code=404, detail="素材不存在")

    tags = db.query(model.AssetTag).filter(
        and_(
            model.AssetTag.asset_id == asset_id,
            model.AssetTag.is_deleted == False
        )
    ).all()

    tags_map = {tag.tag_key: tag.tag_value for tag in tags}
    return schema.ApiResponse.success(data=tags_map)


@router.get("/{asset_id}/similar", response_model=schema.ApiResponse[dict])
def get_similar_assets(
    asset_id: int,
    user_id: int = Query(1, description="当前用户ID"),
    threshold: int = Query(10, ge=0, le=64, description="相似度阈值（汉明距离，越小越相似）"),
    limit: int = Query(12, ge=1, le=50, description="返回数量限制"),
    db: Session = Depends(get_db)
):
    """基于 phash 查找相似素材（用于相似推荐）"""
    asset = db.query(model.Asset).filter(
        and_(
            model.Asset.id == asset_id,
            model.Asset.is_deleted == False
        )
    ).first()

    if not asset:
        raise HTTPException(status_code=404, detail="素材不存在")

    if not asset.phash:
        return schema.ApiResponse.success(data={
            "assets": [],
            "total": 0,
            "threshold": threshold,
            "has_phash": False
        })

    similar_entries = find_similar_assets(
        db=db,
        phash=asset.phash,
        threshold=threshold,
        limit=limit,
        exclude_asset_id=asset_id,
        asset_type=asset.asset_type,
    )

    similar_assets = [entry['asset'] for entry in similar_entries]
    similar_asset_ids = [a.id for a in similar_assets]

    favorited_ids = AssetService.batch_query_favorited_ids(db, user_id, similar_asset_ids)
    url_provider = AssetService.get_url_provider()
    assets_out = []
    for entry in similar_entries:
        similar_asset = entry['asset']
        assets_out.append({
            "id": similar_asset.id,
            "asset_type": similar_asset.asset_type,
            "thumbnail_path": similar_asset.thumbnail_path,
            "thumbnail_url": url_provider.maybe_to_public_url(similar_asset.thumbnail_path),
            "preview_url": url_provider.maybe_to_public_url(similar_asset.preview_path),
            "original_url": url_provider.maybe_to_public_url(similar_asset.original_path),
            "shot_at": similar_asset.shot_at,
            "is_favorited": similar_asset.id in favorited_ids,
            "distance": entry['distance'],
            "similarity": round(entry['similarity'], 1),
        })

    return schema.ApiResponse.success(data={
        "assets": assets_out,
        "total": len(assets_out),
        "threshold": threshold,
        "has_phash": True
    })


@router.post("/{asset_id}/favorite", response_model=schema.ApiResponse[dict])
def favorite_asset(
    asset_id: int,
    user_id: int = Query(1, description="当前用户ID"),
    db: Session = Depends(get_db)
):
    """收藏素材

    参数:
        asset_id: 素材ID
        user_id: 当前用户ID

    返回:
        操作结果
    """
    # 1. 检查素材是否存在
    asset = db.query(model.Asset).filter(
        and_(
            model.Asset.id == asset_id,
            model.Asset.is_deleted == False
        )
    ).first()

    if not asset:
        raise HTTPException(status_code=404, detail="素材不存在")

    # 2. 检查是否已收藏
    existing = db.query(model.UserFavorite).filter(
        and_(
            model.UserFavorite.user_id == user_id,
            model.UserFavorite.asset_id == asset_id,
            model.UserFavorite.is_deleted == False
        )
    ).first()

    if existing:
        return schema.ApiResponse.success(data={"message": "已收藏"})

    # 3. 创建收藏记录
    favorite = model.UserFavorite(
        user_id=user_id,
        asset_id=asset_id,
        favorited_at=datetime.now()
    )
    db.add(favorite)
    db.commit()

    return schema.ApiResponse.success(data={"message": "收藏成功"})


@router.delete("/{asset_id}/favorite", response_model=schema.ApiResponse[dict])
def unfavorite_asset(
    asset_id: int,
    user_id: int = Query(1, description="当前用户ID"),
    db: Session = Depends(get_db)
):
    """取消收藏素材

    参数:
        asset_id: 素材ID
        user_id: 当前用户ID

    返回:
        操作结果
    """
    # 1. 查找收藏记录
    favorite = db.query(model.UserFavorite).filter(
        and_(
            model.UserFavorite.user_id == user_id,
            model.UserFavorite.asset_id == asset_id,
            model.UserFavorite.is_deleted == False
        )
    ).first()

    if not favorite:
        return schema.ApiResponse.success(data={"message": "未收藏"})

    # 2. 软删除收藏记录
    favorite.is_deleted = True
    db.commit()

    return schema.ApiResponse.success(data={"message": "取消收藏成功"})
