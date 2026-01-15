"""素材业务逻辑层

提供素材相关的通用服务方法，包括：
- 素材数据转换（Model -> Dict/Schema）
- 批量标签查询
- 收藏状态查询
"""
from typing import Dict, List, Optional, Set
from sqlalchemy.orm import Session
from sqlalchemy import and_

from .. import model
from .asset_url import AssetUrlProviderFactory, AssetUrlProvider


# 默认查询的标签键
DEFAULT_TAG_KEYS = ['aspect_ratio', 'location_city', 'location_poi']


class AssetService:
    """素材服务类

    提供素材数据处理的通用方法，供路由层复用。
    """

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
    def get_url_provider() -> AssetUrlProvider:
        """获取 URL 生成器实例（便捷方法）"""
        return AssetUrlProviderFactory.create()
