"""框运算：IoU、归一化、裁剪。"""
from typing import List, Sequence, Tuple

from PIL import Image

from .types import BBox, DetectedFace


# 人脸框有一半以上落在动物框内，视为同一主体，留分数高的
CONTAIN_RATIO = 0.5


def iou(left: BBox, right: BBox) -> float:
    inter = _intersection_area(left, right)
    if inter <= 0:
        return 0.0
    union = left[2] * left[3] + right[2] * right[3] - inter
    return inter / union if union > 0 else 0.0


def containment_ratio(inner: BBox, outer: BBox) -> float:
    area = inner[2] * inner[3]
    if area <= 0:
        return 0.0
    return _intersection_area(inner, outer) / area


def merge_detections(
    humans: Sequence[DetectedFace],
    animals: Sequence[DetectedFace],
    iou_threshold: float = 0.4,
) -> List[DetectedFace]:
    """人脸大部分落在动物框内时留高分；其余仍是 IoU 高则丢动物。"""
    humans, animals = _resolve_contained(list(humans), list(animals))
    kept = list(humans)
    for animal in animals:
        overlap = any(iou(animal.bbox, human.bbox) >= iou_threshold for human in humans)
        if not overlap:
            kept.append(animal)
    return kept


def _intersection_area(left: BBox, right: BBox) -> float:
    ax, ay, aw, ah = left
    bx, by, bw, bh = right
    x1 = max(ax, bx)
    y1 = max(ay, by)
    x2 = min(ax + aw, bx + bw)
    y2 = min(ay + ah, by + bh)
    return max(0.0, x2 - x1) * max(0.0, y2 - y1)


def _resolve_contained(
    humans: List[DetectedFace],
    animals: List[DetectedFace],
) -> Tuple[List[DetectedFace], List[DetectedFace]]:
    drop_human = set()
    drop_animal = set()
    for i, human in enumerate(humans):
        for j, animal in enumerate(animals):
            if containment_ratio(human.bbox, animal.bbox) < CONTAIN_RATIO:
                continue
            if (human.det_score or 0) >= (animal.det_score or 0):
                drop_animal.add(j)
            else:
                drop_human.add(i)
    humans = [item for i, item in enumerate(humans) if i not in drop_human]
    animals = [item for j, item in enumerate(animals) if j not in drop_animal]
    return humans, animals


def clamp_bbox(bbox: BBox, width: int, height: int) -> Tuple[int, int, int, int]:
    x, y, w, h = bbox
    x1 = max(0, min(int(x), width - 1))
    y1 = max(0, min(int(y), height - 1))
    x2 = max(x1 + 1, min(int(x + w), width))
    y2 = max(y1 + 1, min(int(y + h), height))
    return x1, y1, x2, y2


def normalize_bbox(bbox: BBox, width: int, height: int) -> BBox:
    if width <= 0 or height <= 0:
        return (0.0, 0.0, 0.0, 0.0)
    x, y, w, h = bbox
    return (x / width, y / height, w / width, h / height)


def crop_face(image: Image.Image, bbox: BBox, padding: float = 0.32) -> Image.Image:
    width, height = image.size
    x, y, w, h = bbox
    pad_x = w * padding
    pad_y = h * padding
    x1, y1, x2, y2 = clamp_bbox((x - pad_x, y - pad_y, w + 2 * pad_x, h + 2 * pad_y), width, height)
    return image.crop((x1, y1, x2, y2))
