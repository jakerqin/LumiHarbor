"""人脸后置过滤：低分小框丢掉，正脸留下。"""
from app.tools.face.human import _keep_human


def test_drops_iphone_lens_like_box():
    # 素材 29 face 66：0.54，约 3% 边长
    assert _keep_human((100, 100, 32, 33), 1000, 1000, 0.54) is False


def test_drops_low_score_even_if_large():
    assert _keep_human((10, 10, 200, 200), 1000, 1000, 0.55) is False


def test_drops_tiny_high_score():
    assert _keep_human((10, 10, 30, 30), 1000, 1000, 0.85) is False


def test_keeps_normal_face():
    assert _keep_human((200, 200, 120, 114), 1000, 1000, 0.85) is True
