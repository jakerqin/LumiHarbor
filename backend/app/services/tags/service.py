"""标签业务逻辑层"""
from sqlalchemy.orm import Session
from typing import Dict, Optional
from ... import model
from ...tools.utils import get_logger
from ..metadata_dictionary import MetadataDictionaryService
from ..templates.service import TemplateService

logger = get_logger(__name__)


class TagService:
    """标签服务类（基于模板系统）

    负责处理标签的查询、保存、批量操作等业务逻辑
    """

    @staticmethod
    def get_template_tag_keys(
        db: Session,
        template_type: str
    ) -> set:
        """获取模板定义的标签键名集合

        Args:
            db: 数据库会话
            template_type: 模板类型（image/video/audio）

        Returns:
            标签键名集合 set{'device_make', 'gps_latitude', ...}
        """
        ingest = TemplateService.resolve_template(db, 'ingest', template_type)
        if ingest:
            fields = TemplateService.list_fields(db, ingest.id)
            return {f.field_key for f in fields if f.field_source == 'tag'}

        template_tags = db.query(
            model.AssetTemplateTag.tag_key
        ).filter(
            model.AssetTemplateTag.template_type == template_type,
            model.AssetTemplateTag.is_deleted == False
        ).all()
        return {tag.tag_key for tag in template_tags}

    @staticmethod
    def _editable_tag_keys(db: Session, asset_type: str) -> set:
        detail = TemplateService.resolve_template(db, 'detail', asset_type)
        if not detail:
            return set()
        fields = TemplateService.list_fields(db, detail.id)
        return {f.field_key for f in fields if f.field_source == 'tag'}

    @staticmethod
    def upsert_user_tags(
        db: Session,
        asset_id: int,
        asset_type: str,
        tag_data: Dict[str, Optional[str]],
    ) -> Dict[str, Optional[str]]:
        """覆盖写入用户语义标签（系统标签拒绝）。"""
        if not tag_data:
            return {}
        allowed = TagService._editable_tag_keys(db, asset_type)
        defs = db.query(model.TagDefinition).filter(
            model.TagDefinition.tag_key.in_(list(tag_data.keys())),
            model.TagDefinition.is_deleted == False,
        ).all()
        def_map = {row.tag_key: row for row in defs}
        TagService._write_user_tag_rows(db, asset_id, tag_data, allowed, def_map)
        db.commit()
        return tag_data

    @staticmethod
    def _write_user_tag_rows(db, asset_id, tag_data, allowed, def_map) -> None:
        from fastapi import HTTPException
        for tag_key, tag_value in tag_data.items():
            definition = def_map.get(tag_key)
            if not definition or definition.source != 'user':
                raise HTTPException(status_code=400, detail=f"标签不可编辑: {tag_key}")
            if allowed and tag_key not in allowed:
                raise HTTPException(status_code=400, detail=f"标签未挂到详情模板: {tag_key}")
            TagService._upsert_one(db, asset_id, tag_key, tag_value)

    @staticmethod
    def _upsert_one(db: Session, asset_id: int, tag_key: str, tag_value: Optional[str]) -> None:
        row = db.query(model.AssetTag).filter(
            model.AssetTag.asset_id == asset_id,
            model.AssetTag.tag_key == tag_key,
        ).first()
        if tag_value is None or str(tag_value).strip() == '':
            if row:
                row.is_deleted = True
            return
        if row:
            row.tag_value = tag_value
            row.is_deleted = False
            return
        db.add(model.AssetTag(asset_id=asset_id, tag_key=tag_key, tag_value=tag_value))

    @staticmethod
    def batch_save_asset_tags(
        db: Session,
        asset_id: int,
        asset_type: str,
        tag_data: Dict[str, str]
    ) -> int:
        """批量保存素材标签（基于模板过滤）

        Args:
            db: 数据库会话
            asset_id: 素材ID
            asset_type: 素材类型（image/video/audio）
            tag_data: 标签数据字典 {tag_key: tag_value}

        Returns:
            实际保存的标签数量
        """
        if not tag_data:
            logger.debug(f"Asset {asset_id} 没有可保存的标签")
            return 0

        # 1. 获取该资源类型模板定义的 tag_keys
        template_tag_keys = TagService.get_template_tag_keys(db, asset_type)

        if not template_tag_keys:
            logger.warning(f"未找到 template_type={asset_type} 的模板配置,跳过保存")
            return 0

        # 2. 过滤出模板中定义的标签
        valid_tags = {
            tag_key: tag_value
            for tag_key, tag_value in tag_data.items()
            if tag_key in template_tag_keys
        }
        location_poi_value = valid_tags.get('location_poi')

        if not valid_tags:
            logger.debug(f"Asset {asset_id} 的标签均未在模板中定义")
            return 0

        # 3. 查询已存在的标签（去重）
        existing_tags = db.query(model.AssetTag.tag_key).filter(
            model.AssetTag.asset_id == asset_id,
            model.AssetTag.is_deleted == False
        ).all()
        existing_tag_keys = {tag.tag_key for tag in existing_tags}

        # 4. 批量插入新标签
        new_asset_tags = [
            model.AssetTag(
                asset_id=asset_id,
                tag_key=tag_key,
                tag_value=tag_value
            )
            for tag_key, tag_value in valid_tags.items()
            if tag_key not in existing_tag_keys
        ]

        if new_asset_tags:
            db.bulk_save_objects(new_asset_tags)
            db.commit()
            logger.info(f"Asset {asset_id} 成功保存 {len(new_asset_tags)} 个标签")
            if location_poi_value:
                MetadataDictionaryService.upsert_location_poi(db, location_poi_value)
            return len(new_asset_tags)
        else:
            logger.debug(f"Asset {asset_id} 的标签已全部存在,跳过保存")
            if location_poi_value:
                MetadataDictionaryService.upsert_location_poi(db, location_poi_value)
            return 0
