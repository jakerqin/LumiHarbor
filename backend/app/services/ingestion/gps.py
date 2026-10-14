"""GPS 坐标解析

把标签/EXIF 里的坐标字符串解析成带符号的十进制经纬度，供：
- 写 assets.gps_latitude / gps_longitude 冗余列（地图只读这两列）
- 投递地理编码任务
- 历史数据回填脚本
"""
from typing import Dict, Optional, Tuple

# 标签里没有方向时，回退读取 exifread 原始键
_EXIF_REF_KEYS = {
    'gps_latitude_ref': 'GPS GPSLatitudeRef',
    'gps_longitude_ref': 'GPS GPSLongitudeRef',
}


def parse_coordinate(coord_str: Optional[str], ref: Optional[str] = None) -> Optional[float]:
    """解析单个坐标

    支持：
    - exifread 度分秒："[32, 6, 1167/100]"
    - 十进制："31.22306"、"39.9042° N"（字符串自带方向时优先于 ref）

    Args:
        coord_str: 坐标字符串
        ref: 方向 N/S/E/W，S/W 取负

    Returns:
        十进制坐标；无法解析返回 None
    """
    if not coord_str:
        return None
    try:
        text = str(coord_str).strip()
        if text.startswith('[') and text.endswith(']'):
            value = _parse_dms(text)
        else:
            parts = text.replace('°', ' ').split()
            value = float(parts[0])
            if len(parts) > 1:
                ref = parts[1]
    except (ValueError, IndexError, ZeroDivisionError):
        return None

    if value is None:
        return None
    if ref and ref.strip().upper() in ('S', 'W'):
        return -abs(value)
    return value


def resolve_coordinates(tags: Dict[str, str], metadata: Optional[Dict] = None) -> Optional[Tuple[float, float]]:
    """从映射后的标签解析 (纬度, 经度)

    Args:
        tags: 映射后的标签（gps_latitude / gps_longitude / *_ref）
        metadata: 原始元数据（可选），标签缺方向时回退读取 EXIF Ref

    Returns:
        (latitude, longitude)；缺失、无法解析或越界返回 None
    """
    latitude = parse_coordinate(tags.get('gps_latitude'), _ref(tags, metadata, 'gps_latitude_ref'))
    longitude = parse_coordinate(tags.get('gps_longitude'), _ref(tags, metadata, 'gps_longitude_ref'))
    if latitude is None or longitude is None:
        return None
    if not (-90 <= latitude <= 90 and -180 <= longitude <= 180):
        return None
    return latitude, longitude


def _ref(tags: Dict[str, str], metadata: Optional[Dict], tag_key: str) -> Optional[str]:
    if tags.get(tag_key):
        return tags[tag_key]
    if metadata:
        return metadata.get(_EXIF_REF_KEYS[tag_key])
    return None


def _parse_dms(text: str) -> Optional[float]:
    parts = [p.strip() for p in text.strip('[]').split(',')]
    if len(parts) != 3:
        return None
    deg, minute, sec = (_to_float(p) for p in parts)
    return deg + minute / 60.0 + sec / 3600.0


def _to_float(text: str) -> float:
    if '/' in text:
        numerator, denominator = text.split('/')
        return float(numerator) / float(denominator)
    return float(text)
