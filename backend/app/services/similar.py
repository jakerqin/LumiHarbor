"""相似推荐：视觉距离 + 同日 / 同地 / 同相册加权。"""
from dataclasses import dataclass
from datetime import date
from typing import Dict, List, Optional, Set

from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session

from .. import model
from .asset import AssetService
from ..tools.perceptual_hash import compute_visual_distance, visual_percent

# 加在视觉百分比上，只影响排序，不改展示用的 similarity
BONUS_SAME_DAY = 12
BONUS_SAME_POI = 12
BONUS_SAME_CITY = 8
BONUS_NEAR_GPS = 8
BONUS_SAME_ALBUM = 12
# 约 2km（纬度 1°≈111km）
GPS_NEAR_DEG = 0.02
POOL_RECENT = 800
POOL_CONTEXT = 300


@dataclass(frozen=True)
class ContextMatch:
    same_day: bool = False
    same_poi: bool = False
    same_city: bool = False
    near_gps: bool = False
    same_album: bool = False


@dataclass(frozen=True)
class SourceContext:
    album_ids: Set[int]
    city: Optional[str]
    poi: Optional[str]
    shot_date: Optional[date]


class AssetSimilarService:
    """详情页相似推荐编排。"""

    @staticmethod
    def find(db: Session, asset: model.Asset, threshold: float, limit: int) -> List[dict]:
        if not asset.phash:
            return []
        ctx = _load_source_context(db, asset)
        candidates = _load_candidates(db, asset, ctx)
        if not candidates:
            return []
        ids = [item.id for item in candidates]
        tags = AssetService.batch_query_asset_tags(db, ids, ['location_city', 'location_poi'])
        albums = _albums_by_asset(db, ids)
        ranked = _rank_candidates(asset, ctx, candidates, tags, albums, threshold)
        ranked.sort(key=lambda item: (-item['rank_score'], item['distance']))
        return ranked[:limit]


def context_bonus(match: ContextMatch) -> float:
    """同日 / 地标 / 城市或近距 GPS / 同相册的排序加分。"""
    bonus = BONUS_SAME_DAY if match.same_day else 0
    if match.same_poi:
        bonus += BONUS_SAME_POI
    elif match.same_city:
        bonus += BONUS_SAME_CITY
    elif match.near_gps:
        bonus += BONUS_NEAR_GPS
    if match.same_album:
        bonus += BONUS_SAME_ALBUM
    return bonus


def _load_source_context(db: Session, asset: model.Asset) -> SourceContext:
    tags = AssetService.batch_query_asset_tags(
        db, [asset.id], ['location_city', 'location_poi']
    ).get(asset.id, {})
    shot_date = asset.shot_at.date() if asset.shot_at else None
    return SourceContext(
        album_ids=_albums_by_asset(db, [asset.id]).get(asset.id, set()),
        city=_clean(tags.get('location_city')),
        poi=_clean(tags.get('location_poi')),
        shot_date=shot_date,
    )


def _load_candidates(db: Session, asset: model.Asset, ctx: SourceContext) -> List[model.Asset]:
    ids: Set[int] = set()
    ids.update(_recent_ids(db, asset))
    ids.update(_same_day_ids(db, asset, ctx.shot_date))
    ids.update(_same_album_ids(db, asset.id, ctx.album_ids))
    ids.update(_same_location_ids(db, asset.id, ctx.city, ctx.poi))
    ids.discard(asset.id)
    if not ids:
        return []
    return db.query(model.Asset).filter(
        model.Asset.id.in_(ids),
        model.Asset.phash.isnot(None),
        model.Asset.is_deleted == False,
        model.Asset.asset_type == asset.asset_type,
    ).all()


def _rank_candidates(
    asset: model.Asset,
    ctx: SourceContext,
    candidates: List[model.Asset],
    tags: Dict[int, Dict[str, str]],
    albums: Dict[int, Set[int]],
    threshold: float,
) -> List[dict]:
    source_hashes = _hashes_of(asset)
    ranked: List[dict] = []
    for other in candidates:
        distance = compute_visual_distance(source_hashes, _hashes_of(other))
        if distance > threshold:
            continue
        match = _match_flags(
            asset, ctx, other, tags.get(other.id, {}), albums.get(other.id, set())
        )
        visual = visual_percent(distance)
        ranked.append({
            'asset': other,
            'distance': distance,
            'similarity': round(visual, 1),
            'rank_score': visual + context_bonus(match),
        })
    return ranked


