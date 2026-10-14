"""人脸 / 动物框合并。"""
from PIL import Image

from app.tools.face.geometry import crop_face, iou, merge_detections
from app.tools.face.types import DetectedFace


def _face(subject: str, bbox, species=None, det_score=0.9) -> DetectedFace:
    return DetectedFace(
        subject_type=subject,
        bbox=bbox,
        embedding=[0.1, 0.2],
        embedding_model="test",
        det_score=det_score,
        species=species,
    )


def test_iou_overlap():
    assert iou((0, 0, 10, 10), (5, 5, 10, 10)) == 25 / 175
    assert iou((0, 0, 10, 10), (20, 20, 5, 5)) == 0


def test_merge_drops_animal_on_human_face():
    human = _face("human", (10, 10, 40, 40))
    animal = _face("animal", (12, 12, 36, 36), "dog")
    merged = merge_detections([human], [animal])
    assert [item.subject_type for item in merged] == ["human"]


def test_merge_keeps_distant_animal():
    human = _face("human", (0, 0, 20, 20))
    animal = _face("animal", (80, 80, 20, 20), "cat")
    merged = merge_detections([human], [animal])
    assert [item.subject_type for item in merged] == ["human", "animal"]


def test_merge_drops_lower_score_when_human_inside_animal():
    # 素材 20：熊脸被认成人，动物分更高
    human = _face("human", (40, 33, 10, 20), det_score=0.68)
    animal = _face("animal", (20, 24, 43, 75), "bear", det_score=0.93)
    merged = merge_detections([human], [animal])
    assert [item.subject_type for item in merged] == ["animal"]


def test_crop_face_pads_beyond_box():
    image = Image.new("RGB", (100, 100), "white")
    tight = crop_face(image, (40, 40, 20, 20), padding=0)
    padded = crop_face(image, (40, 40, 20, 20), padding=0.35)
    assert padded.size[0] > tight.size[0]
    assert padded.size[1] > tight.size[1]


def test_merge_keeps_higher_human_when_inside_animal():
    human = _face("human", (40, 33, 10, 20), det_score=0.88)
    animal = _face("animal", (20, 24, 43, 75), "dog", det_score=0.47)
    merged = merge_detections([human], [animal])
    assert [item.subject_type for item in merged] == ["human"]
