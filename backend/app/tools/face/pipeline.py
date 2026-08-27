"""人 + 动物检测合并。"""
from typing import List

from PIL import Image

from ...config import settings
from .geometry import merge_detections
from .human import get_human_engine
from .image_io import load_rgb
from .types import DetectedFace


def detect_faces_in_image(
    image_path: str,
    include_human: bool = True,
    include_animal: bool = True,
) -> List[DetectedFace]:
    image = load_rgb(image_path)
    return detect_faces(image, include_human=include_human, include_animal=include_animal)


def detect_faces(
    image: Image.Image,
    include_human: bool = True,
    include_animal: bool = True,
) -> List[DetectedFace]:
    humans = get_human_engine(settings.FACE_MODEL_DIR).detect(image) if include_human else []
    animals = _detect_animals(image) if include_animal else []
    return merge_detections(humans, animals)


def _detect_animals(image: Image.Image) -> List[DetectedFace]:
    from .animal import get_animal_engine

    engine = get_animal_engine(settings.FACE_MODEL_DIR)
    if not engine.available:
        return []
    return engine.detect(image)
