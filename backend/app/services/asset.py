"""素材业务逻辑层

提供素材相关的通用服务方法，包括：
- 素材数据转换（Model -> Dict/Schema）
- 批量标签查询
- 收藏状态查询
"""
from typing import Dict, List, Optional, Set
from pathlib import Path
from datetime import datetime
import shutil
from sqlalchemy.orm import Session
from sqlalchemy import and_

from .. import model
from .asset_url import AssetUrlProviderFactory, AssetUrlProvider
from .metadata_dictionary import MetadataDictionaryService
from ..config import settings
from ..tools.utils import get_logger


# 默认查询的标签键
DEFAULT_TAG_KEYS = ['aspect_ratio', 'location_city', 'location_poi']


class AssetService:
    """素材服务类

    提供素材数据处理的通用方法，供路由层复用。
    """

    _logger = get_logger(__name__)

    @staticmethod
    def build_asset_dict(
        asset: model.Asset,
        url_provider: AssetUrlProvider,
        is_favorited: bool = False,
        tags_map: Optional[Dict[str, str]] = None
    ) -> dict:
        """构建素材输出字典

        Args:
            asset: 素材模型对象
            url_provider: URL 生成器
            is_favorited: 是否已收藏
            tags_map: 标签映射 {tag_key: tag_value}

        Returns:
            可用于构建 AssetOut 的字典
        """
        tags = tags_map or {}
        return {
            'id': asset.id,
            'created_by': asset.created_by,
            'original_path': asset.original_path,
            'original_url': url_provider.maybe_to_public_url(asset.original_path),
            'thumbnail_path': asset.thumbnail_path,
            'thumbnail_url': url_provider.maybe_to_public_url(asset.thumbnail_path),
            'preview_url': url_provider.maybe_to_public_url(asset.preview_path),
            'asset_type': asset.asset_type,
            'mime_type': asset.mime_type,
            'file_size': asset.file_size,
            'shot_at': asset.shot_at,
            'created_at': asset.created_at,
            'updated_at': asset.updated_at,
            'is_deleted': asset.is_deleted,
            'visibility': asset.visibility,
            'is_favorited': is_favorited,
            'aspect_ratio': float(tags.get('aspect_ratio')) if tags.get('aspect_ratio') else None,
            'location_city': tags.get('location_city'),
            'location_poi': tags.get('location_poi'),
        }

    @staticmethod
    def batch_query_asset_tags(
        db: Session,
        asset_ids: List[int],
        tag_keys: Optional[List[str]] = None
    ) -> Dict[int, Dict[str, str]]:
        """批量查询素材标签

        Args:
            db: 数据库会话
            asset_ids: 素材ID列表
            tag_keys: 要查询的标签键列表（默认查询常用标签）

        Returns:
            标签映射 {asset_id: {tag_key: tag_value}}
        """
        if not asset_ids:
            return {}

        if tag_keys is None:
            tag_keys = DEFAULT_TAG_KEYS

        tags_query = db.query(model.AssetTag).filter(
            and_(
                model.AssetTag.asset_id.in_(asset_ids),
                model.AssetTag.tag_key.in_(tag_keys),
                model.AssetTag.is_deleted == False
            )
        ).all()

        tags_map: Dict[int, Dict[str, str]] = {}
        for tag in tags_query:
            if tag.asset_id not in tags_map:
                tags_map[tag.asset_id] = {}
            tags_map[tag.asset_id][tag.tag_key] = tag.tag_value

        return tags_map

    @staticmethod
    def batch_query_favorited_ids(
        db: Session,
        user_id: int,
        asset_ids: List[int]
    ) -> Set[int]:
        """批量查询用户收藏的素材ID

        Args:
            db: 数据库会话
            user_id: 用户ID
            asset_ids: 素材ID列表

        Returns:
            已收藏的素材ID集合
        """
        if not asset_ids:
            return set()

        favorited_rows = db.query(model.UserFavorite.asset_id).filter(
            and_(
                model.UserFavorite.user_id == user_id,
                model.UserFavorite.asset_id.in_(asset_ids),
                model.UserFavorite.is_deleted == False
            )
        ).all()

        return {row[0] for row in favorited_rows}

    @staticmethod
    def batch_delete_assets(
        db: Session,
        asset_ids: List[int]
    ) -> Dict[str, object]:
        """批量软删除素材及关联数据"""
        if not asset_ids:
            return {"deleted": 0, "missing_ids": []}

        unique_ids = list(dict.fromkeys(asset_ids))
        assets = db.query(model.Asset).filter(
            and_(
                model.Asset.id.in_(unique_ids),
                model.Asset.is_deleted == False
            )
        ).all()

        found_ids = {asset.id for asset in assets}
        location_values = []
        if found_ids:
            location_rows = db.query(model.AssetTag.tag_value).filter(
                and_(
                    model.AssetTag.asset_id.in_(found_ids),
                    model.AssetTag.tag_key == 'location_poi',
                    model.AssetTag.is_deleted == False
                )
            ).distinct().all()
            location_values = [row[0] for row in location_rows]

        AssetService._move_assets_to_trash(db, assets, found_ids)

        for asset in assets:
            asset.is_deleted = True

        if found_ids:
            db.query(model.AlbumAsset).filter(
                and_(
                    model.AlbumAsset.asset_id.in_(found_ids),
                    model.AlbumAsset.is_deleted == False
                )
            ).update({model.AlbumAsset.is_deleted: True}, synchronize_session=False)

            db.query(model.AssetTag).filter(
                and_(
                    model.AssetTag.asset_id.in_(found_ids),
                    model.AssetTag.is_deleted == False
                )
            ).update({model.AssetTag.is_deleted: True}, synchronize_session=False)

            db.query(model.UserFavorite).filter(
                and_(
                    model.UserFavorite.asset_id.in_(found_ids),
                    model.UserFavorite.is_deleted == False
                )
            ).update({model.UserFavorite.is_deleted: True}, synchronize_session=False)

        db.commit()

        if location_values:
            MetadataDictionaryService.remove_location_poi_if_unused(db, location_values)

        missing_ids = [asset_id for asset_id in unique_ids if asset_id not in found_ids]
        return {"deleted": len(found_ids), "missing_ids": missing_ids}

    @staticmethod
    def _move_assets_to_trash(db: Session, assets: List[model.Asset], found_ids: Set[int]) -> None:
        trash_root = AssetService._get_trash_root()
        if not trash_root:
            return

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        for asset in assets:
            asset_root = trash_root / timestamp / f"asset_{asset.id}"
            for label, path in (
                ("original", asset.original_path),
                ("thumbnail", asset.thumbnail_path),
                ("preview", getattr(asset, 'preview_path', None)),
            ):
                full_path, rel_path = AssetService._resolve_asset_path(trash_root.parent, path)
                if not full_path or not rel_path:
                    continue
                if not full_path.exists():
                    continue
                if label == "original" and AssetService._is_path_in_use(
                    db,
                    asset.original_path,
                    found_ids
                ):
                    AssetService._logger.warning(
                        "原始文件仍被其他素材引用，跳过移动: %s",
                        asset.original_path
                    )
                    continue

                target_path = asset_root / rel_path
                try:
                    target_path.parent.mkdir(parents=True, exist_ok=True)
                    shutil.move(str(full_path), str(target_path))
                except Exception as exc:
                    AssetService._logger.warning(
                        "移动素材文件失败 (%s): %s -> %s (%s)",
                        label,
                        full_path,
                        target_path,
                        exc
                    )

    @staticmethod
    def _get_trash_root() -> Optional[Path]:
        if not settings.NAS_DATA_PATH:
            AssetService._logger.warning("NAS_DATA_PATH 未配置，跳过物理删除")
            return None
        nas_root = Path(settings.NAS_DATA_PATH).expanduser().resolve()
        if not nas_root.exists() or not nas_root.is_dir():
            AssetService._logger.warning("NAS_DATA_PATH 不存在或不是目录: %s", nas_root)
            return None
        return nas_root / "recycle_bin"

    @staticmethod
    def _resolve_asset_path(
        nas_root: Path,
        relative_path: Optional[str]
    ) -> tuple[Optional[Path], Optional[Path]]:
        if not relative_path:
            return None, None
        path = Path(relative_path)

        if path.is_absolute():
            try:
                rel = path.resolve().relative_to(nas_root)
            except ValueError:
                AssetService._logger.warning(
                    "素材路径不在 NAS 根目录内，跳过物理删除: %s",
                    relative_path
                )
                return None, None
            return path.resolve(), rel

        if ".." in path.parts:
            AssetService._logger.warning("素材路径包含非法片段，跳过物理删除: %s", relative_path)
            return None, None

        return (nas_root / path).resolve(), path

    @staticmethod
    def _is_path_in_use(db: Session, original_path: Optional[str], deleting_ids: Set[int]) -> bool:
        if not original_path:
            return False
        query = db.query(model.Asset.id).filter(
            model.Asset.original_path == original_path,
            model.Asset.is_deleted == False
        )
        if deleting_ids:
            query = query.filter(model.Asset.id.notin_(deleting_ids))
        return query.first() is not None

    @staticmethod
    def get_url_provider() -> AssetUrlProvider:
        """获取 URL 生成器实例（便捷方法）"""
        return AssetUrlProviderFactory.create()
