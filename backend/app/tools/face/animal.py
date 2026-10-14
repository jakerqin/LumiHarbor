"""动物脸：AnyFace 扫脸 + COCO 补种类 + 768 维 embedding。"""
from typing import List, Optional, Tuple

import numpy as np
from PIL import Image

from ..utils import get_logger
from .download import ensure_animal_models
from .geometry import clamp_bbox
from .human import _onnx_providers, normalize_vec
from .image_io import resolve_model_dir, rgb_to_bgr
from .types import DetectedFace

logger = get_logger(__name__)

ANIMAL_DIM = 768
ANIMAL_EMBED_MODEL = "animal-onnx-768"
COCO_ANIMAL = {0: "person", 15: "cat", 16: "dog"}
FACE_CONF = 0.30
COCO_CONF = 0.35
NMS_IOU = 0.45
MIN_BBOX_SIDE = 0.04
PET_SPECIES = frozenset({"cat", "dog"})
# YOLOv5-face：xywh + obj + 10 点 + cls
FACE_COLS = 16


class AnimalFaceEngine:
    """脸检测 ONNX + COCO 补标 + embedding。缺脸模型则不可用。"""

    def __init__(self, model_dir: str):
        self._dir = resolve_model_dir(model_dir)
        self._face = None
        self._coco = None
        self._embed = None
        self._ready = False
        self._tried = False

    @property
    def available(self) -> bool:
        if not self._tried:
            self._prepare()
        return self._ready

    def detect(self, image: Image.Image) -> List[DetectedFace]:
        if not self.available:
            return []
        faces = self._detect_faces(image)
        coco = self._detect_coco(image) if self._coco is not None else []
        results: List[DetectedFace] = []
        width, height = image.size
        for box, score in faces:
            if box[2] / width < MIN_BBOX_SIDE or box[3] / height < MIN_BBOX_SIDE:
                continue
            species = _tag_species(box, coco)
            if species not in PET_SPECIES:
                continue
            crop = _crop_rgb(image, box)
            vector = self._embed_crop(crop)
            if vector is None:
                continue
            results.append(DetectedFace(
                subject_type="animal",
                bbox=box,
                embedding=vector,
                embedding_model=ANIMAL_EMBED_MODEL,
                det_score=score,
                quality_score=score,
                species=species,
            ))
        return results

    def _prepare(self) -> None:
        self._tried = True
        face_path, coco_path, embed_path = ensure_animal_models(self._dir)
        if not face_path or not embed_path:
            logger.warning("动物脸模型缺失，跳过（需 animal_face_det.onnx + animal_embed.onnx）")
            return
        try:
            import onnxruntime as ort
            providers = _onnx_providers()
            self._face = ort.InferenceSession(str(face_path), providers=providers)
            self._embed = ort.InferenceSession(str(embed_path), providers=providers)
            if coco_path:
                self._coco = ort.InferenceSession(str(coco_path), providers=providers)
            self._ready = True
            logger.info(f"动物脸 ONNX 已加载: {face_path.name}, {embed_path.name}")
        except Exception as exc:
            logger.warning(f"动物脸 ONNX 加载失败: {exc}")

    def _detect_faces(self, image: Image.Image) -> List[Tuple[tuple, float]]:
        out, ratio, pad = self._run_det(self._face, image)
        return _parse_face_yolo(out, image.size, ratio, pad)

    def _detect_coco(self, image: Image.Image) -> List[Tuple[tuple, float, str]]:
        out, ratio, pad = self._run_det(self._coco, image)
        return _parse_coco(out, image.size, ratio, pad)

    def _run_det(self, session, image: Image.Image):
        bgr = rgb_to_bgr(image)
        inp, ratio, pad = _letterbox(bgr, 640)
        tensor = inp.astype(np.float32) / 255.0
        tensor = np.transpose(tensor, (2, 0, 1))[None, ...]
        name = session.get_inputs()[0].name
        return session.run(None, {name: tensor})[0], ratio, pad

    def _embed_crop(self, crop: Image.Image) -> Optional[List[float]]:
        inp = self._embed.get_inputs()[0]
        shape = [d if isinstance(d, int) else 224 for d in inp.shape]
        size = shape[-1] if len(shape) >= 4 else 224
        arr = _preprocess_embed(crop, size)
        try:
            raw = self._embed.run(None, {inp.name: arr})[0]
        except Exception as exc:
            logger.warning(f"动物 embedding 失败: {exc}")
            return None
        if getattr(raw, "ndim", 1) == 3:
            raw = raw[:, 0, :]
        vec = normalize_vec(raw)
        if len(vec) != ANIMAL_DIM:
            logger.warning(f"动物 embedding 维度 {len(vec)} != {ANIMAL_DIM}")
            return None
        return vec


def _letterbox(bgr: np.ndarray, size: int) -> Tuple[np.ndarray, float, Tuple[float, float]]:
    h, w = bgr.shape[:2]
    ratio = min(size / h, size / w)
    nw, nh = int(round(w * ratio)), int(round(h * ratio))
    resized = _resize_bgr(bgr, nw, nh)
    canvas = np.full((size, size, 3), 114, dtype=np.uint8)
    dx, dy = (size - nw) / 2, (size - nh) / 2
    canvas[int(dy):int(dy) + nh, int(dx):int(dx) + nw] = resized
    return canvas, ratio, (dx, dy)


def _resize_bgr(bgr: np.ndarray, width: int, height: int) -> np.ndarray:
    import cv2
    return cv2.resize(bgr, (width, height), interpolation=cv2.INTER_LINEAR)


