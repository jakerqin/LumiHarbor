"""精选照片路由"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from typing import Optional
from ...db import get_db
from ...model.asset import Asset
from ...model.user_favorite import UserFavorite
from ...model.asset_tag import AssetTag
from ...model.asset_template_tag import AssetTemplateTag
from ...services.asset_url import AssetUrlProviderFactory
from ...schema.home.featured import FeaturedResponse, FeaturedAsset

router = APIRouter(prefix="/home", tags=["home"])

def _classify_aspect_ratio(value: Optional[str]) -> str:
    if not value:
        return 'square'

    normalized = str(value).strip().lower()
    if normalized in {'horizontal', 'vertical', 'square'}:
        return normalized

    try:
        ratio = float(normalized)
    except ValueError:
        return 'square'

    if ratio > 1.2:
        return 'horizontal'
    if ratio < 0.8:
        return 'vertical'
    return 'square'


@router.get("/featured", response_model=FeaturedResponse)
def get_featured_assets(
    user_id: int = Query(default=1, description="用户ID（v1.0 默认1）"),
    limit: int = Query(default=9, ge=1, le=20, description="返回数量"),
    db: Session = Depends(get_db)
):
    """获取用户的精选素材列表（多用户支持）

    查询逻辑（优化版）：
    1. JOIN user_favorites 和 assets 表
    2. 过滤条件：user_id 匹配 + 素材未删除 + 收藏未删除
    3. 按收藏时间降序排序
    4. 限制返回数量
    5. 批量查询所有素材的标签（避免 N+1 问题）
    6. 根据 home_featured 模板配置过滤标签

    Args:
        user_id: 用户ID（当前默认1，未来从 JWT 获取）
        limit: 返回数量（1-20）
        db: 数据库会话

    Returns:
        FeaturedResponse: 精选素材列表 + 总数 + 用户ID
    """

    # 1. 查询收藏列表
    query = (
        select(Asset, UserFavorite.favorited_at)
        .join(UserFavorite, Asset.id == UserFavorite.asset_id)
        .where(UserFavorite.user_id == user_id)
        .where(UserFavorite.is_deleted == False)
        .where(Asset.is_deleted == False)
        .order_by(UserFavorite.favorited_at.desc())
        .limit(limit)
    )
    result = db.execute(query)
    rows = result.all()

    if not rows:
        return FeaturedResponse(assets=[], total=0, user_id=user_id)

    # 2. 查询总数
    count_query = (
        select(func.count())
        .select_from(UserFavorite)
        .join(Asset, Asset.id == UserFavorite.asset_id)
        .where(UserFavorite.user_id == user_id)
        .where(UserFavorite.is_deleted == False)
        .where(Asset.is_deleted == False)
    )
    total = db.scalar(count_query)

    # 3. 获取 home_featured 模板需要的标签列表
    template_query = select(AssetTemplateTag.tag_key).where(
        AssetTemplateTag.template_type == 'home_featured'
    )
    required_tag_keys = [row[0] for row in db.execute(template_query).all()]

    # 4. 批量查询所有素材的标签（一次性查询，避免 N+1 问题）
    asset_ids = [asset.id for asset, _ in rows]
    tags_query = (
        select(AssetTag)
        .where(AssetTag.asset_id.in_(asset_ids))
        .where(AssetTag.tag_key.in_(required_tag_keys))
    )
    all_tags = db.execute(tags_query).scalars().all()

    # 5. 构建标签字典：{asset_id: {tag_key: tag_value}}
    tags_by_asset = {}
    for tag in all_tags:
        if tag.asset_id not in tags_by_asset:
            tags_by_asset[tag.asset_id] = {}
        tags_by_asset[tag.asset_id][tag.tag_key] = tag.tag_value

    # 6. 构建响应
    url_provider = AssetUrlProviderFactory.create()
    featured_assets = []
    for asset, favorited_at in rows:
        tags_dict = tags_by_asset.get(asset.id, {})

        # 兼容 aspect_ratio 标签为数值或枚举值的情况
        aspect_ratio = _classify_aspect_ratio(tags_dict.get('aspect_ratio'))

        original_url = url_provider.to_public_url(asset.original_path)
        thumbnail_url = (
            url_provider.maybe_to_public_url(asset.thumbnail_path)
            or original_url
        )

        featured_assets.append(FeaturedAsset(
            id=asset.id,
            type=asset.asset_type,
            thumbnail_url=thumbnail_url,
            original_url=original_url,
            file_name=asset.original_path.split('/')[-1] if asset.original_path else '',
            file_size=asset.file_size or 0,
            aspect_ratio=aspect_ratio,
            shot_at=asset.shot_at,
            created_at=asset.created_at,
            favorited_at=favorited_at,
            tags=tags_dict  # 所有标签放到 tags JSON 对象中
        ))

    return FeaturedResponse(
        assets=featured_assets,
        total=total or 0,
        user_id=user_id
    )
