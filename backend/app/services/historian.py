import os
import exifread
from datetime import datetime
from PIL import Image
from pathlib import Path

class HistorianService:
    """负责扫描、解析和导入历史素材的服务"""
    
    SUPPORTED_IMAGES = {'.jpg', '.jpeg', '.png', '.heic', '.raw'}
    SUPPORTED_VIDEOS = {'.mp4', '.mov', '.avi'}

    @staticmethod
    def get_exif_metadata(file_path):
        """提取图片 EXIF 元数据"""
        metadata = {}
        try:
            with open(file_path, 'rb') as f:
                tags = exifread.process_file(f, details=False)
                for tag in tags.keys():
                    if tag not in ('JPEGThumbnail', 'TIFFThumbnail', 'Filename', 'EXIF MakerNote'):
                        metadata[tag] = str(tags[tag])
            
            # 尝试提取拍摄时间
            shot_at = None
            date_tags = ['EXIF DateTimeOriginal', 'Image DateTime', 'EXIF DateTimeDigitized']
            for tag in date_tags:
                if tag in tags:
                    try:
                        shot_at = datetime.strptime(str(tags[tag]), '%Y:%m:%d %H:%M:%S')
                        break
                    except ValueError:
                        continue
            
            return metadata, shot_at
        except Exception as e:
            print(f"Error parsing EXIF for {file_path}: {e}")
            return {}, None

    @classmethod
    def scan_directory(cls, root_path, created_by, visibility='general'):
        """扫描目录并返回待导入的素材列表

        参数:
            root_path: 扫描根路径
            created_by: 创建者用户ID
            visibility: 素材可见性 ('general' 或 'private')
        """
        assets_to_import = []
        for root, dirs, files in os.walk(root_path):
            for file in files:
                ext = Path(file).suffix.lower()
                if ext in cls.SUPPORTED_IMAGES or ext in cls.SUPPORTED_VIDEOS:
                    full_path = os.path.join(root, file)
                    rel_path = os.path.relpath(full_path, root_path)
                    
                    # 基础信息解析
                    file_size = os.path.getsize(full_path)
                    asset_type = 'image' if ext in cls.SUPPORTED_IMAGES else 'video'
                    
                    # 提取元数据
                    exif, shot_at = cls.get_exif_metadata(full_path)
                    if not shot_at:
                        # 如果没有 EXIF 时间，回退到文件创建时间
                        shot_at = datetime.fromtimestamp(os.path.getctime(full_path))
                    
                    asset = {
                        "created_by": created_by,
                        "original_path": rel_path,
                        "asset_type": asset_type,
                        "file_size": file_size,
                        "mime_type": f"{asset_type}/{ext.lstrip('.')}",
                        "visibility": visibility,
                        "shot_at": shot_at,
                        "is_deleted": False,  # 新导入的素材默认未删除
                    }
                    assets_to_import.append(asset)
        return assets_to_import

    @staticmethod
    def generate_thumbnail(original_full_path, thumbnail_dest_path, size=(400, 400)):
        """生成预览图"""
        try:
            with Image.open(original_full_path) as img:
                img.thumbnail(size)
                # 确保保存路径存在
                os.makedirs(os.path.dirname(thumbnail_dest_path), exist_ok=True)
                img.save(thumbnail_dest_path, "WEBP", quality=80)
                return True
        except Exception as e:
            print(f"Error generating thumbnail for {original_full_path}: {e}")
            return False