def _parse_face_yolo(output: np.ndarray, img_size, ratio: float, pad) -> list:
    pred = _squeeze_pred(output, FACE_COLS)
    if pred.size == 0 or pred.shape[1] < 6:
        return []
    boxes, scores = _split_face(pred)
    keep = _nms(boxes, scores, FACE_CONF)
    return _boxes_to_orig(boxes, scores, keep, img_size, ratio, pad)


def _parse_coco(output: np.ndarray, img_size, ratio: float, pad) -> list:
    pred = _squeeze_pred(output, 84)
    if pred.size == 0:
        return []
    boxes, scores, class_ids = _split_coco(pred)
    keep = _nms(boxes, scores, COCO_CONF)
    width, height = img_size
    results = []
    for i in keep:
        label = _coco_label(int(class_ids[i]))
        if not label:
            continue
        box = _xywh_to_orig(boxes[i], ratio, pad[0], pad[1], width, height)
        results.append((box, float(scores[i]), label))
    return results


def _coco_label(cls: int) -> Optional[str]:
    return COCO_ANIMAL.get(cls)


def _tag_species(face_box, coco_dets) -> Optional[str]:
    """动物框优先；只落在 person 框内则标 person，由 detect 丢掉（AnyFace 也会出人脸）。"""
    cx, cy = face_box[0] + face_box[2] / 2, face_box[1] + face_box[3] / 2
    hit_person = False
    best_animal = None
    best_area = 1e18
    for box, _score, label in coco_dets:
        if not _point_in_box(cx, cy, box):
            continue
        if label == "person":
            hit_person = True
            continue
        area = box[2] * box[3]
        if area < best_area:
            best_area = area
            best_animal = label
    if best_animal:
        return best_animal
    return "person" if hit_person else None


def _point_in_box(x: float, y: float, box) -> bool:
    bx, by, bw, bh = box
    return bx <= x <= bx + bw and by <= y <= by + bh


def _squeeze_pred(output: np.ndarray, min_cols: int) -> np.ndarray:
    pred = np.squeeze(output)
    if pred.ndim != 2:
        return np.zeros((0, min_cols))
    # 通道在前：(C, N) -> (N, C)。脸是 16 列，COCO YOLOv8 是 84。
    if pred.shape[0] < pred.shape[1] and pred.shape[0] <= 85:
        pred = pred.T
    return pred


def _split_face(pred: np.ndarray):
    """YOLOv5-face：score = obj × cls；landmarks 在 5:15，不参与框。"""
    xywh = pred[:, :4]
    obj = pred[:, 4]
    cls = pred[:, 15] if pred.shape[1] >= FACE_COLS else np.ones(len(pred))
    scores = obj * cls
    mask = scores >= FACE_CONF
    return xywh[mask], scores[mask]


def _split_coco(pred: np.ndarray):
    """YOLOv8 是 4+80=84 列（无 objectness）；YOLOv5 才是 4+1+80=85。"""
    xywh = pred[:, :4]
    if pred.shape[1] == 85:
        obj = pred[:, 4]
        cls_scores = pred[:, 5:]
        class_ids = np.argmax(cls_scores, axis=1)
        scores = obj * cls_scores[np.arange(len(pred)), class_ids]
    else:
        cls_scores = pred[:, 4:]
        class_ids = np.argmax(cls_scores, axis=1)
        scores = cls_scores[np.arange(len(pred)), class_ids]
    mask = scores >= COCO_CONF
    return xywh[mask], scores[mask], class_ids[mask]


def _boxes_to_orig(boxes, scores, keep, img_size, ratio, pad) -> list:
    width, height = img_size
    dx, dy = pad
    results = []
    for i in keep:
        box = _xywh_to_orig(boxes[i], ratio, dx, dy, width, height)
        results.append((box, float(scores[i])))
    return results


def _xywh_to_orig(xywh, ratio: float, dx: float, dy: float, width: int, height: int):
    cx, cy, w, h = [float(v) for v in xywh]
    x1 = (cx - w / 2 - dx) / ratio
    y1 = (cy - h / 2 - dy) / ratio
    bw = w / ratio
    bh = h / ratio
    x1i, y1i, x2i, y2i = clamp_bbox((x1, y1, bw, bh), width, height)
    return float(x1i), float(y1i), float(x2i - x1i), float(y2i - y1i)


def _nms(boxes: np.ndarray, scores: np.ndarray, conf: float) -> List[int]:
    if len(boxes) == 0:
        return []
    import cv2
    xyxy = []
    for cx, cy, w, h in boxes:
        xyxy.append([float(cx - w / 2), float(cy - h / 2), float(cx + w / 2), float(cy + h / 2)])
    idxs = cv2.dnn.NMSBoxes(xyxy, scores.tolist(), conf, NMS_IOU)
    if idxs is None or len(idxs) == 0:
        return []
    return [int(i) for i in np.array(idxs).flatten()]


def _crop_rgb(image: Image.Image, box) -> Image.Image:
    x1, y1, x2, y2 = clamp_bbox(box, image.size[0], image.size[1])
    return image.crop((x1, y1, x2, y2))


def _preprocess_embed(image: Image.Image, size: int) -> np.ndarray:
    resized = image.resize((size, size), Image.BILINEAR)
    arr = np.asarray(resized).astype(np.float32) / 255.0
    mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
    std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
    arr = (arr - mean) / std
    return np.transpose(arr, (2, 0, 1))[None, ...]


_engine: Optional[AnimalFaceEngine] = None


def get_animal_engine(model_dir: str) -> AnimalFaceEngine:
    global _engine
    if _engine is None:
        _engine = AnimalFaceEngine(model_dir)
    return _engine
