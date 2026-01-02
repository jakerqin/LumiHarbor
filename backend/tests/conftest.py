"""Pytest 配置文件

定义测试的全局 fixtures 和配置
"""
import pytest
import sys
from pathlib import Path

# 添加项目根目录到 sys.path
backend_path = Path(__file__).parent
sys.path.insert(0, str(backend_path))


@pytest.fixture
def sample_video_path():
    """提供示例视频文件路径的 fixture

    用于测试时，可以被替换为真实的测试视频文件路径
    """
    return "/path/to/test/video.mov"


@pytest.fixture
def mock_video_metadata():
    """提供模拟的视频元数据字典

    用于测试时避免依赖真实视频文件
    """
    return {
        'width': 1920,
        'height': 1080,
        'fps': 30.0,
        'duration': 45.5,
        'codec': 'hevc',
        'bitrate': 12500000,
        'latitude': 37.7749,
        'longitude': -122.4194,
        'altitude': 15.0,
        'make': 'Apple',
        'model': 'iPhone 13 Pro',
        'software': '17.1.2'
    }


@pytest.fixture
def mock_ffmpeg_probe_result():
    """提供模拟的 ffmpeg.probe() 返回结果

    用于测试 VideoMetadataExtractor 的解析逻辑
    """
    return {
        'format': {
            'duration': '0.70',
            'bit_rate': '12192000',
            'size': '1065984',
            'tags': {
                'creation_time': '2024-12-07T22:30:13.000000Z',
                'com.apple.quicktime.location.ISO6709': '-45.5730+168.5016+399.904/',
                'com.apple.quicktime.make': 'Apple',
                'com.apple.quicktime.model': 'iPhone 13 Pro',
                'com.apple.quicktime.software': '17.1.2',
                'com.apple.quicktime.creationdate': '2024-12-08T11:30:12+1300'
            }
        },
        'streams': [
            {
                'codec_type': 'video',
                'codec_name': 'hevc',
                'width': 1920,
                'height': 1440,
                'r_frame_rate': '30/1',
                'color_space': 'bt709',
                'tags': {
                    'creation_time': '2024-12-07T22:30:13.000000Z',
                    'rotate': '90'
                }
            }
        ]
    }
