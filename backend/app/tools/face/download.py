"""按需下载动物脸检测 / COCO 补标 / embedding ONNX（不进 Git）。"""
from pathlib import Path
from typing import Optional

from ..utils import get_logger

logger = get_logger(__name__)

# 种类补标仍用官方 YOLOv8n COCO；不要换成 YOLO26。
COCO_URLS = (
    "https://github.com/ultralytics/assets/releases/download/v8.4.0/yolov8n.onnx",
)
# 768 维个体 embedding；缺省拉 DINOv2-base
EMBED_URLS = (
    "https://huggingface.co/onnx-community/dinov2-base-onnx/resolve/main/onnx/model.onnx",
)

ANIMAL_FACE_DET_NAME = "animal_face_det.onnx"
COCO_DET_NAME = "coco_det.onnx"
ANIMAL_EMBED_NAME = "animal_embed.onnx"
# 旧全身检测文件，仅作 coco_det 缺省拷贝源
LEGACY_DET_NAME = "animal_det.onnx"


def ensure_file(dest: Path, urls: tuple, timeout: int = 60) -> Optional[Path]:
    if dest.exists() and dest.stat().st_size > 1000:
        return dest
    dest.parent.mkdir(parents=True, exist_ok=True)
    for url in urls:
        try:
            import urllib.request
            logger.info(f"下载模型: {url} -> {dest}")
            urllib.request.urlretrieve(url, dest)
            if dest.exists() and dest.stat().st_size > 1000:
                return dest
        except Exception as exc:
            logger.warning(f"下载失败 {url}: {exc}")
            if dest.exists():
                dest.unlink(missing_ok=True)
    return None


def ensure_animal_models(model_dir: Path) -> tuple[Optional[Path], Optional[Path], Optional[Path]]:
    """返回 (动物脸检测, COCO 补标, embedding)。脸检测无稳定直链，需本地已导出。"""
    face = _ensure_face_det(model_dir)
    coco = _ensure_coco_det(model_dir)
    embed = _ensure_embed(model_dir)
    return face, coco, embed


def _ensure_face_det(model_dir: Path) -> Optional[Path]:
    dest = model_dir / ANIMAL_FACE_DET_NAME
    if dest.exists() and dest.stat().st_size > 1_000_000:
        return dest
    logger.warning(
        f"缺少 {ANIMAL_FACE_DET_NAME}（AnyFace YOLOv5-face 导出，需放到 {model_dir}）"
    )
    return None


def _ensure_coco_det(model_dir: Path) -> Optional[Path]:
    dest = model_dir / COCO_DET_NAME
    if dest.exists() and dest.stat().st_size > 1000:
        return dest
    legacy = model_dir / LEGACY_DET_NAME
    if legacy.exists() and legacy.stat().st_size > 1000:
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(legacy.read_bytes())
        return dest
    return ensure_file(dest, COCO_URLS)


def _ensure_embed(model_dir: Path) -> Optional[Path]:
    dest = model_dir / ANIMAL_EMBED_NAME
    if dest.exists() and dest.stat().st_size > 1000:
        return dest
    return ensure_file(dest, EMBED_URLS)
