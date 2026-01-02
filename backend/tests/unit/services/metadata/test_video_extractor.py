"""VideoMetadataExtractor 单元测试

测试视频元数据提取器的各项功能
"""
import pytest
from datetime import datetime
from unittest.mock import patch, MagicMock
from app.services.metadata import VideoMetadataExtractor


class TestVideoMetadataExtractor:
    """VideoMetadataExtractor 测试类"""

    def setup_method(self):
        """每个测试方法前执行：创建提取器实例"""
        self.extractor = VideoMetadataExtractor()

    def test_extractor_initialization(self):
        """测试：提取器能够正常初始化"""
        assert self.extractor is not None
        assert isinstance(self.extractor, VideoMetadataExtractor)

    def test_parse_datetime_iso8601(self):
        """测试：解析 ISO 8601 格式时间"""
        # 测试标准格式
        result = self.extractor._parse_datetime(
            '2024-12-07T22:30:13.000000Z',
            'creation_time'
        )
        assert result == datetime(2024, 12, 7, 22, 30, 13)

        # 测试无微秒格式
        result = self.extractor._parse_datetime(
            '2024-12-07T22:30:13Z',
            'creation_time'
        )
        assert result == datetime(2024, 12, 7, 22, 30, 13)

    def test_parse_datetime_quicktime(self):
        """测试：解析 QuickTime 格式时间"""
        result = self.extractor._parse_datetime(
            '2024-12-08 11:30:12',
            'com.apple.quicktime.creationdate'
        )
        assert result == datetime(2024, 12, 8, 11, 30, 12)

    def test_parse_datetime_invalid(self):
        """测试：解析无效时间格式返回 None"""
        result = self.extractor._parse_datetime(
            'invalid-date-format',
            'creation_time'
        )
        assert result is None

    def test_parse_iso6709_with_altitude(self):
        """测试：解析带海拔的 ISO 6709 GPS 坐标"""
        result = self.extractor._parse_iso6709('-45.5730+168.5016+399.904/')

        assert result is not None
        assert result['latitude'] == -45.5730
        assert result['longitude'] == 168.5016
        assert result['altitude'] == 399.904

    def test_parse_iso6709_without_altitude(self):
        """测试：解析不带海拔的 ISO 6709 GPS 坐标"""
        result = self.extractor._parse_iso6709('+37.7749-122.4194/')

        assert result is not None
        assert result['latitude'] == 37.7749
        assert result['longitude'] == -122.4194
        assert 'altitude' not in result

    def test_parse_iso6709_invalid(self):
        """测试：解析无效 GPS 坐标返回 None"""
        result = self.extractor._parse_iso6709('invalid-gps-format')
        assert result is None

    def test_extract_device_info(self):
        """测试：提取设备信息"""
        tags = {
            'com.apple.quicktime.make': 'Apple',
            'com.apple.quicktime.model': 'iPhone 13 Pro',
            'com.apple.quicktime.software': '17.1.2'
        }

        result = self.extractor._extract_device_info(tags)

        assert result is not None
        assert result['make'] == 'Apple'
        assert result['model'] == 'iPhone 13 Pro'
        assert result['software'] == '17.1.2'

    def test_extract_device_info_empty(self):
        """测试：空标签返回 None"""
        result = self.extractor._extract_device_info({})
        assert result is None

    def test_extract_technical_metadata(self, mock_ffmpeg_probe_result):
        """测试：提取技术参数"""
        metadata = self.extractor._extract_technical_metadata(
            mock_ffmpeg_probe_result,
            mock_ffmpeg_probe_result['format']
        )

        assert metadata['width'] == 1920
        assert metadata['height'] == 1440
        assert metadata['codec'] == 'hevc'
        assert metadata['fps'] == 30.0
        assert metadata['duration'] == 0.70
        assert metadata['bitrate'] == 12192000

    def test_filter_tags(self):
        """测试：过滤原始标签"""
        tags = {
            'creation_time': '2024-12-07T22:30:13.000000Z',
            'make': 'Apple',
            'encoder': 'very long encoder string' * 100,  # 过长的值
            'compatible_brands': 'qt  ',  # 被排除的标签
        }

        result = self.extractor._filter_tags(tags)

        assert 'creation_time' in result
        assert 'make' in result
        assert 'encoder' not in result  # 过长被排除
        assert 'compatible_brands' not in result  # 在排除列表中

    @patch('ffmpeg.probe')
    def test_extract_with_mock_probe(self, mock_probe, mock_ffmpeg_probe_result):
        """测试：使用 mock 的 ffmpeg.probe 进行完整提取"""
        mock_probe.return_value = mock_ffmpeg_probe_result

        metadata, shot_at = self.extractor.extract('/fake/video.mov')

        # 验证 ffmpeg.probe 被调用
        mock_probe.assert_called_once_with('/fake/video.mov')

        # 验证提取的拍摄时间
        assert shot_at is not None
        assert shot_at == datetime(2024, 12, 7, 22, 30, 13)

        # 验证技术参数
        assert metadata['width'] == 1920
        assert metadata['height'] == 1440
        assert metadata['codec'] == 'hevc'
        assert metadata['fps'] == 30.0

        # 验证 GPS 信息
        assert metadata['latitude'] == -45.5730
        assert metadata['longitude'] == 168.5016
        assert metadata['altitude'] == 399.904

        # 验证设备信息
        assert metadata['make'] == 'Apple'
        assert metadata['model'] == 'iPhone 13 Pro'

    @patch('ffmpeg.probe')
    def test_extract_file_not_found(self, mock_probe):
        """测试：文件不存在的错误处理"""
        mock_probe.side_effect = FileNotFoundError()

        metadata, shot_at = self.extractor.extract('/nonexistent/video.mov')

        assert metadata == {}
        assert shot_at is None

    @patch('ffmpeg.probe')
    def test_extract_ffmpeg_error(self, mock_probe):
        """测试：ffmpeg 错误的处理"""
        import ffmpeg
        mock_error = ffmpeg.Error('cmd', 'stdout', 'stderr')
        mock_probe.side_effect = mock_error

        metadata, shot_at = self.extractor.extract('/corrupt/video.mov')

        assert metadata == {}
        assert shot_at is None

    def test_extract_datetime_priority(self):
        """测试：时间标签的优先级顺序"""
        # creation_time 优先级最高
        tags = {
            'creation_time': '2024-01-01T10:00:00Z',
            'com.apple.quicktime.creationdate': '2024-02-01 10:00:00',
            'date': '2024-03-01 10:00:00'
        }

        result = self.extractor._extract_datetime(tags, [])

        # 应该提取 creation_time
        assert result == datetime(2024, 1, 1, 10, 0, 0)

    def test_extract_location_from_streams(self):
        """测试：从视频流中提取 GPS 信息（容器级别没有时的降级）"""
        format_tags = {}  # 容器级别没有 location
        streams = [
            {
                'codec_type': 'video',
                'tags': {
                    'location': '+37.7749-122.4194/'
                }
            }
        ]

        result = self.extractor._extract_location(format_tags, streams)

        assert result is not None
        assert result['latitude'] == 37.7749
        assert result['longitude'] == -122.4194


