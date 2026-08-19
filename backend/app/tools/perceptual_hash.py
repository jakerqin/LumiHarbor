"""感知哈希计算工具（多算法组合）

用于计算图片和视频的感知哈希（Perceptual Hash），用于查找相似素材。

特点：
- 支持多种哈希算法：phash（DCT）、dhash（梯度）、average_hash（亮度）、colorhash（颜色）
- 多哈希组合策略，降低误判率
- 可配置的相似度计算策略
- 向后兼容旧的单哈希模式

算法对比：
- average_hash: 基于平均亮度，速度快但准确率低（容易误判）
- phash: 基于 DCT 变换，对图像内容更敏感，准确率高
- dhash: 基于梯度差异，对边缘和结构敏感，抗旋转能力强
- colorhash: 基于颜色分布，区分不同色调的图片
"""
from typing import Optional, Dict
from PIL import Image
import numpy
import imagehash
from pillow_heif import register_heif_opener
from ..tools.utils import get_logger

# 注册 HEIF/HEIC 解码器（支持苹果 HEIC 格式）
register_heif_opener()

logger = get_logger(__name__)


def _hex_to_colorhash(hexstr: str) -> imagehash.ImageHash:
    if not hexstr:
        raise ValueError("colorhash is empty")

    value = int(hexstr, 16)
    total_bits = len(hexstr) * 4
    bit_length = (total_bits // 14) * 14
    if bit_length <= 0:
        raise ValueError("colorhash length is invalid")

    binary = bin(value)[2:].zfill(total_bits)
    binary = binary[-bit_length:]
    bits = [c == '1' for c in binary]
    hash_array = numpy.array(bits, dtype=bool).reshape((14, bit_length // 14))
    return imagehash.ImageHash(hash_array)


class MultiHashCalculator:
    """多哈希组合计算器

    使用多种哈希算法组合，提高相似度判断的准确性。

    示例：
        >>> calculator = MultiHashCalculator()
        >>> hashes = calculator.calculate_image('/path/to/photo.jpg')
        >>> print(hashes)
        {
            'phash': 'a3f5c9d1e8b2f4a6',
            'dhash': 'b4e6d8f2a9c3e5b7',
            'average_hash': 'c5f7e9d3b1a4f6c8',
            'colorhash': 'd6a8f1e4c2b5d7a9'
        }
    """

    def __init__(self, hash_size: int = 8, use_color: bool = True):
        """初始化多哈希计算器

        Args:
            hash_size: 哈希大小（默认 8，生成 64 位哈希）
            use_color: 是否计算颜色哈希（默认 True）
        """
        self.hash_size = hash_size
        self.use_color = use_color

    def calculate_image(self, image_path: str) -> Optional[Dict[str, str]]:
        """计算图片的多种感知哈希

        Args:
            image_path: 图片文件路径

        Returns:
            包含多种哈希的字典，失败返回 None
            {
                'phash': str,        # DCT 哈希（推荐用于主要相似度判断）
                'dhash': str,        # 差分哈希（辅助判断）
                'average_hash': str, # 均值哈希（兼容旧数据）
                'colorhash': str     # 颜色哈希（可选）
            }
        """
        try:
            with Image.open(image_path) as img:
                # 转换为 RGB（某些格式如 RGBA 需要转换）
                if img.mode not in ('RGB', 'L'):
                    img = img.convert('RGB')

                hashes = {
                    # phash: 基于 DCT 变换，对图像内容最敏感（推荐）
                    'phash': str(imagehash.phash(img, hash_size=self.hash_size)),

                    # dhash: 基于梯度，对边缘和结构敏感
                    'dhash': str(imagehash.dhash(img, hash_size=self.hash_size)),

                    # average_hash: 基于平均亮度（保留用于兼容）
                    'average_hash': str(imagehash.average_hash(img, hash_size=self.hash_size)),
                }

                # 颜色哈希（可选，用于区分不同色调）
                if self.use_color:
                    hashes['colorhash'] = str(imagehash.colorhash(img))

                return hashes

        except FileNotFoundError:
            logger.error(f"图片文件不存在: {image_path}")
            return None
        except Exception as e:
            logger.error(f"计算图片多哈希失败 {image_path}: {e}")
            return None

    def calculate_video(self, video_path: str) -> Optional[Dict[str, str]]:
        """计算视频的多种感知哈希

        策略：提取视频的中间帧，计算该帧的多种哈希

        Args:
            video_path: 视频文件路径

        Returns:
            包含多种哈希的字典，失败返回 None
        """
        import ffmpeg
        import tempfile
        import os

        temp_frame_path = None

        try:
            # 1. 获取视频时长
            probe = ffmpeg.probe(video_path)
            duration = float(probe['format'].get('duration', 0))

            if duration == 0:
                logger.warning(f"无法获取视频时长: {video_path}")
                return None

            # 2. 提取中间帧
            middle_time = duration / 2
            temp_frame_path = tempfile.mktemp(suffix='.jpg')

            (
                ffmpeg
                .input(video_path, ss=middle_time)
                .output(temp_frame_path, vframes=1)
                .overwrite_output()
                .run(capture_stdout=True, capture_stderr=True, quiet=True)
            )

            # 3. 计算提取帧的多种哈希
            hashes = self.calculate_image(temp_frame_path)
            return hashes

        except Exception as e:
            logger.error(f"计算视频多哈希失败 {video_path}: {e}")
            return None

        finally:
            # 清理临时文件
            if temp_frame_path and os.path.exists(temp_frame_path):
                try:
                    os.remove(temp_frame_path)
                except Exception:
                    pass

    def calculate(self, file_path: str, asset_type: str) -> Optional[Dict[str, str]]:
        """计算感知哈希（便捷方法）

        Args:
            file_path: 文件路径
            asset_type: 素材类型（'image', 'video', 'audio'）

        Returns:
            包含多种哈希的字典，不支持的类型返回 None
        """
        if asset_type == 'image':
            return self.calculate_image(file_path)
        elif asset_type == 'video':
            return self.calculate_video(file_path)
        elif asset_type == 'audio':
            # 音频不支持感知哈希
            logger.debug(f"音频文件不支持感知哈希: {file_path}")
            return None
        else:
            logger.warning(f"未知素材类型: {asset_type}")
            return None

    def calculate_combined_distance(
        self,
        hashes1: Dict[str, str],
        hashes2: Dict[str, str],
        weights: Optional[Dict[str, float]] = None
    ) -> float:
        """计算两组哈希的综合距离

        使用加权平均的方式组合多种哈希的距离。

        Args:
            hashes1: 第一组哈希
            hashes2: 第二组哈希
            weights: 各哈希的权重（默认 phash=0.5, dhash=0.3, average_hash=0.1, colorhash=0.1）

        Returns:
            综合距离（float）

        示例：
            >>> distance = calculator.calculate_combined_distance(hash1, hash2)
            >>> print(distance)
            8.5
        """
        if weights is None:
            weights = {
                'phash': 0.5,         # phash 权重最高（最准确）
                'dhash': 0.3,         # dhash 次之
                'average_hash': 0.1,  # average_hash 权重最低（仅作参考）
                'colorhash': 0.1      # colorhash 用于区分色调
            }

        weighted_sum = 0.0
        total_weight = 0.0

        for hash_type in ['phash', 'dhash', 'average_hash', 'colorhash']:
            if hash_type in hashes1 and hash_type in hashes2:
                value1 = hashes1.get(hash_type)
                value2 = hashes2.get(hash_type)
                if not value1 or not value2:
                    continue

                try:
                    if hash_type == 'colorhash':
                        h1 = _hex_to_colorhash(value1)
                        h2 = _hex_to_colorhash(value2)
                    else:
                        h1 = imagehash.hex_to_hash(value1)
                        h2 = imagehash.hex_to_hash(value2)
                    distance = int(h1 - h2)

                    # 加权累加
                    weight = weights.get(hash_type, 0.0)
                    weighted_sum += distance * weight
                    total_weight += weight

                except Exception as e:
                    logger.warning(f"计算 {hash_type} 距离失败: {e}")
                    continue

        # 计算加权平均距离
        combined_distance = weighted_sum / total_weight if total_weight > 0 else 999.0

        return combined_distance


def _hamming_distance(hash1: str, hash2: str) -> float:
    """单哈希汉明距离；失败返回 999（视为完全不同）。"""
    try:
        return float(int(imagehash.hex_to_hash(hash1) - imagehash.hex_to_hash(hash2)))
    except Exception as e:
        logger.error(f"计算哈希距离失败: {e}")
        return 999.0


def visual_percent(distance: float) -> float:
    """把 0–64 距离换成百分比，越大越像。"""
    return max(0.0, 100.0 - (distance / 64.0 * 100.0))


def compute_visual_distance(source: Dict[str, str], target: Dict[str, str]) -> float:
    """两组哈希的视觉距离；四哈希齐全走加权，否则只比 phash。"""
    if source.get('dhash') and source.get('average_hash') and source.get('colorhash'):
        return MultiHashCalculator().calculate_combined_distance(source, target)
    return _hamming_distance(source.get('phash') or '', target.get('phash') or '')
