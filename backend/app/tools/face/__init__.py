"""人脸 / 动物脸纯工具（无 FastAPI）。"""
from .geometry import iou, merge_detections
from .types import DetectedFace

__all__ = ["DetectedFace", "iou", "merge_detections"]
