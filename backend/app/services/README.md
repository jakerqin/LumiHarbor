# Services 模块重构说明

## 概述

- **scanning**: 文件系统扫描
- **metadata**: 元数据提取
- **thumbnail**: 缩略图生成

## 目录结构

```
services/
├── __init__.py                 # 自动注册所有工厂
│
├── scanning/                   # 文件扫描模块
│   ├── __init__.py
│   └── filesystem.py          # 本地文件系统扫描器
│
├── metadata/                   # 元数据提取模块
│   ├── __init__.py
│   ├── extractor.py           # 抽象基类 + 工厂
│   └── image.py               # 图片 EXIF 提取器
│
├── thumbnail/                  # 缩略图生成模块
│   ├── __init__.py
│   ├── generator.py           # 抽象基类 + 工厂
│   ├── image.py               # 图片缩略图生成器
│   └── video.py               # 视频缩略图生成器（骨架）
│
└── historian.py.deprecated     # 已废弃（保留兼容）
```


### 新代码（推荐）

```python
from ..services import (
    FilesystemScanner,
    MetadataExtractorFactory,
    ThumbnailGeneratorFactory
)

# 扫描目录
assets = FilesystemScanner.scan(path, user_id, visibility)

# 提取元数据（自动选择合适的提取器）
metadata, shot_at = MetadataExtractorFactory.extract('image', file_path)

# 生成缩略图（自动选择合适的生成器）
success = ThumbnailGeneratorFactory.generate('image', source, dest, size)
```

## 架构优势

### 1. **单一职责原则 (SRP)**
每个模块只负责一种类型的操作：
- `FilesystemScanner` - 仅负责文件扫描
- `ImageMetadataExtractor` - 仅负责图片元数据提取
- `ImageThumbnailGenerator` - 仅负责图片缩略图生成

### 2. **开闭原则 (OCP)**
通过工厂模式和抽象基类支持扩展：
```python
# 扩展：添加视频元数据提取器
class VideoMetadataExtractor(MetadataExtractor):
    def extract(self, file_path):
        # 实现视频元数据提取
        pass

# 注册到工厂
MetadataExtractorFactory.register('video', VideoMetadataExtractor())
```

### 3. **依赖倒置原则 (DIP)**
路由层依赖抽象（工厂），而非具体实现：
```python
# ✅ 依赖抽象
from ..services import ThumbnailGeneratorFactory
ThumbnailGeneratorFactory.generate(asset_type, source, dest)

# ❌ 依赖具体实现
from ..services.thumbnail.image import ImageThumbnailGenerator
ImageThumbnailGenerator().generate(source, dest)
```

## 扩展示例

### 添加 PDF 缩略图支持

1. **创建 PDF 生成器**

```python
# services/thumbnail/pdf.py
from PIL import Image
import fitz  # PyMuPDF
from .generator import ThumbnailGenerator

class PDFThumbnailGenerator(ThumbnailGenerator):
    def generate(self, source_path, dest_path, size=(400, 400)):
        try:
            doc = fitz.open(source_path)
            page = doc.load_page(0)  # 第一页
            pix = page.get_pixmap()

            # 转换为 PIL Image
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            img.thumbnail(size, Image.Lanczos)

            self._ensure_dest_dir(dest_path)
            img.save(dest_path, "WEBP", quality=80)
            return True
        except Exception as e:
            logger.error(f"生成 PDF 缩略图失败: {e}")
            return False
```

2. **注册到工厂**

```python
# services/__init__.py
from .thumbnail import PDFThumbnailGenerator

def _register_services():
    # ... 其他注册 ...
    ThumbnailGeneratorFactory.register('document', PDFThumbnailGenerator())
```

3. **直接使用**

```python
# 无需修改路由代码，自动支持 PDF
ThumbnailGeneratorFactory.generate('document', 'file.pdf', 'thumb.webp')
```

## 性能优化建议

### 1. **缓存工厂实例**
工厂已实现单例模式，避免重复创建：
```python
# 工厂内部缓存
_extractors: Dict[str, MetadataExtractor] = {}
```

### 2. **并发处理**
对于批量任务，可并发调用：
```python
from concurrent.futures import ThreadPoolExecutor

with ThreadPoolExecutor(max_workers=4) as executor:
    futures = [
        executor.submit(ThumbnailGeneratorFactory.generate, asset_type, src, dst)
        for src, dst in assets
    ]
```

### 3. **异步队列**
对于耗时操作，建议使用 Celery 或 Redis Queue：
```python
@celery_app.task
def generate_thumbnail_task(asset_type, source, dest):
    return ThumbnailGeneratorFactory.generate(asset_type, source, dest)
```

## 测试示例

### 单元测试

```python
import pytest
from services.thumbnail import ImageThumbnailGenerator

def test_image_thumbnail_generation(tmp_path):
    """测试图片缩略图生成"""
    generator = ImageThumbnailGenerator()
    source = "tests/fixtures/sample.jpg"
    dest = tmp_path / "thumb.webp"

    success = generator.generate(source, str(dest), size=(200, 200))

    assert success is True
    assert dest.exists()
    # 验证尺寸
    with Image.open(dest) as img:
        assert max(img.size) <= 200
```

### 集成测试

```python
def test_factory_pattern():
    """测试工厂模式"""
    # 注册测试生成器
    class TestGenerator(ThumbnailGenerator):
        def generate(self, source, dest, size=(400, 400)):
            return True

    ThumbnailGeneratorFactory.register('test', TestGenerator())

    # 验证工厂能够创建实例
    generator = ThumbnailGeneratorFactory.create('test')
    assert generator is not None
    assert isinstance(generator, TestGenerator)
```

## 常见问题 (FAQ)

**Q: 为什么要拆分 HistorianService？**
A: 原 `HistorianService` 违反了单一职责原则，混合了扫描、元数据提取、缩略图生成三种职责，导致难以扩展和测试。

**Q: 工厂模式有什么好处？**
A: 工厂模式支持运行时动态选择实现，无需修改现有代码即可扩展新的素材类型。

**Q: 如何支持视频缩略图？**
A: 安装 `ffmpeg-python` 或 `opencv-python`，参考 `services/thumbnail/video.py` 中的 TODO 注释实现。

**Q: 旧代码会被删除吗？**
A: `historian.py` 已重命名为 `.deprecated`，保留用于向后兼容，建议尽快迁移到新架构。

## 相关资源

- [SOLID 原则详解](https://en.wikipedia.org/wiki/SOLID)
- [设计模式：工厂模式](https://refactoring.guru/design-patterns/factory-method)
- [Pillow 文档](https://pillow.readthedocs.io/)
- [exifread 文档](https://pypi.org/project/ExifRead/)
