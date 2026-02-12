"""地图相关路由"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, distinct
from typing import Optional
from datetime import datetime
from math import radians, sin, cos, sqrt, atan2
from ..db import get_db
from .. import model, schema
from ..schema.map import FootprintsResponse, FootprintDetail, MapStatistics
from ..services.asset import AssetService
from ..tools.utils import get_logger

logger = get_logger(__name__)

router = APIRouter(
    prefix="/map",
    tags=["Map"],
)


@router.get("/footprints", response_model=schema.ApiResponse[FootprintsResponse])
def get_footprints(
    user_id: int = Query(1, description="用户ID"),
    start_date: Optional[datetime] = Query(None, description="开始日期"),
    end_date: Optional[datetime] = Query(None, description="结束日期"),
    limit: int = Query(1000, le=5000, description="最大返回数量"),
    db: Session = Depends(get_db)
):
    """获取足迹点列表（按地理位置聚合）

    聚合策略：
    - 精度：0.01° (约 1km)
    - 按时间排序
    - 每个足迹点包含代表性照片
    """
    # 1. 构建基础查询（使用 GPS 冗余字段优化）
    query = db.query(
        # 聚合字段
        func.round(model.Asset.gps_latitude, 2).label('lat_group'),
        func.round(model.Asset.gps_longitude, 2).label('lng_group'),
        func.avg(model.Asset.gps_latitude).label('avg_lat'),
        func.avg(model.Asset.gps_longitude).label('avg_lng'),
        func.count(model.Asset.id).label('asset_count'),
        func.min(model.Asset.shot_at).label('first_shot_at'),
        func.max(model.Asset.shot_at).label('last_shot_at'),
        # 获取第一张照片作为封面
        func.min(model.Asset.id).label('cover_asset_id')
    ).filter(
        and_(
            model.Asset.is_deleted == False,
            model.Asset.created_by == user_id,
            model.Asset.gps_latitude.isnot(None),
            model.Asset.gps_longitude.isnot(None)
        )
    )

    # 2. 时间范围筛选
    if start_date:
        query = query.filter(model.Asset.shot_at >= start_date)
    if end_date:
        query = query.filter(model.Asset.shot_at <= end_date)

    # 3. 按地理位置聚合
    query = query.group_by('lat_group', 'lng_group')

    # 4. 按时间排序
    query = query.order_by('first_shot_at')

    # 5. 限制返回数量
    query = query.limit(limit)

    footprints_raw = query.all()

    # 6. 获取地点标签（批量查询优化）
    cover_asset_ids = [fp.cover_asset_id for fp in footprints_raw]
    location_tags = _get_location_tags_batch(db, cover_asset_ids)

    # 7. 组装响应数据
    footprints = []
    for fp in footprints_raw:
        location = location_tags.get(fp.cover_asset_id, {})
        footprints.append({
            'id': f"fp_{fp.lat_group}_{fp.lng_group}",
            'latitude': float(fp.avg_lat),
            'longitude': float(fp.avg_lng),
            'location_city': location.get('location_city'),
            'location_country': location.get('location_country'),
            'location_poi': location.get('location_poi'),
            'asset_count': fp.asset_count,
            'first_shot_at': fp.first_shot_at,
            'last_shot_at': fp.last_shot_at,
            'cover_asset_id': fp.cover_asset_id
        })

    return schema.ApiResponse.success(
        data=FootprintsResponse(
            footprints=footprints,
            total=len(footprints)
        )
    )


def _get_location_tags_batch(db: Session, asset_ids: list) -> dict:
    """批量获取地点标签（优化性能）"""
    if not asset_ids:
        return {}

    tags = db.query(
        model.AssetTag.asset_id,
        model.AssetTag.tag_key,
        model.AssetTag.tag_value
    ).filter(
        and_(
            model.AssetTag.asset_id.in_(asset_ids),
            model.AssetTag.tag_key.in_([
                'location_country', 'location_city', 'location_poi', 'location_formatted'
            ]),
            model.AssetTag.is_deleted == False
        )
    ).all()

    # 转换为字典结构
    result = {}
    for tag in tags:
        if tag.asset_id not in result:
            result[tag.asset_id] = {}
        result[tag.asset_id][tag.tag_key] = tag.tag_value

    return result


def _haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """计算两点间的 Haversine 距离（单位：公里）

    Args:
        lat1: 起点纬度
        lng1: 起点经度
        lat2: 终点纬度
        lng2: 终点经度

    Returns:
        距离（公里）
    """
    # 地球半径（公里）
    R = 6371.0

    # 转换为弧度
    lat1_rad = radians(lat1)
    lng1_rad = radians(lng1)
    lat2_rad = radians(lat2)
    lng2_rad = radians(lng2)

    # 计算差值
    dlat = lat2_rad - lat1_rad
    dlng = lng2_rad - lng1_rad

    # Haversine 公式
    a = sin(dlat / 2)**2 + cos(lat1_rad) * cos(lat2_rad) * sin(dlng / 2)**2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))

    return R * c


@router.get("/footprints/{footprint_id}", response_model=schema.ApiResponse[FootprintDetail])
def get_footprint_detail(
    footprint_id: str,
    user_id: int = Query(1, description="用户ID"),
    db: Session = Depends(get_db)
):
    """获取足迹点详情（包含所有照片）

    footprint_id 格式: fp_{lat_group}_{lng_group}
    例如: fp_31.23_121.47
    """
    # 1. 解析足迹点 ID
    try:
        _, lat_str, lng_str = footprint_id.split('_')
        lat_group = float(lat_str)
        lng_group = float(lng_str)
    except:
        raise HTTPException(status_code=400, detail="Invalid footprint_id")

    # 2. 查询该区域的所有素材
    assets = db.query(model.Asset).filter(
        and_(
            model.Asset.is_deleted == False,
            model.Asset.created_by == user_id,
            func.round(model.Asset.gps_latitude, 2) == lat_group,
            func.round(model.Asset.gps_longitude, 2) == lng_group
        )
    ).order_by(model.Asset.shot_at).all()

    if not assets:
        raise HTTPException(status_code=404, detail="Footprint not found")

    # 3. 获取地点信息（从第一个素材）
    first_asset = assets[0]
    location_tags = _get_location_tags_batch(db, [first_asset.id])
    location = location_tags.get(first_asset.id, {})

    # 4. 获取 URL 生成器
    url_provider = AssetService.get_url_provider()

    # 5. 组装响应
    return schema.ApiResponse.success(
        data=FootprintDetail(
            id=footprint_id,
            latitude=float(first_asset.gps_latitude),
            longitude=float(first_asset.gps_longitude),
            location_city=location.get('location_city'),
            location_country=location.get('location_country'),
            location_formatted=location.get('location_formatted'),
            assets=[
                {
                    'id': asset.id,
                    'thumbnail_url': url_provider.maybe_to_public_url(asset.thumbnail_path),
                    'shot_at': asset.shot_at,
                    'asset_type': asset.asset_type
                }
                for asset in assets
            ],
            asset_count=len(assets),
            first_shot_at=assets[0].shot_at,
            last_shot_at=assets[-1].shot_at
        )
    )


@router.get("/statistics", response_model=schema.ApiResponse[MapStatistics])
def get_map_statistics(
    user_id: int = Query(1, description="用户ID"),
    db: Session = Depends(get_db)
):
    """获取地图统计数据

    统计内容：
    - 访问国家数
    - 访问城市数
    - 总里程（相邻足迹点直线距离之和）
    - 首次/最后拍摄时间
    - 时间跨度（天数）
    """
    # 1. 获取所有足迹点（按时间排序）
    footprints = db.query(
        func.round(model.Asset.gps_latitude, 2).label('lat_group'),
        func.round(model.Asset.gps_longitude, 2).label('lng_group'),
        func.avg(model.Asset.gps_latitude).label('avg_lat'),
        func.avg(model.Asset.gps_longitude).label('avg_lng'),
        func.min(model.Asset.shot_at).label('first_shot_at'),
        func.min(model.Asset.id).label('cover_asset_id')
    ).filter(
        and_(
            model.Asset.is_deleted == False,
            model.Asset.created_by == user_id,
            model.Asset.gps_latitude.isnot(None),
            model.Asset.gps_longitude.isnot(None)
        )
    ).group_by('lat_group', 'lng_group').order_by('first_shot_at').all()

    if not footprints:
        # 无足迹数据，返回空统计
        return schema.ApiResponse.success(
            data=MapStatistics(
                country_count=0,
                city_count=0,
                total_distance_km=0.0,
                first_shot_at=None,
                last_shot_at=None,
                total_days=0
            )
        )

    # 2. 获取地点标签（批量查询）
    cover_asset_ids = [fp.cover_asset_id for fp in footprints]
    location_tags = _get_location_tags_batch(db, cover_asset_ids)

    # 3. 统计国家数和城市数
    countries = set()
    cities = set()
    for asset_id in cover_asset_ids:
        location = location_tags.get(asset_id, {})
        if location.get('location_country'):
            countries.add(location['location_country'])
        if location.get('location_city'):
            cities.add(location['location_city'])

    # 4. 计算总里程（相邻足迹点直线距离之和）
    total_distance = 0.0
    for i in range(len(footprints) - 1):
        curr = footprints[i]
        next_fp = footprints[i + 1]
        distance = _haversine_distance(
            float(curr.avg_lat), float(curr.avg_lng),
            float(next_fp.avg_lat), float(next_fp.avg_lng)
        )
        total_distance += distance

    # 5. 计算时间跨度
    first_shot_at = footprints[0].first_shot_at
    last_shot_at = footprints[-1].first_shot_at
    total_days = (last_shot_at - first_shot_at).days if first_shot_at and last_shot_at else 0

    # 6. 返回统计数据
    return schema.ApiResponse.success(
        data=MapStatistics(
            country_count=len(countries),
            city_count=len(cities),
            total_distance_km=round(total_distance, 1),
            first_shot_at=first_shot_at,
            last_shot_at=last_shot_at,
            total_days=total_days
        )
    )

