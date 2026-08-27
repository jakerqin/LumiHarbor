"""InsightFace 人脸检测 + ArcFace 512 维。"""
from typing import List, Optional

import numpy as np
from PIL import Image

from ..utils import get_logger
from .geometry import clamp_bbox
from .image_io import resolve_model_dir, rgb_to_bgr
from .types import DetectedFace

logger = get_logger(__name__)

HUMAN_MODEL = "buffalo_s"
HUMAN_DIM = 512
# 默认 0.5 会把 iPhone 三摄等小圆点当成人脸
MIN_DET_SCORE = 0.62
MIN_BBOX_SIDE = 0.04


def _onnx_providers() -> list:
    try:
        import onnxruntime as ort
        available = ort.get_available_providers()
    except Exception:
        return ["CPUExecutionProvider"]
    providers = []
    if "CoreMLExecutionProvider" in available:
        providers.append("CoreMLExecutionProvider")
    providers.append("CPUExecutionProvider")
    return providers


def normalize_vec(vec: np.ndarray) -> List[float]:
    arr = np.asarray(vec, dtype=np.float32).flatten()
    norm = float(np.linalg.norm(arr))
    if norm > 0:
        arr = arr / norm
    return arr.tolist()


class HumanFaceEngine:
    """懒加载 buffalo_s，只在 Worker 检测路径调用。"""

    def __init__(self, model_dir: str):
        self._model_dir = model_dir
        self._app = None

    def _load(self):
        if self._app is not None:
            return
        from insightface.app import FaceAnalysis

        model_dir = resolve_model_dir(self._model_dir)
        model_dir.mkdir(parents=True, exist_ok=True)
        # FaceAnalysis 拼 root/models/<name>，让 buffalo_s 落在 FACE_MODEL_DIR 下
        app = FaceAnalysis(
            name=HUMAN_MODEL,
            root=str(model_dir.parent),
            providers=_onnx_providers(),
        )
        app.prepare(ctx_id=0, det_size=(640, 640), det_thresh=MIN_DET_SCORE)
        self._app = app
        logger.info(f"InsightFace buffalo_s 已加载: {model_dir / HUMAN_MODEL}")

    def detect(self, image: Image.Image) -> List[DetectedFace]:
        self._load()
        bgr = rgb_to_bgr(image)
        raw_faces = self._app.get(bgr)
        width, height = image.size
        results: List[DetectedFace] = []
        for face in raw_faces:
            bbox = _pixel_bbox(face.bbox, width, height)
            embedding = getattr(face, "embedding", None)
            if embedding is None or len(embedding) != HUMAN_DIM:
                continue
            score = float(getattr(face, "det_score", 0.0) or 0.0)
            if not _keep_human(bbox, width, height, score):
                continue
            results.append(DetectedFace(
                subject_type="human",
                bbox=bbox,
                embedding=normalize_vec(embedding),
                embedding_model=HUMAN_MODEL,
                det_score=score,
                quality_score=score,
            ))
        return results


def _keep_human(bbox: tuple, width: int, height: int, det_score: float) -> bool:
    if det_score < MIN_DET_SCORE or width <= 0 or height <= 0:
        return False
    _, _, box_w, box_h = bbox
    return (box_w / width) >= MIN_BBOX_SIDE and (box_h / height) >= MIN_BBOX_SIDE


def _pixel_bbox(raw, width: int, height: int) -> tuple:
    x1, y1, x2, y2 = [float(v) for v in raw[:4]]
    box = (x1, y1, max(1.0, x2 - x1), max(1.0, y2 - y1))
    x1i, y1i, x2i, y2i = clamp_bbox(box, width, height)
    return (float(x1i), float(y1i), float(x2i - x1i), float(y2i - y1i))


_engine: Optional[HumanFaceEngine] = None


def get_human_engine(model_dir: str) -> HumanFaceEngine:
    global _engine
    if _engine is None:
        _engine = HumanFaceEngine(model_dir)
    return _engine
