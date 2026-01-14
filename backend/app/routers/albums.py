"""相册相关路由"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from typing import List, Optional
from ..db import get_db
from .. import model, schema
from ..services.album import AlbumService
from ..services.asset_url import AssetUrlProviderFactory

router = APIRouter(
    prefix="/albums",
    tags=["Albums"],
)


@router.post("", response_model=schema.ApiResponse[schema.AlbumOut])
def create_album(
    album_data: schema.AlbumCreate,
    db: Session = Depends(get_db),
    current_user_id: int = 1  # TODO: 从认证中间件获取
):
    """创建相册

    Args:
        album_data: 相册创建数据
        db: 数据库会话
        current_user_id: 当前用户ID

    Returns:
        创建的相册信息
    """
    album = AlbumService.create_album(db, album_data, current_user_id)
    return schema.ApiResponse.success(data=album)


@router.get("", response_model=schema.ApiResponse[schema.AlbumsPageResponse])
def list_albums(
    skip: int = Query(0, ge=0, description="跳过的记录数"),
    limit: int = Query(100, ge=1, le=1000, description="返回的最大记录数"),
    sort_by: schema.AlbumSortBy = Query(
        schema.AlbumSortBy.CREATED_AT,
        description="排序字段"
    ),
    order: str = Query("desc", pattern="^(asc|desc)$", description="排序顺序"),
    visibility: Optional[str] = Query(None, description="可见性筛选"),
    search: Optional[str] = Query(None, description="按名称模糊搜索"),
    created_by: Optional[int] = Query(None, description="按创建者筛选"),
    db: Session = Depends(get_db)
):
    """获取相册列表（支持排序、筛选、搜索）

    Args:
        skip: 跳过的记录数（分页）
        limit: 返回的最大记录数
        sort_by: 排序字段
        order: 排序顺序（asc, desc）
        visibility: 可见性筛选（general, private）
        search: 按名称模糊搜索
        created_by: 按创建者筛选
        db: 数据库会话

    Returns:
        相册列表
    """
    albums, total = AlbumService.list_albums(
        db,
        skip=skip,
        limit=limit,
        sort_by=sort_by.value,
        order=order,
        visibility=visibility,
        search=search,
        created_by=created_by
    )

    album_ids = [album.id for album in albums]

    asset_count_map = {}
    if album_ids:
        counts = db.query(
            model.AlbumAsset.album_id,
            func.count(model.AlbumAsset.id).label("asset_count"),
        ).filter(
            and_(
                model.AlbumAsset.album_id.in_(album_ids),
                model.AlbumAsset.is_deleted == False,
            )
        ).group_by(model.AlbumAsset.album_id).all()
        asset_count_map = {row.album_id: row.asset_count for row in counts}

    cover_asset_ids = [
        album.cover_asset_id for album in albums if album.cover_asset_id is not None
    ]
    cover_asset_map = {}
    if cover_asset_ids:
        cover_assets = db.query(model.Asset).filter(
            and_(
                model.Asset.id.in_(cover_asset_ids),
                model.Asset.is_deleted == False,
            )
        ).all()
        cover_asset_map = {asset.id: asset for asset in cover_assets}

    url_provider = AssetUrlProviderFactory.create()
    albums_out: List[schema.AlbumDetailOut] = []
    for album in albums:
        album_dict = schema.AlbumOut.model_validate(album).model_dump()
        album_dict["asset_count"] = asset_count_map.get(album.id, 0)

        cover_thumbnail_url = None
        cover_preview_url = None
        cover_original_url = None
        if album.cover_asset_id:
            cover_asset = cover_asset_map.get(album.cover_asset_id)
            if cover_asset:
                cover_thumbnail_url = url_provider.maybe_to_public_url(cover_asset.thumbnail_path)
                cover_preview_url = url_provider.maybe_to_public_url(cover_asset.preview_path)
                cover_original_url = url_provider.maybe_to_public_url(cover_asset.original_path)

        album_dict["cover_thumbnail_url"] = cover_thumbnail_url
        album_dict["cover_preview_url"] = cover_preview_url
        album_dict["cover_original_url"] = cover_original_url
        albums_out.append(schema.AlbumDetailOut(**album_dict))

    has_more = skip + limit < total
    return schema.ApiResponse.success(data=schema.AlbumsPageResponse(
        albums=albums_out,
        total=total,
        skip=skip,
        limit=limit,
        has_more=has_more,
    ))


@router.get("/{album_id}", response_model=schema.ApiResponse[schema.AlbumDetailOut])
def get_album(
    album_id: int,
    db: Session = Depends(get_db)
):
    """获取相册详情

    Args:
        album_id: 相册ID
        db: 数据库会话

    Returns:
        相册详情
    """
    album = AlbumService.get_album_by_id(db, album_id)
    if not album:
        raise HTTPException(status_code=404, detail="相册不存在")

    # 构造返回数据
    album_dict = schema.AlbumOut.model_validate(album).model_dump()
    album_dict['asset_count'] = AlbumService.get_album_asset_count(db, album.id)

    # 获取封面图片 URL（缩略图、预览图和原图）
    cover_thumbnail_url = None
    cover_preview_url = None
    cover_original_url = None
    if album.cover_asset_id:
        cover_asset = db.query(model.Asset).filter(
            model.Asset.id == album.cover_asset_id,
            model.Asset.is_deleted == False
        ).first()
        if cover_asset:
            url_provider = AssetUrlProviderFactory.create()
            cover_thumbnail_url = url_provider.maybe_to_public_url(cover_asset.thumbnail_path)
            cover_preview_url = url_provider.maybe_to_public_url(cover_asset.preview_path)
            cover_original_url = url_provider.maybe_to_public_url(cover_asset.original_path)

    album_dict['cover_thumbnail_url'] = cover_thumbnail_url
    album_dict['cover_preview_url'] = cover_preview_url
    album_dict['cover_original_url'] = cover_original_url

    return schema.ApiResponse.success(data=schema.AlbumDetailOut(**album_dict))


@router.put("/{album_id}", response_model=schema.ApiResponse[schema.AlbumOut])
def update_album(
    album_id: int,
    album_data: schema.AlbumUpdate,
    db: Session = Depends(get_db)
):
    """更新相册信息

    Args:
        album_id: 相册ID
        album_data: 更新数据
        db: 数据库会话

    Returns:
        更新后的相册信息
    """
    album = AlbumService.update_album(db, album_id, album_data)
    if not album:
        raise HTTPException(status_code=404, detail="相册不存在")

    return schema.ApiResponse.success(data=album)


@router.delete("/{album_id}", response_model=schema.ApiResponse[dict])
def delete_album(
    album_id: int,
    db: Session = Depends(get_db)
):
    """删除相册（软删除）

    Args:
        album_id: 相册ID
        db: 数据库会话

    Returns:
        删除结果
    """
    success = AlbumService.delete_album(db, album_id)
    if not success:
        raise HTTPException(status_code=404, detail="相册不存在")

    return schema.ApiResponse.success(data={"deleted": True})


@router.get("/{album_id}/assets", response_model=schema.ApiResponse[List[schema.AssetOut]])
def get_album_assets(
    album_id: int,
    user_id: int = Query(1, description="当前用户ID"),
    skip: int = Query(0, ge=0, description="跳过的记录数"),
    limit: int = Query(100, ge=1, le=1000, description="返回的最大记录数"),
    db: Session = Depends(get_db)
):
    """获取相册内的素材列表

    Args:
        album_id: 相册ID
        skip: 跳过的记录数
        limit: 返回的最大记录数
        db: 数据库会话

    Returns:
        素材列表（按 sort_order 排序）
    """
    # 检查相册是否存在
    album = AlbumService.get_album_by_id(db, album_id)
    if not album:
        raise HTTPException(status_code=404, detail="相册不存在")

    assets = AlbumService.get_album_assets(db, album_id, skip, limit)

    asset_ids = [asset.id for asset in assets]

    favorited_asset_ids = set()
    if asset_ids:
        favorites = db.query(model.UserFavorite.asset_id).filter(
            and_(
                model.UserFavorite.asset_id.in_(asset_ids),
                model.UserFavorite.user_id == user_id,
                model.UserFavorite.is_deleted == False,
            )
        ).all()
        favorited_asset_ids = {row.asset_id for row in favorites}

    tags_map = {}
    if asset_ids:
        tags_query = db.query(model.AssetTag).filter(
            and_(
                model.AssetTag.asset_id.in_(asset_ids),
                model.AssetTag.tag_key.in_(['aspect_ratio', 'location_city', 'location_poi']),
                model.AssetTag.is_deleted == False
            )
        ).all()

        for tag in tags_query:
            if tag.asset_id not in tags_map:
                tags_map[tag.asset_id] = {}
            tags_map[tag.asset_id][tag.tag_key] = tag.tag_value

    url_provider = AssetUrlProviderFactory.create()
    assets_out: List[schema.AssetOut] = []
    for asset in assets:
        asset_dict = {
            'id': asset.id,
            'created_by': asset.created_by,
            'original_path': asset.original_path,
            'original_url': url_provider.maybe_to_public_url(asset.original_path),
            'thumbnail_path': asset.thumbnail_path,
            'thumbnail_url': url_provider.maybe_to_public_url(asset.thumbnail_path),
            'asset_type': asset.asset_type,
            'mime_type': asset.mime_type,
            'file_size': asset.file_size,
            'shot_at': asset.shot_at,
            'created_at': asset.created_at,
            'updated_at': asset.updated_at,
            'is_deleted': asset.is_deleted,
            'visibility': asset.visibility,
            'is_favorited': asset.id in favorited_asset_ids,
        }

        asset_tags = tags_map.get(asset.id, {})
        asset_dict['aspect_ratio'] = float(asset_tags.get('aspect_ratio')) if asset_tags.get('aspect_ratio') else None
        asset_dict['location_city'] = asset_tags.get('location_city')
        asset_dict['location_poi'] = asset_tags.get('location_poi')

        assets_out.append(schema.AssetOut(**asset_dict))

    return schema.ApiResponse.success(data=assets_out)


@router.post("/{album_id}/assets", response_model=schema.ApiResponse[schema.AlbumAssetOut])
def add_asset_to_album(
    album_id: int,
    request: schema.AddAssetRequest,
    db: Session = Depends(get_db)
):
    """添加单个素材到相册

    Args:
        album_id: 相册ID
        request: 添加素材请求
        db: 数据库会话

    Returns:
        关联记录
    """
    album_asset = AlbumService.add_asset_to_album(db, album_id, request.asset_id)
    if not album_asset:
        raise HTTPException(status_code=400, detail="添加失败，相册或素材不存在")

    return schema.ApiResponse.success(data=album_asset)


@router.post("/{album_id}/assets/batch", response_model=schema.ApiResponse[dict])
def add_assets_to_album_batch(
    album_id: int,
    request: schema.AddAssetsRequest,
    db: Session = Depends(get_db)
):
    """批量添加素材到相册

    Args:
        album_id: 相册ID
        request: 批量添加素材请求
        db: 数据库会话

    Returns:
        添加结果（成功数量、失败列表）
    """
    success_count, failed_ids = AlbumService.add_assets_to_album_batch(
        db, album_id, request.asset_ids
    )

    return schema.ApiResponse.success(data={
        "success_count": success_count,
        "failed_ids": failed_ids,
        "total": len(request.asset_ids)
    })


@router.delete("/{album_id}/assets/{asset_id}", response_model=schema.ApiResponse[dict])
def remove_asset_from_album(
    album_id: int,
    asset_id: int,
    db: Session = Depends(get_db)
):
    """从相册移除素材

    Args:
        album_id: 相册ID
        asset_id: 素材ID
        db: 数据库会话

    Returns:
        移除结果
    """
    success = AlbumService.remove_asset_from_album(db, album_id, asset_id)
    if not success:
        raise HTTPException(status_code=404, detail="素材不在该相册中")

    return schema.ApiResponse.success(data={"removed": True})


@router.put("/{album_id}/assets/{asset_id}/sort", response_model=schema.ApiResponse[dict])
def update_asset_sort(
    album_id: int,
    asset_id: int,
    request: schema.UpdateAssetSortRequest,
    db: Session = Depends(get_db)
):
    """更新素材在相册内的排序

    Args:
        album_id: 相册ID
        asset_id: 素材ID
        request: 更新排序请求
        db: 数据库会话

    Returns:
        更新结果
    """
    success = AlbumService.update_asset_sort(
        db, album_id, asset_id, request.sort_order
    )
    if not success:
        raise HTTPException(status_code=404, detail="素材不在该相册中")

    return schema.ApiResponse.success(data={"updated": True})


@router.put("/{album_id}/cover", response_model=schema.ApiResponse[schema.AlbumOut])
def set_album_cover(
    album_id: int,
    request: schema.SetCoverRequest,
    db: Session = Depends(get_db)
):
    """设置相册封面

    Args:
        album_id: 相册ID
        request: 设置封面请求
        db: 数据库会话

    Returns:
        更新后的相册信息
    """
    album = AlbumService.set_album_cover(db, album_id, request.cover_asset_id)
    if not album:
        raise HTTPException(status_code=400, detail="设置失败，素材不在该相册中")

    return schema.ApiResponse.success(data=album)