class TestVideoMetadataExtractorEdgeCases:
    """VideoMetadataExtractor 边界情况测试"""

    def setup_method(self):
        """每个测试方法前执行"""
        self.extractor = VideoMetadataExtractor()

    def test_extract_with_no_video_stream(self):
        """测试：没有视频流的文件"""
        probe_result = {
            'format': {'tags': {}},
            'streams': [
                {
                    'codec_type': 'audio',  # 只有音频流
                    'codec_name': 'aac'
                }
            ]
        }

        metadata = self.extractor._extract_technical_metadata(
            probe_result,
            probe_result['format']
        )

        # 应该没有视频相关的元数据
        assert 'width' not in metadata
        assert 'height' not in metadata
        assert 'codec' not in metadata

    def test_parse_datetime_with_timezone(self):
        """测试：带时区信息的时间解析"""
        result = self.extractor._parse_datetime(
            '2024-12-08 11:30:12+1300',
            'com.apple.quicktime.creationdate'
        )

        # 应该移除时区信息后正确解析
        assert result is not None
        assert isinstance(result, datetime)

    def test_extract_with_missing_tags(self):
        """测试：缺少标签的情况"""
        probe_result = {
            'format': {},  # 没有 tags
            'streams': []
        }

        metadata, shot_at = self.extractor.extract.__wrapped__(
            self.extractor,
            '/fake/video.mov'
        )

        # 应该返回空结果但不报错
        # 注意：这个测试需要 mock，实际使用 patch
