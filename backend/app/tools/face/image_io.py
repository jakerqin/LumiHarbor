"""读图为 RGB PIL / BGR numpy，供检测引擎使用。"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps


def load_rgb(path: str) -> Image.Image:
    image = Image.open(path)
    image = ImageOps.exif_transpose(image) or image
    if image.mode != "RGB":
        image = image.convert("RGB")
    return image


def rgb_to_bgr(image: Image.Image) -> np.ndarray:
    arr = np.asarray(image)
    return arr[:, :, ::-1].copy()


def resolve_model_dir(model_dir: str) -> Path:
    path = Path(model_dir).expanduser()
    if not path.is_absolute():
        path = Path(__file__).resolve().parents[3] / path
    return path
