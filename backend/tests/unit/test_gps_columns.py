"""GPS：标签解析与写回 assets.gps_* 冗余列"""
from decimal import Decimal
from unittest.mock import MagicMock, patch

import pytest

from app.model import Asset
from app.services.ingestion.gps import parse_coordinate, resolve_coordinates
from app.services.ingestion.processor import AssetProcessor

PROCESSOR = "app.services.ingestion.processor"


@pytest.mark.parametrize("text, ref, expected", [
    ("[24, 20, 3791/100]", None, 24 + 20 / 60 + 37.91 / 3600),
    ("[33, 52, 0]", "S", -(33 + 52 / 60)),
    ("31.22306", "N", 31.22306),
    ("121.44529", "W", -121.44529),
    ("39.9042° N", None, 39.9042),
    ("-33.8", "S", -33.8),  # 已带负号 + S 不再负负得正
])
def test_parse_coordinate(text, ref, expected):
    assert parse_coordinate(text, ref) == pytest.approx(expected)


@pytest.mark.parametrize("text", ["", None, "abc", "[1, 2]", "[1, 2, 3/0]"])
def test_parse_coordinate_invalid(text):
    assert parse_coordinate(text) is None


def test_resolve_falls_back_to_exif_ref():
    """模板过滤掉 *_ref 标签时，从原始 EXIF 读方向"""
    tags = {"gps_latitude": "[33, 52, 0]", "gps_longitude": "[151, 12, 0]"}
    metadata = {"GPS GPSLatitudeRef": "S", "GPS GPSLongitudeRef": "E"}
    lat, lng = resolve_coordinates(tags, metadata)
    assert lat < 0 < lng


def test_resolve_rejects_out_of_range():
    assert resolve_coordinates({"gps_latitude": "95", "gps_longitude": "10"}) is None


def _process(metadata, default_gps=None, mapped=None):
    """跑 process_asset，外部依赖全部打桩，返回 (asset, send_async_tasks mock)"""
    asset = Asset(id=7, original_path="a.jpg", asset_type="image", mime_type="image/jpeg")
    processor = AssetProcessor(MagicMock(), "/nas", default_gps)
    mappings = [] if mapped is None else mapped
    with patch(f"{PROCESSOR}.MetadataExtractorFactory.extract", return_value=(metadata, None)), \
            patch(f"{PROCESSOR}.TagMappingService.list_active", return_value=mappings), \
            patch(f"{PROCESSOR}.TagService.batch_save_asset_tags", return_value=0), \
            patch.object(processor, "generate_thumbnail"), \
            patch.object(processor, "generate_preview"), \
            patch.object(processor, "send_async_tasks") as send:
        processor.process_asset(asset, asset.original_path)
    return asset, send


def test_exif_gps_written_to_columns():
    metadata = {
        "GPS GPSLatitude": "[24, 20, 3791/100]",
        "GPS GPSLongitude": "[109, 24, 4291/100]",
        "GPS GPSLatitudeRef": "N",
        "GPS GPSLongitudeRef": "E",
    }
    asset, send = _process(metadata)
    assert asset.gps_latitude == Decimal("24.34386389")
    assert asset.gps_longitude == Decimal("109.41191944")
    assert send.call_args.args[2] == pytest.approx((24.34386389, 109.41191944))


def test_default_gps_written_even_without_metadata():
    """无元数据 + 上传时选了地点：标签和冗余列都要有"""
    asset, send = _process({}, default_gps=(121.44529, 31.22306))
    assert asset.gps_latitude == Decimal("31.22306000")
    assert asset.gps_longitude == Decimal("121.44529000")
    assert send.call_args.args[2] == pytest.approx((31.22306, 121.44529))


def test_no_gps_leaves_columns_empty():
    asset, send = _process({"Image Make": "Apple"})
    assert asset.gps_latitude is None
    assert send.call_args.args[2] is None
