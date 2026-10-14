"""回填 assets.gps_latitude / gps_longitude

历史导入只把 GPS 写进了 asset_tags，冗余列为空，地图足迹看不到这些素材。
本脚本按「标签 → resolve_coordinates」补写冗余列；标签缺方向时回读原文件 EXIF。

用法（在 backend 目录下）：
    python scripts/backfill_gps_columns.py          # 只预览
    python scripts/backfill_gps_columns.py --apply  # 写库
"""
import argparse
import os
import sys
from decimal import Decimal

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import model  # noqa: E402
from app.config import settings  # noqa: E402
from app.db import SessionLocal  # noqa: E402
from app.services.ingestion.gps import resolve_coordinates  # noqa: E402
from app.services.metadata import MetadataExtractorFactory  # noqa: E402

GPS_TAG_KEYS = ('gps_latitude', 'gps_longitude', 'gps_latitude_ref', 'gps_longitude_ref')


def _load_gps_tags(db, asset_ids):
    rows = db.query(model.AssetTag.asset_id, model.AssetTag.tag_key, model.AssetTag.tag_value).filter(
        model.AssetTag.asset_id.in_(asset_ids),
        model.AssetTag.tag_key.in_(GPS_TAG_KEYS),
        model.AssetTag.is_deleted == False
    ).all()
    tags = {}
    for asset_id, key, value in rows:
        tags.setdefault(asset_id, {})[key] = value
    return tags


def _load_metadata(asset):
    """标签缺方向时才读原文件 EXIF（S/W 要靠它取负）"""
    full_path = os.path.join(settings.NAS_DATA_PATH, asset.original_path)
    if not os.path.exists(full_path):
        return None
    metadata, _ = MetadataExtractorFactory.extract(asset.asset_type, full_path)
    return metadata


def _resolve(asset, tags):
    metadata = None
    if not (tags.get('gps_latitude_ref') and tags.get('gps_longitude_ref')):
        metadata = _load_metadata(asset)
    return resolve_coordinates(tags, metadata)


def main(apply: bool) -> None:
    db = SessionLocal()
    try:
        assets = db.query(model.Asset).filter(
            model.Asset.is_deleted == False,
            model.Asset.gps_latitude.is_(None)
        ).all()
        tags_by_asset = _load_gps_tags(db, [a.id for a in assets]) if assets else {}

        planned = []
        for asset in assets:
            tags = tags_by_asset.get(asset.id)
            if not tags:
                continue
            coords = _resolve(asset, tags)
            if coords is None:
                print(f"跳过 asset {asset.id}: 无法解析 {tags}")
                continue
            planned.append((asset, coords))
            print(f"asset {asset.id}: {asset.original_path} -> lat={coords[0]:.6f}, lng={coords[1]:.6f}")

        print(f"\n共 {len(planned)} 条待回填（坐标列为空的素材 {len(assets)} 个）")
        if not apply:
            print("预览模式，未写库；确认后加 --apply 执行")
            return

        for asset, (latitude, longitude) in planned:
            asset.gps_latitude = Decimal(f"{latitude:.8f}")
            asset.gps_longitude = Decimal(f"{longitude:.8f}")
        db.commit()
        print(f"已写入 {len(planned)} 条")
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="回填 assets GPS 冗余列")
    parser.add_argument("--apply", action="store_true", help="实际写库（默认只预览）")
    main(parser.parse_args().apply)
