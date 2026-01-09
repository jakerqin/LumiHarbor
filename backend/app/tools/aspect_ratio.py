"""图片宽高比计算工具"""


def calculate_aspect_ratio(width: int, height: int) -> str:
    """计算图片宽高比分类

    Args:
        width: 图片宽度
        height: 图片高度

    Returns:
        'horizontal': 横图 (宽/高 > 1.3)
        'vertical': 竖图 (高/宽 > 1.3)
        'square': 方图

    Examples:
        >>> calculate_aspect_ratio(1920, 1080)  # 16:9 横图
        'horizontal'
        >>> calculate_aspect_ratio(1080, 1920)  # 9:16 竖图
        'vertical'
        >>> calculate_aspect_ratio(1000, 1000)  # 1:1 方图
        'square'
    """
    if width and height:
        ratio = width / height
        if ratio > 1.3:
            return 'horizontal'
        elif ratio < 0.77:  # 1/1.3 ≈ 0.77
            return 'vertical'
    return 'square'
