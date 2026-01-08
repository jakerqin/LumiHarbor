"""元数据标签映射器"""
from typing import Dict


class MetadataTagMapper:
    """元数据标签映射器（统一映射规则）

    将原始 EXIF/FFmpeg 标签名映射为统一的 tag_key 格式
    """

    # 统一的 EXIF/FFmpeg 标签映射表
    METADATA_TO_TAG_KEY = {
        # 设备信息（通用）
        'Image Make': 'device_make',
        'make': 'device_make',
        'com.apple.quicktime.make': 'device_make',

        'Image Model': 'device_model',
        'model': 'device_model',
        'com.apple.quicktime.model': 'device_model',

        'EXIF LensModel': 'lens_model',

        # 拍摄参数（图片）
        'EXIF ExposureTime': 'exposure_time',
        'EXIF FNumber': 'aperture',
        'EXIF ISOSpeedRatings': 'iso',
        'EXIF FocalLength': 'focal_length',
        'EXIF WhiteBalance': 'white_balance',
        'EXIF Flash': 'flash',

        # GPS（通用）
        'GPS GPSLatitude': 'gps_latitude',
        'GPS GPSLongitude': 'gps_longitude',
        'GPS GPSLatitudeRef': 'gps_latitude_ref',
        'GPS GPSLongitudeRef': 'gps_longitude_ref',
        'GPS GPSAltitude': 'gps_altitude',

        # 媒体属性（通用）
        'EXIF ExifImageWidth': 'width',
        'width': 'width',
        'EXIF ExifImageLength': 'height',
        'height': 'height',
        'duration': 'duration',
    }

    @classmethod
    def map_metadata_to_tags(cls, metadata: Dict[str, str]) -> Dict[str, str]:
        """将元数据映射为统一的标签字典

        Args:
            metadata: 原始元数据字典（来自 EXIF 或 FFmpeg）

        Returns:
            映射后的标签字典 {tag_key: tag_value}
        """
        tags = {}
        for meta_key, tag_key in cls.METADATA_TO_TAG_KEY.items():
            if meta_key in metadata:
                tags[tag_key] = metadata[meta_key]
        return tags
