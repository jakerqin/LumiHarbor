"""缩略图 / 预览图按 asset_id 命名，同名原文件不再互相覆盖"""
from unittest.mock import MagicMock, patch

from app.model import Asset
from app.services.ingestion.processor import AssetProcessor

PROCESSOR = "app.services.ingestion.processor"


def _asset(asset_id: int, path: str, asset_type: str, mime: str) -> Asset:
    return Asset(id=asset_id, original_path=path, asset_type=asset_type, mime_type=mime)


@patch(f"{PROCESSOR}.ThumbnailGeneratorFactory.generate", return_value=True)
@patch(f"{PROCESSOR}.TaskDefinitionService.is_enabled", return_value=True)
def test_live_photo_pair_gets_distinct_thumbnails(_enabled, _generate):
    processor = AssetProcessor(MagicMock(), "/nas")
    heic = _asset(1, "2024/IMG_0001.HEIC", "image", "image/heic")
    mov = _asset(2, "2024/IMG_0001.MOV", "video", "video/mov")

    processor.generate_thumbnail(heic, heic.original_path)
    processor.generate_thumbnail(mov, mov.original_path)

    assert heic.thumbnail_path == "processed/thumbnails/1_thumbnail.webp"
    assert mov.thumbnail_path == "processed/thumbnails/2_thumbnail.webp"


@patch(f"{PROCESSOR}.PreviewGeneratorFactory.generate", return_value=True)
@patch(f"{PROCESSOR}.TaskDefinitionService.is_enabled", return_value=True)
def test_same_name_in_different_dirs_gets_distinct_previews(_enabled, _generate):
    processor = AssetProcessor(MagicMock(), "/nas")
    a = _asset(3, "2023/IMG_0001.HEIC", "image", "image/heic")
    b = _asset(4, "2024/IMG_0001.HEIC", "image", "image/heic")

    processor.generate_preview(a, a.original_path)
    processor.generate_preview(b, b.original_path)

    assert a.preview_path == "processed/previews/3_preview.webp"
    assert b.preview_path == "processed/previews/4_preview.webp"
