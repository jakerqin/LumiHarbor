"""模板字段白名单（资产列 / 关联，禁止任意列名）"""

ASSET_FIELD_WHITELIST = {
    "asset_type": {"label": "类型", "input_type": 1},
    "file_size": {"label": "大小", "input_type": 1},
    "shot_at": {"label": "拍摄时间", "input_type": 3},
    "created_at": {"label": "创建时间", "input_type": 3},
}

RELATION_FIELD_WHITELIST = {
    "is_favorited": {"label": "收藏", "input_type": 4},
}

ALLOWED_TEMPLATE_KINDS = {"ingest", "detail", "filter", "card"}
ALLOWED_FIELD_SOURCES = {"tag", "asset", "relation"}
ALLOWED_TRANSFORMS = {"identity", "aspect_ratio", "gps_dms"}
ALLOWED_TASK_CODES = {"thumbnail", "preview", "phash", "geocoding", "batch_phash"}


def field_label(field_source: str, field_key: str, tag_name: str | None = None) -> str:
    if field_source == "tag":
        return tag_name or field_key
    if field_source == "asset":
        return ASSET_FIELD_WHITELIST.get(field_key, {}).get("label", field_key)
    return RELATION_FIELD_WHITELIST.get(field_key, {}).get("label", field_key)


def validate_field_key(field_source: str, field_key: str) -> None:
    if field_source == "tag":
        return
    whitelist = ASSET_FIELD_WHITELIST if field_source == "asset" else RELATION_FIELD_WHITELIST
    if field_key not in whitelist:
        raise ValueError(f"不允许的字段: {field_source}.{field_key}")
