"""方案 2：添加颜色直方图相似度作为二次过滤

原理：
- 感知哈希关注结构和亮度，但忽略颜色信息
- 颜色直方图可以捕捉图片的色调分布
- 组合使用可以有效区分"结构相似但颜色不同"的图片

使用场景：
- 人物照（暖色调）vs 风景照（冷色调）
- 日落照片（橙红色）vs 雪景照片（蓝白色）
"""
from typing import Tuple, Optional
from PIL import Image
import numpy as np
from ..tools.utils import get_logger

logger = get_logger(__name__)


class ColorHistogramCalculator:
    """颜色直方图计算器

    计算图片的颜色分布特征，用于辅助相似度判断。
    """

    def __init__(self, bins: int = 8):
        """初始化颜色直方图计算器

        Args:
            bins: 每个颜色通道的分箱数量（默认 8）
                - 8: 生成 8x8x8=512 维特征向量
                - 16: 更精细，但计算量更大
        """
        self.bins = bins

    def calculate_histogram(self, image_path: str) -> Optional[np.ndarray]:
        """计算图片的颜色直方图

        Args:
            image_path: 图片文件路径

        Returns:
            归一化的颜色直方图（512 维向量），失败返回 None
        """
        try:
            with Image.open(image_path) as img:
                # 转换为 RGB
                if img.mode != 'RGB':
                    img = img.convert('RGB')

                # 缩小图片以加速计算（颜色分布不需要高分辨率）
                img.thumbnail((256, 256))

                # 转为 numpy 数组
                img_array = np.array(img)

                # 计算 3D 颜色直方图（R, G, B 三个通道）
                hist, _ = np.histogramdd(
                    img_array.reshape(-1, 3),
                    bins=(self.bins, self.bins, self.bins),
                    range=((0, 256), (0, 256), (0, 256))
                )

                # 归一化（转为概率分布）
                hist = hist.flatten()
                hist = hist / hist.sum()

                return hist

        except Exception as e:
            logger.error(f"计算颜色直方图失败 {image_path}: {e}")
            return None

    def calculate_similarity(
        self,
        hist1: np.ndarray,
        hist2: np.ndarray,
        method: str = 'correlation'
    ) -> float:
        """计算两个直方图的相似度

        Args:
            hist1: 第一个直方图
            hist2: 第二个直方图
            method: 相似度计算方法
                - 'correlation': 相关系数（推荐，范围 -1 到 1）
                - 'chi_square': 卡方距离（范围 0 到无穷）
                - 'intersection': 直方图交集（范围 0 到 1）
                - 'bhattacharyya': 巴氏距离（范围 0 到 1）

        Returns:
            相似度分数
            - correlation: 1 表示完全相同，0 表示无关，-1 表示完全相反
            - chi_square: 0 表示完全相同，值越大越不同
            - intersection: 1 表示完全相同，0 表示完全不同
            - bhattacharyya: 1 表示完全相同，0 表示完全不同
        """
        try:
            if method == 'correlation':
                # 皮尔逊相关系数
                correlation = np.corrcoef(hist1, hist2)[0, 1]
                return float(correlation)

            elif method == 'chi_square':
                # 卡方距离（需要归一化到 0-1 范围）
                chi_square = np.sum((hist1 - hist2) ** 2 / (hist1 + hist2 + 1e-10))
                # 转换为相似度（距离越小越相似）
                similarity = 1.0 / (1.0 + chi_square)
                return float(similarity)

            elif method == 'intersection':
                # 直方图交集
                intersection = np.sum(np.minimum(hist1, hist2))
                return float(intersection)

            elif method == 'bhattacharyya':
                # 巴氏系数
                bhattacharyya = np.sum(np.sqrt(hist1 * hist2))
                return float(bhattacharyya)

            else:
                logger.warning(f"未知的相似度计算方法: {method}")
                return 0.0

        except Exception as e:
            logger.error(f"计算直方图相似度失败: {e}")
            return 0.0

    def is_similar(
        self,
        hist1: np.ndarray,
        hist2: np.ndarray,
        threshold: float = 0.7,
        method: str = 'correlation'
    ) -> Tuple[bool, float]:
        """判断两个直方图是否相似

        Args:
            hist1: 第一个直方图
            hist2: 第二个直方图
            threshold: 相似度阈值（默认 0.7）
            method: 相似度计算方法

        Returns:
            (是否相似, 相似度分数)
        """
        similarity = self.calculate_similarity(hist1, hist2, method)
        is_similar = similarity >= threshold

        return is_similar, similarity


