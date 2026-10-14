"""缩略图智能裁剪：兼容 smartcrop 新旧两种 score 格式"""
from PIL import Image

from app.services.thumbnail.image import ImageThumbnailGenerator


class _FakeSmartCrop:
    def __init__(self, score):
        self.score = score

    def crop(self, img, width, height):
        return {'top_crop': {'x': 100, 'y': 0, 'width': 600, 'height': 600, 'score': self.score}}


def _crop_with_score(score, monkeypatch):
    gen = ImageThumbnailGenerator()
    gen._smart_crop = _FakeSmartCrop(score)
    fallback_calls = []
    monkeypatch.setattr(gen, '_generate_simple_resize', lambda img, size: fallback_calls.append(size))
    thumb = gen._generate_smart_crop(Image.new('RGB', (800, 600)), (400, 400))
    return thumb, fallback_calls


def test_float_score_keeps_smart_crop(monkeypatch):
    """smartcrop 0.5 的 score 是浮点数，不能因为打日志失败而退回简单缩放"""
    thumb, fallback_calls = _crop_with_score(1.2e-05, monkeypatch)
    assert fallback_calls == []
    assert thumb.size == (400, 400)


def test_dict_score_keeps_smart_crop(monkeypatch):
    thumb, fallback_calls = _crop_with_score({'total': 0.5}, monkeypatch)
    assert fallback_calls == []
    assert thumb.size == (400, 400)
