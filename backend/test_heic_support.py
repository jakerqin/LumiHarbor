"""HEIC 格式支持测试脚本

验证 pillow-heif 是否正确安装，以及 HEIC 图片能否正常处理。
"""
import sys
from pathlib import Path

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent))

from PIL import Image
from pillow_heif import register_heif_opener
from app.services.thumbnail.image import ImageThumbnailGenerator
from app.tools.perceptual_hash import calculate_perceptual_hash

# 注册 HEIF 解码器
register_heif_opener()


def test_heic_file(heic_path: str):
    """测试 HEIC 文件处理

    Args:
        heic_path: HEIC 文件路径
    """
    print(f"\n{'='*60}")
    print(f"测试 HEIC 文件: {heic_path}")
    print(f"{'='*60}\n")

    # 1. 测试 PIL 能否打开 HEIC
    print("1️⃣ 测试 PIL Image.open() ...")
    try:
        with Image.open(heic_path) as img:
            print(f"   ✅ 成功打开图片")
            print(f"   - 格式: {img.format}")
            print(f"   - 尺寸: {img.size}")
            print(f"   - 模式: {img.mode}")
    except Exception as e:
        print(f"   ❌ 失败: {e}")
        return

    # 2. 测试缩略图生成
    print("\n2️⃣ 测试缩略图生成 ...")
    try:
        generator = ImageThumbnailGenerator()
        thumbnail_path = "/tmp/test_heic_thumbnail.webp"
        success = generator.generate(heic_path, thumbnail_path, size=(400, 400))

        if success:
            print(f"   ✅ 缩略图生成成功: {thumbnail_path}")

            # 验证缩略图文件
            with Image.open(thumbnail_path) as thumb:
                print(f"   - 格式: {thumb.format}")
                print(f"   - 尺寸: {thumb.size}")
        else:
            print(f"   ❌ 缩略图生成失败")
    except Exception as e:
        print(f"   ❌ 失败: {e}")

    # 3. 测试感知哈希计算
    print("\n3️⃣ 测试感知哈希计算 ...")
    try:
        phash = calculate_perceptual_hash(heic_path, 'image')
        if phash:
            print(f"   ✅ 感知哈希计算成功")
            print(f"   - phash: {phash}")
        else:
            print(f"   ❌ 感知哈希计算失败")
    except Exception as e:
        print(f"   ❌ 失败: {e}")

    print(f"\n{'='*60}")
    print("测试完成！")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    # 使用用户提供的 HEIC 文件路径
    test_file = "/Users/qinlianji/workspace/data/lumiharbor/IMG_3195.HEIC"

    if not Path(test_file).exists():
        print(f"❌ 测试文件不存在: {test_file}")
        print("\n请提供一个有效的 HEIC 文件路径")
        sys.exit(1)

    test_heic_file(test_file)