class HybridSimilarityCalculator:
    """混合相似度计算器

    组合感知哈希和颜色直方图，提供更准确的相似度判断。

    策略：
    1. 先用感知哈希快速筛选候选素材（汉明距离 < threshold）
    2. 再用颜色直方图进行二次过滤（颜色相似度 > color_threshold）
    3. 综合两种相似度得出最终结果
    """

    def __init__(
        self,
        hash_weight: float = 0.6,
        color_weight: float = 0.4
    ):
        """初始化混合相似度计算器

        Args:
            hash_weight: 感知哈希的权重（默认 0.6）
            color_weight: 颜色直方图的权重（默认 0.4）
        """
        self.hash_weight = hash_weight
        self.color_weight = color_weight

    def calculate_combined_similarity(
        self,
        hash_distance: float,
        color_similarity: float,
        max_hash_distance: float = 64.0
    ) -> float:
        """计算综合相似度

        Args:
            hash_distance: 感知哈希的汉明距离（0-64）
            color_similarity: 颜色相似度（0-1）
            max_hash_distance: 最大哈希距离（用于归一化）

        Returns:
            综合相似度（0-100）
        """
        # 将哈希距离转换为相似度（0-1）
        hash_similarity = 1.0 - (hash_distance / max_hash_distance)

        # 加权平均
        combined = (
            hash_similarity * self.hash_weight +
            color_similarity * self.color_weight
        )

        # 转换为百分比
        return combined * 100

    def is_similar(
        self,
        hash_distance: float,
        color_similarity: float,
        hash_threshold: float = 15.0,
        color_threshold: float = 0.6,
        combined_threshold: float = 70.0
    ) -> Tuple[bool, float, dict]:
        """判断是否相似（综合判断）

        Args:
            hash_distance: 感知哈希距离
            color_similarity: 颜色相似度
            hash_threshold: 哈希距离阈值
            color_threshold: 颜色相似度阈值
            combined_threshold: 综合相似度阈值

        Returns:
            (是否相似, 综合相似度, 详细信息)

        判断逻辑：
        1. 哈希距离必须 < hash_threshold（结构相似）
        2. 颜色相似度必须 > color_threshold（颜色相似）
        3. 综合相似度必须 > combined_threshold（整体相似）
        """
        # 计算综合相似度
        combined_similarity = self.calculate_combined_similarity(
            hash_distance, color_similarity
        )

        # 三重判断
        hash_pass = hash_distance <= hash_threshold
        color_pass = color_similarity >= color_threshold
        combined_pass = combined_similarity >= combined_threshold

        is_similar = hash_pass and color_pass and combined_pass

        details = {
            'hash_distance': hash_distance,
            'hash_pass': hash_pass,
            'color_similarity': color_similarity,
            'color_pass': color_pass,
            'combined_similarity': combined_similarity,
            'combined_pass': combined_pass
        }

        return is_similar, combined_similarity, details


# 使用示例
def find_similar_with_color_filter(
    db,
    asset_id: int,
    hash_threshold: float = 15.0,
    color_threshold: float = 0.6,
    limit: int = 10
):
    """查找相似素材（带颜色过滤）

    Args:
        db: 数据库会话
        asset_id: 素材 ID
        hash_threshold: 哈希距离阈值
        color_threshold: 颜色相似度阈值
        limit: 返回数量

    Returns:
        相似素材列表
    """
    from ..model import Asset
    from ..tools.perceptual_hash import PerceptualHashCalculator
    import os
    from ..config import settings

    # 1. 获取目标素材
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset or not asset.phash:
        return []

    # 2. 计算目标素材的颜色直方图
    color_calc = ColorHistogramCalculator()
    target_file = os.path.join(settings.NAS_DATA_PATH, asset.original_path)
    target_hist = color_calc.calculate_histogram(target_file)

    if target_hist is None:
        logger.warning(f"无法计算目标素材的颜色直方图: {asset_id}")
        # 降级为仅使用哈希
        from ..tools.perceptual_hash import find_similar_assets
        return find_similar_assets(
            db, asset.phash, threshold=int(hash_threshold), limit=limit
        )

    # 3. 先用哈希快速筛选候选素材（放宽阈值）
    hash_calc = PerceptualHashCalculator()
    candidates = []

    filters = [
        Asset.phash.isnot(None),
        Asset.is_deleted == False,
        Asset.asset_type == asset.asset_type,
        Asset.id != asset_id
    ]
    assets = db.query(Asset).filter(*filters).limit(500).all()

    for candidate in assets:
        hash_distance = hash_calc.calculate_distance(asset.phash, candidate.phash)
        if hash_distance <= hash_threshold * 1.5:  # 放宽 50%
            candidates.append((candidate, hash_distance))

    # 4. 用颜色直方图进行二次过滤
    hybrid_calc = HybridSimilarityCalculator()
    results = []

    for candidate, hash_distance in candidates:
        candidate_file = os.path.join(settings.NAS_DATA_PATH, candidate.original_path)
        candidate_hist = color_calc.calculate_histogram(candidate_file)

        if candidate_hist is None:
            continue

        # 计算颜色相似度
        color_similarity = color_calc.calculate_similarity(
            target_hist, candidate_hist, method='correlation'
        )

        # 综合判断
        is_similar, combined_similarity, details = hybrid_calc.is_similar(
            hash_distance, color_similarity,
            hash_threshold, color_threshold
        )

        if is_similar:
            results.append({
                'asset': candidate,
                'hash_distance': hash_distance,
                'color_similarity': color_similarity,
                'combined_similarity': combined_similarity,
                'details': details
            })

    # 5. 按综合相似度排序
    results.sort(key=lambda x: x['combined_similarity'], reverse=True)

    return results[:limit]