def _match_flags(
    asset: model.Asset,
    ctx: SourceContext,
    other: model.Asset,
    other_tags: Dict[str, str],
    other_albums: Set[int],
) -> ContextMatch:
    other_date = other.shot_at.date() if other.shot_at else None
    return ContextMatch(
        same_day=bool(ctx.shot_date and other_date == ctx.shot_date),
        same_poi=_same_text(ctx.poi, other_tags.get('location_poi')),
        same_city=_same_text(ctx.city, other_tags.get('location_city')),
        near_gps=_near_gps(asset, other),
        same_album=bool(ctx.album_ids and other_albums & ctx.album_ids),
    )


def _phash_q(db: Session, asset: model.Asset):
    return db.query(model.Asset.id).filter(
        model.Asset.phash.isnot(None),
        model.Asset.is_deleted == False,
        model.Asset.asset_type == asset.asset_type,
        model.Asset.id != asset.id,
    )


def _recent_ids(db: Session, asset: model.Asset) -> List[int]:
    return [row[0] for row in _phash_q(db, asset).order_by(model.Asset.id.desc()).limit(POOL_RECENT).all()]


def _same_day_ids(db: Session, asset: model.Asset, shot_date: Optional[date]) -> List[int]:
    if not shot_date:
        return []
    rows = _phash_q(db, asset).filter(func.date(model.Asset.shot_at) == shot_date).limit(POOL_CONTEXT).all()
    return [row[0] for row in rows]


def _same_album_ids(db: Session, asset_id: int, album_ids: Set[int]) -> List[int]:
    if not album_ids:
        return []
    rows = db.query(model.AlbumAsset.asset_id).filter(
        model.AlbumAsset.album_id.in_(album_ids),
        model.AlbumAsset.asset_id != asset_id,
        model.AlbumAsset.is_deleted == False,
    ).limit(POOL_CONTEXT).all()
    return [row[0] for row in rows]


def _same_location_ids(
    db: Session,
    asset_id: int,
    city: Optional[str],
    poi: Optional[str],
) -> List[int]:
    clauses = []
    if poi:
        clauses.append(and_(model.AssetTag.tag_key == 'location_poi', model.AssetTag.tag_value == poi))
    if city:
        clauses.append(and_(model.AssetTag.tag_key == 'location_city', model.AssetTag.tag_value == city))
    if not clauses:
        return []
    rows = db.query(model.AssetTag.asset_id).filter(
        model.AssetTag.asset_id != asset_id,
        model.AssetTag.is_deleted == False,
        or_(*clauses),
    ).limit(POOL_CONTEXT).all()
    return [row[0] for row in rows]


def _albums_by_asset(db: Session, asset_ids: List[int]) -> Dict[int, Set[int]]:
    mapping: Dict[int, Set[int]] = {}
    if not asset_ids:
        return mapping
    rows = db.query(model.AlbumAsset.asset_id, model.AlbumAsset.album_id).filter(
        model.AlbumAsset.asset_id.in_(asset_ids),
        model.AlbumAsset.is_deleted == False,
    ).all()
    for asset_id, album_id in rows:
        mapping.setdefault(asset_id, set()).add(album_id)
    return mapping


def _hashes_of(asset: model.Asset) -> Dict[str, str]:
    return {
        'phash': asset.phash or '',
        'dhash': asset.dhash or '',
        'average_hash': asset.average_hash or '',
        'colorhash': asset.colorhash or '',
    }


def _near_gps(left: model.Asset, right: model.Asset) -> bool:
    coords = (left.gps_latitude, left.gps_longitude, right.gps_latitude, right.gps_longitude)
    if any(value is None for value in coords):
        return False
    dlat = float(left.gps_latitude) - float(right.gps_latitude)
    dlng = float(left.gps_longitude) - float(right.gps_longitude)
    return (dlat * dlat + dlng * dlng) <= GPS_NEAR_DEG * GPS_NEAR_DEG


def _same_text(left: Optional[str], right: Optional[str]) -> bool:
    cleaned = _clean(left)
    return bool(cleaned and cleaned == _clean(right))


def _clean(value: Optional[str]) -> Optional[str]:
    text = (value or '').strip()
    return text or None
