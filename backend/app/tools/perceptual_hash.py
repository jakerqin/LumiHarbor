"""感知哈希计算工具

用于计算图片和视频的感知哈希（Perceptual Hash），用于查找相似素材。

特点：
- 图片：使用 average_hash 算法
- 视频：提取关键帧后计算哈希
- 容忍轻微编辑、压缩、缩放
"""
from typing import Optional
from PIL import Image
import imagehash
from pillow_heif import register_heif_opener
from ..tools.utils import get_logger

# 注册 HEIF/HEIC 解码器（支持苹果 HEIC 格式）
register_heif_opener()

logger = get_logger(__name__)


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
            return h1 - h2  # imagehash 重载了减法运算符计算汉明距离
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
    threshold: int = 10,
    limit: int = 10,
    exclude_asset_id: Optional[int] = None,
    asset_type: Optional[str] = None,
):
    """在数据库中查找相似素材

    Args:
        db: 数据库会话
        phash: 待查找的感知哈希
        threshold: 相似度阈值
        limit: 返回结果数量限制

    Returns:
        相似素材列表，按相似度排序

    注意：
        这个查询可能较慢，建议在后台任务中执行
    """
    from ..model import Asset

    calculator = PerceptualHashCalculator()

    # 查询所有有 phash 的素材（需要优化）
    filters = [
        Asset.phash.isnot(None),
        Asset.is_deleted == False,
    ]
    if asset_type:
        filters.append(Asset.asset_type == asset_type)

    assets = db.query(Asset).filter(*filters).limit(1000).all()  # 限制查询数量

    # 计算距离并过滤
    similar_assets = []
    for asset in assets:
        if exclude_asset_id is not None and asset.id == exclude_asset_id:
            continue  # 跳过自身

        if exclude_asset_id is None and asset.phash == phash:
            continue  # 跳过完全相同的

        distance = calculator.calculate_distance(phash, asset.phash)
        if distance <= threshold:
            similar_assets.append({
                'asset': asset,
                'distance': distance,
                'similarity': 100 - (distance / 64 * 100)  # 相似度百分比
            })

    # 按距离排序（距离越小越相似）
    similar_assets.sort(key=lambda x: x['distance'])

    return similar_assets[:limit]
