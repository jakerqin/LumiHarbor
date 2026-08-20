"""元数据标签映射器（规则来自 tag_mappings）"""
from typing import Dict, List, Sequence

from ... import model


class MetadataTagMapper:
    """将原始 EXIF/FFmpeg 键映射为统一 tag_key。"""

    FALLBACK_MAP = {
        'Image Make': 'device_make',
        'make': 'device_make',
        'com.apple.quicktime.make': 'device_make',
        'Image Model': 'device_model',
        'model': 'device_model',
        'com.apple.quicktime.model': 'device_model',
        'EXIF LensModel': 'lens_model',
        'EXIF ExposureTime': 'exposure_time',
        'EXIF FNumber': 'aperture',
        'EXIF ISOSpeedRatings': 'iso',
        'EXIF FocalLength': 'focal_length',
        'EXIF WhiteBalance': 'white_balance',
        'EXIF Flash': 'flash',
        'GPS GPSLatitude': 'gps_latitude',
        'GPS GPSLongitude': 'gps_longitude',
        'GPS GPSLatitudeRef': 'gps_latitude_ref',
        'GPS GPSLongitudeRef': 'gps_longitude_ref',
        'GPS GPSAltitude': 'gps_altitude',
        'EXIF ExifImageWidth': 'width',
        'width': 'width',
        'EXIF ExifImageLength': 'height',
        'height': 'height',
        'duration': 'duration',
    }

    @classmethod
    def map_metadata_to_tags(
        cls,
        metadata: Dict[str, str],
        mappings: Sequence[model.TagMapping] | None = None,
    ) -> Dict[str, str]:
        if mappings:
            tags = cls._apply_mappings(metadata, mappings)
        else:
            tags = cls._apply_fallback(metadata)
        cls._apply_aspect_ratio(tags, mappings or [])
        return tags

    @classmethod
    def _apply_mappings(
        cls,
        metadata: Dict[str, str],
        mappings: Sequence[model.TagMapping],
    ) -> Dict[str, str]:
        tags: Dict[str, str] = {}
        for mapping in mappings:
            if mapping.transform == 'aspect_ratio':
                continue
            if mapping.source_key not in metadata:
                continue
            if mapping.tag_key in tags:
                continue
            tags[mapping.tag_key] = metadata[mapping.source_key]
        return tags

    @classmethod
    def _apply_fallback(cls, metadata: Dict[str, str]) -> Dict[str, str]:
        tags = {}
        for meta_key, tag_key in cls.FALLBACK_MAP.items():
            if meta_key in metadata:
                tags[tag_key] = metadata[meta_key]
        return tags

    @classmethod
    def _apply_aspect_ratio(
        cls,
        tags: Dict[str, str],
        mappings: Sequence[model.TagMapping],
    ) -> None:
        need_ratio = any(m.transform == 'aspect_ratio' for m in mappings) or not mappings
        if not need_ratio or 'width' not in tags or 'height' not in tags:
            return
        try:
            width = float(tags['width']) if tags['width'] else 0
            height = float(tags['height']) if tags['height'] else 0
            if width > 0 and height > 0:
                ratio = width / height
                tags['aspect_ratio'] = f"{ratio:.2f}".rstrip('0').rstrip('.')
        except (ValueError, TypeError):
            return
