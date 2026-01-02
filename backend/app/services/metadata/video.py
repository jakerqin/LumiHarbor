"""视频元数据提取器

使用 ffmpeg 从视频文件中提取元数据，包括拍摄时间、GPS 位置、设备信息等。
"""
import ffmpeg
from datetime import datetime
from typing import Dict, Tuple, Optional
from .extractor import MetadataExtractor
from ...tools.utils import get_logger

logger = get_logger(__name__)


class VideoMetadataExtractor(MetadataExtractor):
    """视频元数据提取器

    使用 ffmpeg.probe() 提取视频元数据，支持：
    - 拍摄时间（优先从 creation_time 获取）
    - GPS 位置信息（纬度、经度、海拔）
    - 设备信息（相机型号、制造商）
    - 技术参数（时长、分辨率、编码、帧率等）

    支持的格式：
    - MOV (iPhone/Android 拍摄)
    - MP4
    - AVI
    - MKV
    - 其他 ffmpeg 支持的视频格式
    """

    # 拍摄时间标签优先级（容器级别）
    DATETIME_TAGS = [
        'creation_time',                          # 标准创建时间
        'com.apple.quicktime.creationdate',       # Apple QuickTime 创建时间
        'date',                                   # 通用日期字段
    ]

    def extract(self, file_path: str) -> Tuple[Dict, Optional[datetime]]:
        """提取视频的元数据

        Args:
            file_path: 视频文件完整路径

        Returns:
            Tuple[元数据字典, 拍摄时间]
            - 元数据字典: 包含技术参数、GPS、设备信息等
            - 拍摄时间: 视频拍摄时间，如果无法提取则返回 None
        """
        metadata = {}
        shot_at = None

        try:
            # 使用 ffmpeg.probe 获取完整元数据
            probe = ffmpeg.probe(file_path)

            # 1. 提取容器级别的元数据
            format_info = probe.get('format', {})
            format_tags = format_info.get('tags', {})

            # 2. 提取技术参数
            metadata.update(self._extract_technical_metadata(probe, format_info))

            # 3. 提取拍摄时间
            shot_at = self._extract_datetime(format_tags, probe.get('streams', []))

            # 4. 提取 GPS 位置信息
            location = self._extract_location(format_tags, probe.get('streams', []))
            if location:
                metadata.update(location)

            # 5. 提取设备信息
            device_info = self._extract_device_info(format_tags)
            if device_info:
                metadata.update(device_info)

            # 6. 保留原始标签（过滤敏感信息）
            metadata['raw_tags'] = self._filter_tags(format_tags)

            logger.debug(f"成功提取视频元数据: {file_path}, 字段数: {len(metadata)}")

        except ffmpeg.Error as e:
            stderr = e.stderr.decode('utf-8') if e.stderr else '未知错误'
            logger.error(f"ffmpeg 解析视频失败 {file_path}: {stderr}")
        except FileNotFoundError:
            logger.error(f"视频文件不存在: {file_path}")
        except Exception as e:
            logger.error(f"提取视频元数据失败 {file_path}: {type(e).__name__} - {e}")

        return metadata, shot_at

    def _extract_technical_metadata(self, probe: Dict, format_info: Dict) -> Dict:
        """提取技术参数

        Args:
            probe: ffmpeg.probe 返回的完整信息
            format_info: format 字段

        Returns:
            包含技术参数的字典
        """
        metadata = {}

        # 查找视频流
        video_stream = next(
            (stream for stream in probe.get('streams', []) if stream['codec_type'] == 'video'),
            None
        )

        if video_stream:
            # 分辨率
            metadata['width'] = video_stream.get('width')
            metadata['height'] = video_stream.get('height')

            # 编码格式
            metadata['codec'] = video_stream.get('codec_name')
            metadata['codec_long_name'] = video_stream.get('codec_long_name')

            # 帧率
            fps_str = video_stream.get('r_frame_rate', '0/1')
            try:
                num, den = map(int, fps_str.split('/'))
                metadata['fps'] = round(num / den, 2) if den != 0 else 0.0
            except (ValueError, ZeroDivisionError):
                metadata['fps'] = 0.0

            # 旋转角度
            rotation = video_stream.get('tags', {}).get('rotate')
            if rotation:
                metadata['rotation'] = int(rotation)

            # 色彩空间
            metadata['color_space'] = video_stream.get('color_space')
            metadata['color_range'] = video_stream.get('color_range')

        # 时长
        duration = format_info.get('duration')
        if duration:
            metadata['duration'] = float(duration)

        # 比特率
        bitrate = format_info.get('bit_rate')
        if bitrate:
            metadata['bitrate'] = int(bitrate)

        # 文件大小
        size = format_info.get('size')
        if size:
            metadata['file_size'] = int(size)

        return metadata

    def _extract_datetime(self, format_tags: Dict, streams: list) -> Optional[datetime]:
        """从元数据标签中提取拍摄时间

        Args:
            format_tags: 容器级别的 tags
            streams: 视频流列表

        Returns:
            拍摄时间，如果无法解析则返回 None
        """
        # 优先从容器级别提取
        for tag_name in self.DATETIME_TAGS:
            if tag_name in format_tags:
                dt = self._parse_datetime(format_tags[tag_name], tag_name)
                if dt:
                    return dt

        # 尝试从视频流的 tags 中提取
        for stream in streams:
            if stream.get('codec_type') == 'video':
                stream_tags = stream.get('tags', {})
                for tag_name in self.DATETIME_TAGS:
                    if tag_name in stream_tags:
                        dt = self._parse_datetime(stream_tags[tag_name], tag_name)
                        if dt:
                            return dt

        logger.debug("未找到有效的拍摄时间标签")
        return None

    def _parse_datetime(self, datetime_str: str, tag_name: str) -> Optional[datetime]:
        """解析时间字符串

        支持的格式：
        - ISO 8601: 2024-01-15T10:30:45.000000Z
        - QuickTime: 2024-01-15 10:30:45+0800

        Args:
            datetime_str: 时间字符串
            tag_name: 标签名称（用于日志）

        Returns:
            datetime 对象，解析失败返回 None
        """
        # 常见时间格式
        formats = [
            '%Y-%m-%dT%H:%M:%S.%fZ',      # ISO 8601 with microseconds
            '%Y-%m-%dT%H:%M:%SZ',          # ISO 8601
            '%Y-%m-%dT%H:%M:%S',           # ISO 8601 without timezone
            '%Y-%m-%d %H:%M:%S%z',         # QuickTime format with timezone
            '%Y-%m-%d %H:%M:%S',           # QuickTime format
            '%Y:%m:%d %H:%M:%S',           # Alternative format
        ]

        for fmt in formats:
            try:
                # 移除时区信息中的冒号（Python < 3.7 兼容性）
                cleaned_str = datetime_str.replace('+00:00', '+0000')
                dt = datetime.strptime(cleaned_str, fmt)
                # 如果有时区信息，转换为无时区的本地时间
                if dt.tzinfo:
                    dt = dt.replace(tzinfo=None)
                logger.debug(f"成功解析时间标签 {tag_name}: {datetime_str} -> {dt}")
                return dt
            except ValueError:
                continue

        logger.warning(f"无法解析时间标签 {tag_name}: {datetime_str}")
        return None

    def _extract_location(self, format_tags: Dict, streams: list) -> Optional[Dict]:
        """提取 GPS 位置信息

        Args:
            format_tags: 容器级别的 tags
            streams: 视频流列表

        Returns:
            包含 GPS 信息的字典，如果没有则返回 None
            格式: {'latitude': 37.7749, 'longitude': -122.4194, 'altitude': 100.0}
        """
        # 优先从容器级别提取
        location_str = format_tags.get('location') or format_tags.get('com.apple.quicktime.location.ISO6709')

        # 尝试从视频流提取
        if not location_str:
            for stream in streams:
                if stream.get('codec_type') == 'video':
                    stream_tags = stream.get('tags', {})
                    location_str = stream_tags.get('location') or stream_tags.get('com.apple.quicktime.location.ISO6709')
                    if location_str:
                        break

        if not location_str:
            return None

        # 解析 ISO 6709 格式: +37.7749-122.4194/ 或 +37.7749-122.4194+100.5/
        return self._parse_iso6709(location_str)

    def _parse_iso6709(self, location_str: str) -> Optional[Dict]:
        """解析 ISO 6709 格式的 GPS 坐标

        格式示例:
        - +37.7749-122.4194/          (纬度+经度)
        - +37.7749-122.4194+100.5/    (纬度+经度+海拔)

        Args:
            location_str: ISO 6709 格式的位置字符串

        Returns:
            GPS 字典或 None
        """
        try:
            # 移除末尾的 /
            location_str = location_str.rstrip('/')

            # 正则解析（简化版本，支持常见格式）
            import re
            # 匹配: (+/-)数字.数字(+/-)数字.数字(可选: +/-)数字.数字
            pattern = r'([+-]\d+\.?\d*)([+-]\d+\.?\d*)([+-]\d+\.?\d*)?'
            match = re.match(pattern, location_str)

            if not match:
                logger.warning(f"无法解析 GPS 坐标格式: {location_str}")
                return None

            latitude = float(match.group(1))
            longitude = float(match.group(2))
            altitude = float(match.group(3)) if match.group(3) else None

            gps_data = {
                'latitude': latitude,
                'longitude': longitude,
            }

            if altitude is not None:
                gps_data['altitude'] = altitude

            logger.debug(f"成功解析 GPS 坐标: {location_str} -> {gps_data}")
            return gps_data

        except (ValueError, AttributeError) as e:
            logger.warning(f"解析 GPS 坐标失败 {location_str}: {e}")
            return None

    def _extract_device_info(self, format_tags: Dict) -> Optional[Dict]:
        """提取设备信息

        Args:
            format_tags: 容器级别的 tags

        Returns:
            包含设备信息的字典，如果没有则返回 None
        """
        device_info = {}

        # 制造商（Apple, Samsung 等）
        make = (
            format_tags.get('make') or
            format_tags.get('com.apple.quicktime.make') or
            format_tags.get('manufacturer')
        )
        if make:
            device_info['make'] = make

        # 设备型号（iPhone 15 Pro, Galaxy S23 等）
        model = (
            format_tags.get('model') or
            format_tags.get('com.apple.quicktime.model') or
            format_tags.get('device')
        )
        if model:
            device_info['model'] = model

        # 软件版本
        software = format_tags.get('com.apple.quicktime.software') or format_tags.get('software')
        if software:
            device_info['software'] = software

        return device_info if device_info else None

    def _filter_tags(self, tags: Dict) -> Dict:
        """过滤和清理原始标签

        移除敏感或无用的标签

        Args:
            tags: 原始标签字典

        Returns:
            过滤后的标签字典
        """
        # 排除的标签（敏感信息或无用数据）
        excluded = {
            'encoder',           # 编码器信息（通常很长）
            'compatible_brands', # 兼容品牌列表
            'major_brand',       # 主要品牌
            'minor_version',     # 次要版本
        }

        return {
            key: value
            for key, value in tags.items()
            if key not in excluded and len(str(value)) < 500  # 排除过长的值
        }
