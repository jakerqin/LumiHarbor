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
from typing import Optional, Dict, Tuple
from PIL import Image
import imagehash
from pillow_heif import register_heif_opener
from ..tools.utils import get_logger

# 注册 HEIF/HEIC 解码器（支持苹果 HEIC 格式）
register_heif_opener()

logger = get_logger(__name__)


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
                try:
                    h1 = imagehash.hex_to_hash(hashes1[hash_type])
                    h2 = imagehash.hex_to_hash(hashes2[hash_type])
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

    def is_similar(
        self,
        hashes1: Dict[str, str],
        hashes2: Dict[str, str],
        threshold: float = 10.0,
        weights: Optional[Dict[str, float]] = None
    ) -> Tuple[bool, float]:
        """判断两组哈希是否相似

        Args:
            hashes1: 第一组哈希
            hashes2: 第二组哈希
            threshold: 相似度阈值（默认 10.0）
            weights: 各哈希的权重

        Returns:
            (是否相似, 综合距离)
        """
        combined_distance = self.calculate_combined_distance(
            hashes1, hashes2, weights
        )
        is_similar = combined_distance <= threshold

        return is_similar, combined_distance


class PerceptualHashCalculator:
    """感知哈希计算器

    使用 imagehash 库计算图片的感知哈希值。
    相似的图片会产生相似的哈希值（通过汉明距离比较）。

    示例：
        >>> calculator = PerceptualHashCalculator()
        >>> phash = calculator.calculate_image('/path/to/photo.jpg')
        >>> print(phash)
        'a3f5c9d1e8b2f4a6'
    """

    def __init__(self, hash_size: int = 8):
        """初始化感知哈希计算器

        Args:
            hash_size: 哈希大小（默认 8，生成 64 位哈希）
                - 8: 标准大小，适合大多数场景
                - 16: 更精确，但存储空间更大
        """
        self.hash_size = hash_size

    def calculate_image(self, image_path: str) -> Optional[str]:
        """计算图片的感知哈希

        Args:
            image_path: 图片文件路径

        Returns:
            十六进制感知哈希字符串，失败返回 None

        示例:
            原图:       a3f5c9d1e8b2f4a6
            缩放后:     a3f5c9d1e8b2f4a7  (仅最后一位不同)
            压缩后:     a3f5c9d1e8b2f5a6  (汉明距离: 2)
        """
        try:
            with Image.open(image_path) as img:
                # 使用 average_hash 算法
                # 其他选项: phash (更精确), dhash (对旋转敏感), whash (小波哈希)
                hash_value = imagehash.average_hash(img, hash_size=self.hash_size)
                return str(hash_value)

        except FileNotFoundError:
            logger.error(f"图片文件不存在: {image_path}")
            return None
        except Exception as e:
            logger.error(f"计算图片感知哈希失败 {image_path}: {e}")
            return None

    def calculate_video(self, video_path: str) -> Optional[str]:
        """计算视频的感知哈希

        策略：提取视频的中间帧，计算该帧的感知哈希

        Args:
            video_path: 视频文件路径

        Returns:
            十六进制感知哈希字符串，失败返回 None
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

            # 3. 计算提取帧的感知哈希
            phash = self.calculate_image(temp_frame_path)
            return phash

        except Exception as e:
            logger.error(f"计算视频感知哈希失败 {video_path}: {e}")
            return None

        finally:
            # 清理临时文件
            if temp_frame_path and os.path.exists(temp_frame_path):
                try:
                    os.remove(temp_frame_path)
                except Exception:
                    pass

    def calculate_distance(self, hash1: str, hash2: str) -> int:
        """计算两个感知哈希的汉明距离

        距离越小，图片越相似：
        - 0: 完全相同或几乎相同
        - 1-5: 非常相似（轻微编辑）
        - 6-10: 相似
        - 11-20: 有一定相似性
        - >20: 不同

        Args:
            hash1: 第一个哈希值
            hash2: 第二个哈希值

        Returns:
            汉明距离（不同位的数量）
        """
        try:
            h1 = imagehash.hex_to_hash(hash1)
            h2 = imagehash.hex_to_hash(hash2)
            # imagehash 重载了减法运算符计算汉明距离，返回 numpy.int64
            # 需要转换为 Python 原生 int 以便 JSON 序列化
            return int(h1 - h2)
        except Exception as e:
            logger.error(f"计算哈希距离失败: {e}")
            return 999  # 返回一个很大的值表示完全不同

    def is_similar(
        self,
        hash1: str,
        hash2: str,
        threshold: int = 10
    ) -> bool:
        """判断两个哈希值是否相似

        Args:
            hash1: 第一个哈希值
            hash2: 第二个哈希值
            threshold: 相似度阈值（默认 10）

        Returns:
            True 表示相似，False 表示不相似
        """
        distance = self.calculate_distance(hash1, hash2)
        return distance <= threshold


# 便捷函数
def calculate_perceptual_hash(
    file_path: str,
    asset_type: str,
    hash_size: int = 8
) -> Optional[str]:
    """计算感知哈希（便捷函数）

    Args:
        file_path: 文件路径
        asset_type: 素材类型（'image', 'video', 'audio'）
        hash_size: 哈希大小（默认 8）

    Returns:
        十六进制感知哈希字符串，不支持的类型返回 None

    示例:
        >>> phash = calculate_perceptual_hash('/path/to/photo.jpg', 'image')
        >>> print(phash)
        'a3f5c9d1e8b2f4a6'
    """
    calculator = PerceptualHashCalculator(hash_size=hash_size)

    if asset_type == 'image':
        return calculator.calculate_image(file_path)
    elif asset_type == 'video':
        return calculator.calculate_video(file_path)
    elif asset_type == 'audio':
        # 音频不支持感知哈希
        logger.debug(f"音频文件不支持感知哈希: {file_path}")
        return None
    else:
        logger.warning(f"未知素材类型: {asset_type}")
        return None


def find_similar_assets(
    db,
    phash: str,
    threshold: float = 10.0,
    limit: int = 10,
    exclude_asset_id: Optional[int] = None,
    asset_type: Optional[str] = None,
    dhash: Optional[str] = None,
    average_hash: Optional[str] = None,
    colorhash: Optional[str] = None,
):
    """在数据库中查找相似素材（多哈希综合判断）

    Args:
        db: 数据库会话
        phash: 待查找的感知哈希（DCT变换）
        threshold: 相似度阈值（综合距离，默认 10.0）
        limit: 返回结果数量限制
        exclude_asset_id: 排除的素材ID（通常是查询素材自身）
        asset_type: 素材类型过滤（'image', 'video'）
        dhash: 梯度差异哈希（可选，用于多哈希判断）
        average_hash: 平均亮度哈希（可选，用于多哈希判断）
        colorhash: 颜色分布哈希（可选，用于多哈希判断）

    Returns:
        相似素材列表，按相似度排序:
        [
            {
                'asset': Asset对象,
                'distance': float,  # 综合距离
                'similarity': float  # 相似度百分比
            }
        ]

    说明:
        - 使用多哈希组合策略（phash 0.5 + dhash 0.3 + average 0.1 + color 0.1）
        - 如果只提供 phash，则退化为单哈希判断（兼容旧数据）
        - 综合距离阈值推荐：10.0（相似）、8.0（非常相似）
    """
    from ..model import Asset

    calculator = MultiHashCalculator()

    # 查询所有有 phash 的素材
    filters = [
        Asset.phash.isnot(None),
        Asset.is_deleted == False,
    ]
    if asset_type:
        filters.append(Asset.asset_type == asset_type)

    assets = db.query(Asset).filter(*filters).limit(1000).all()

    # 计算距离并过滤
    similar_assets = []
    for asset in assets:
        if exclude_asset_id is not None and asset.id == exclude_asset_id:
            continue  # 跳过自身

        # 多哈希综合判断
        if dhash and average_hash and colorhash:
            # 使用多哈希组合策略
            distance = calculator.calculate_combined_distance(
                hash1={
                    'phash': phash,
                    'dhash': dhash,
                    'average_hash': average_hash,
                    'colorhash': colorhash
                },
                hash2={
                    'phash': asset.phash,
                    'dhash': asset.dhash or '',
                    'average_hash': asset.average_hash or '',
                    'colorhash': asset.colorhash or ''
                }
            )
        else:
            # 退化为单哈希判断（兼容旧数据）
            old_calculator = PerceptualHashCalculator()
            distance = float(old_calculator.calculate_distance(phash, asset.phash))

        if distance <= threshold:
            similar_assets.append({
                'asset': asset,
                'distance': distance,
                'similarity': 100 - (distance / 64 * 100)  # 相似度百分比
            })

    # 按距离排序（距离越小越相似）
    similar_assets.sort(key=lambda x: x['distance'])

    return similar_assets[:limit]
