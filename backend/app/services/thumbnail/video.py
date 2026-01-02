"""视频缩略图生成器

使用 ffmpeg 从视频中提取帧并生成高质量缩略图。
"""
import ffmpeg
from typing import Tuple
from .generator import ThumbnailGenerator
from ...tools.utils import get_logger

logger = get_logger(__name__)


class VideoThumbnailGenerator(ThumbnailGenerator):
    """使用 ffmpeg 生成视频缩略图

    特性：
    - 从视频第 1 秒提取帧
    - 自动保持宽高比缩放
    - 生成 WebP 格式（体积小、质量高）
    - 硬件加速支持（如果可用）

    依赖：
    - 系统需要安装 ffmpeg（参见项目根目录 README.md）
    - Python 包：ffmpeg-python
    """

    def generate(
        self,
        source_path: str,
        dest_path: str,
        size: Tuple[int, int] = (400, 400)
    ) -> bool:
        """生成视频缩略图

        从视频中智能选择位置提取一帧，缩放后保存为 WebP 格式。

        提取策略：
        - 先尝试从视频 10% 位置提取（避免黑帧）
        - 如果失败，降级到首帧 (0秒)

        Args:
            source_path: 原始视频文件的完整路径
            dest_path: 缩略图保存路径（建议 .webp 扩展名）
            size: 最大尺寸 (width, height)，保持宽高比不变形

        Returns:
            成功返回 True，失败返回 False

        示例:
            >>> generator = VideoThumbnailGenerator()
            >>> success = generator.generate(
            ...     '/path/to/video.mp4',
            ...     '/path/to/thumb.webp',
            ...     size=(400, 400)
            ... )
        """
        try:
            # 确保目标目录存在
            self._ensure_dest_dir(dest_path)

            logger.debug(f"开始生成视频缩略图: {source_path}")

            # 获取视频时长以智能选择提取位置
            video_info = self.get_video_info(source_path)
            duration = video_info.get('duration', 0)

            # 根据时长选择提取位置
            if duration > 2:
                # 长视频：从 1 秒处提取（避免开头黑帧）
                seek_time = 1
            elif duration > 0:
                # 短视频：从 10% 位置提取
                seek_time = duration * 0.1
            else:
                # 无法获取时长：使用首帧
                seek_time = 0

            logger.debug(f"视频时长: {duration:.2f}s, 提取位置: {seek_time:.2f}s")

            # 尝试生成缩略图
            success = self._generate_thumbnail(source_path, dest_path, size, seek_time)

            # 如果失败且 seek_time 不是 0，尝试降级到首帧
            if not success and seek_time > 0:
                logger.warning(f"从 {seek_time}s 提取失败，降级到首帧重试")
                success = self._generate_thumbnail(source_path, dest_path, size, 0)

            if success:
                logger.info(f"视频缩略图生成成功: {dest_path}")

            return success

        except Exception as e:
            # 其他未知错误
            logger.error(f"生成视频缩略图失败 {source_path}: {type(e).__name__} - {e}")
            return False

    def _generate_thumbnail(
        self,
        source_path: str,
        dest_path: str,
        size: Tuple[int, int],
        seek_time: float
    ) -> bool:
        """执行 ffmpeg 缩略图生成

        Args:
            source_path: 源视频路径
            dest_path: 目标缩略图路径
            size: 尺寸
            seek_time: 提取位置（秒）

        Returns:
            成功返回 True，失败返回 False
        """
        try:
            # 使用 ffmpeg 提取帧并生成缩略图
            (
                ffmpeg
                # 输入视频，跳转到指定位置
                .input(source_path, ss=seek_time)
                # 缩放滤镜：保持宽高比，最大边不超过指定尺寸
                .filter('scale', size[0], size[1], force_original_aspect_ratio='decrease')
                # 输出配置
                .output(
                    dest_path,
                    vframes=1,         # 只提取 1 帧
                    format='webp',     # WebP 格式
                    quality=80,        # 质量 80%
                    lossless=0         # 有损压缩（体积更小）
                )
                # 覆盖已存在的文件
                .overwrite_output()
                # 执行（静默模式）
                .run(capture_stdout=True, capture_stderr=True, quiet=True)
            )

            return True

        except ffmpeg.Error as e:
            # ffmpeg 执行错误
            stderr = e.stderr.decode('utf-8') if e.stderr else '未知错误'

            # 解析常见错误
            if 'Invalid data found' in stderr or 'moov atom not found' in stderr:
                logger.error(f"视频文件损坏或格式不支持: {source_path}")
            elif 'No such file' in stderr or 'does not exist' in stderr:
                logger.error(f"视频文件不存在: {source_path}")
            elif 'Duration N/A' in stderr:
                logger.error(f"无法获取视频时长（可能文件损坏）: {source_path}")
            elif 'Cannot allocate memory' in stderr or 'No filtered frames' in stderr:
                logger.warning(f"无可用帧（可能 seek 位置超出视频范围）: ss={seek_time}s")
            else:
                logger.error(f"ffmpeg 处理失败 {source_path}: {stderr[:500]}")  # 限制日志长度

            return False

        except FileNotFoundError:
            # ffmpeg 未安装
            logger.error(
                "ffmpeg 未安装或不在系统 PATH 中。"
                "请参考项目 README.md 安装 ffmpeg。"
            )
            return False

        except PermissionError as e:
            # 文件权限问题
            logger.error(f"权限不足，无法访问文件 {source_path}: {e}")
            return False

    @staticmethod
    def get_video_info(video_path: str) -> dict:
        """获取视频元数据信息（可选工具方法）

        Args:
            video_path: 视频文件路径

        Returns:
            包含视频信息的字典，如果失败返回空字典

        示例返回值：
            {
                'duration': 30.5,          # 时长（秒）
                'width': 1920,             # 宽度
                'height': 1080,            # 高度
                'fps': 30.0,               # 帧率
                'codec': 'h264',           # 视频编码
                'bitrate': 5000000         # 比特率
            }
        """
        try:
            probe = ffmpeg.probe(video_path)

            # 查找视频流
            video_stream = next(
                (stream for stream in probe['streams'] if stream['codec_type'] == 'video'),
                None
            )

            if not video_stream:
                logger.warning(f"未找到视频流: {video_path}")
                return {}

            # 提取关键信息
            info = {
                'duration': float(probe['format'].get('duration', 0)),
                'width': int(video_stream.get('width', 0)),
                'height': int(video_stream.get('height', 0)),
                'codec': video_stream.get('codec_name', 'unknown'),
            }

            # 帧率（可能是分数形式如 "30000/1001"）
            fps_str = video_stream.get('r_frame_rate', '0/1')
            num, den = map(int, fps_str.split('/'))
            info['fps'] = round(num / den, 2) if den != 0 else 0.0

            # 比特率
            info['bitrate'] = int(probe['format'].get('bit_rate', 0))

            return info

        except Exception as e:
            logger.error(f"获取视频信息失败 {video_path}: {e}")
            return {}
