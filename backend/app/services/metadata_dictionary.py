"""元数据字典服务"""
from typing import Iterable, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_
from redis import Redis
from redis.exceptions import RedisError
from ..config import settings
from ..tools.utils import get_logger
from .. import model

logger = get_logger(__name__)


class MetadataDictionaryService:
    """元数据字典服务（含 Redis 缓存）"""

    SCENE_LOCATION_POI = "location_poi"
    CACHE_PREFIX = "metadata_dictionary:"

    @staticmethod
    def _get_cache_key(scene_type: str) -> str:
        return f"{MetadataDictionaryService.CACHE_PREFIX}{scene_type}"

    @staticmethod
    def _get_redis_client() -> Optional[Redis]:
        try:
            return Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                db=settings.REDIS_DB,
                password=settings.REDIS_PASSWORD or None,
                decode_responses=True,
            )
        except Exception as exc:
            logger.warning(f"Redis 初始化失败: {exc}")
            return None

    @staticmethod
    def _normalize_values(values: Iterable[str]) -> List[str]:
        normalized = []
        seen = set()
        for value in values:
            if not value:
                continue
            cleaned = str(value).strip()
            if not cleaned or cleaned in seen:
                continue
            seen.add(cleaned)
            normalized.append(cleaned)
        return normalized

    @classmethod
    def get_location_poi_values(cls, db: Session) -> List[str]:
        return cls.get_scene_values(db, cls.SCENE_LOCATION_POI)

    @classmethod
    def get_scene_values(cls, db: Session, scene_type: str) -> List[str]:
        cache_key = cls._get_cache_key(scene_type)
        redis_client = cls._get_redis_client()

        if redis_client:
            try:
                cached = redis_client.smembers(cache_key)
                if cached:
                    return sorted(cached)
            except RedisError as exc:
                logger.warning(f"Redis 读取失败: {exc}")

        rows = db.query(model.MetadataDictionary.value).filter(
            and_(
                model.MetadataDictionary.scene_type == scene_type,
                model.MetadataDictionary.is_deleted == False
            )
        ).order_by(model.MetadataDictionary.value.asc()).all()

        values = [row[0] for row in rows]
        if values:
            cls._refresh_cache(scene_type, values, redis_client)
            return values

        if scene_type == cls.SCENE_LOCATION_POI:
            return cls._backfill_location_poi(db)

        return values

    @classmethod
    def upsert_location_poi(cls, db: Session, location_poi: Optional[str]) -> None:
        if not location_poi:
            return
        cls.upsert_scene_values(db, cls.SCENE_LOCATION_POI, [location_poi])

    @classmethod
    def upsert_scene_values(cls, db: Session, scene_type: str, values: Iterable[str]) -> None:
        normalized = cls._normalize_values(values)
        if not normalized:
            return

        existing_rows = db.query(model.MetadataDictionary).filter(
            and_(
                model.MetadataDictionary.scene_type == scene_type,
                model.MetadataDictionary.value.in_(normalized)
            )
        ).all()
        existing_map = {row.value: row for row in existing_rows}

        changed = False
        for value in normalized:
            row = existing_map.get(value)
            if row:
                if row.is_deleted:
                    row.is_deleted = False
                    changed = True
                continue
            db.add(model.MetadataDictionary(scene_type=scene_type, value=value, is_deleted=False))
            changed = True

        if changed:
            db.commit()

        cls._add_to_cache(scene_type, normalized)

    @classmethod
    def remove_location_poi_if_unused(cls, db: Session, values: Iterable[str]) -> None:
        cls.remove_scene_values_if_unused(db, cls.SCENE_LOCATION_POI, values)

    @classmethod
    def remove_scene_values_if_unused(cls, db: Session, scene_type: str, values: Iterable[str]) -> None:
        normalized = cls._normalize_values(values)
        if not normalized:
            return

        if scene_type == cls.SCENE_LOCATION_POI:
            remaining_rows = db.query(model.AssetTag.tag_value).join(
                model.Asset,
                model.Asset.id == model.AssetTag.asset_id
            ).filter(
                and_(
                    model.AssetTag.tag_key == 'location_poi',
                    model.AssetTag.tag_value.in_(normalized),
                    model.AssetTag.is_deleted == False,
                    model.Asset.is_deleted == False
                )
            ).distinct().all()
            remaining = {row[0] for row in remaining_rows}
        else:
            remaining = set()

        unused = [value for value in normalized if value not in remaining]
        if not unused:
            return

        db.query(model.MetadataDictionary).filter(
            and_(
                model.MetadataDictionary.scene_type == scene_type,
                model.MetadataDictionary.value.in_(unused),
                model.MetadataDictionary.is_deleted == False
            )
        ).update({model.MetadataDictionary.is_deleted: True}, synchronize_session=False)
        db.commit()

        cls._remove_from_cache(scene_type, unused)

    @classmethod
    def _backfill_location_poi(cls, db: Session) -> List[str]:
        rows = db.query(model.AssetTag.tag_value).join(
            model.Asset,
            model.Asset.id == model.AssetTag.asset_id
        ).filter(
            and_(
                model.AssetTag.tag_key == 'location_poi',
                model.AssetTag.tag_value.isnot(None),
                model.AssetTag.tag_value != '',
                model.AssetTag.is_deleted == False,
                model.Asset.is_deleted == False
            )
        ).distinct().order_by(model.AssetTag.tag_value.asc()).all()

        values = [row[0] for row in rows]
        if values:
            cls.upsert_scene_values(db, cls.SCENE_LOCATION_POI, values)
        return values

    @classmethod
    def _refresh_cache(
        cls,
        scene_type: str,
        values: List[str],
        redis_client: Optional[Redis] = None
    ) -> None:
        client = redis_client or cls._get_redis_client()
        if not client:
            return
        cache_key = cls._get_cache_key(scene_type)
        try:
            client.delete(cache_key)
            if values:
                client.sadd(cache_key, *values)
        except RedisError as exc:
            logger.warning(f"Redis 写入失败: {exc}")

    @classmethod
    def _add_to_cache(cls, scene_type: str, values: List[str]) -> None:
        client = cls._get_redis_client()
        if not client or not values:
            return
        cache_key = cls._get_cache_key(scene_type)
        try:
            client.sadd(cache_key, *values)
        except RedisError as exc:
            logger.warning(f"Redis 写入失败: {exc}")

    @classmethod
    def _remove_from_cache(cls, scene_type: str, values: List[str]) -> None:
        client = cls._get_redis_client()
        if not client or not values:
            return
        cache_key = cls._get_cache_key(scene_type)
        try:
            client.srem(cache_key, *values)
        except RedisError as exc:
            logger.warning(f"Redis 删除失败: {exc}")
