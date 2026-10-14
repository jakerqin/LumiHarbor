"""AnyFace 脸解析 + COCO 补标。"""
import numpy as np

from app.tools.face.animal import (
    FACE_COLS,
    PET_SPECIES,
    _parse_face_yolo,
    _split_coco,
    _split_face,
    _squeeze_pred,
    _tag_species,
)


def test_split_face_uses_obj_times_cls():
    pred = np.zeros((2, FACE_COLS), dtype=np.float32)
    pred[0, :4] = [100, 120, 40, 40]
    pred[0, 4] = 0.9
    pred[0, 15] = 0.8
    pred[1, :4] = [10, 10, 20, 20]
    pred[1, 4] = 0.2
    pred[1, 15] = 0.9
    boxes, scores = _split_face(pred)
    assert len(boxes) == 1
    assert scores[0] > 0.7


def test_split_coco_v8_keeps_cat_without_objectness():
    pred = np.zeros((2, 84), dtype=np.float32)
    pred[0, :4] = [100, 120, 80, 90]
    pred[0, 4 + 15] = 0.88
    pred[1, :4] = [10, 10, 20, 20]
    pred[1, 4 + 0] = 0.80
    _, scores, class_ids = _split_coco(pred)
    assert list(class_ids) == [15, 0]
    assert scores[0] > 0.85


def test_squeeze_transposes_channel_first():
    raw = np.zeros((1, FACE_COLS, 100), dtype=np.float32)
    raw[0, 4, 0] = 0.9
    raw[0, 15, 0] = 1.0
    pred = _squeeze_pred(raw, FACE_COLS)
    assert pred.shape == (100, FACE_COLS)
    _, scores = _split_face(pred)
    assert scores[0] > 0.85


def test_squeeze_transposes_coco_84():
    raw = np.zeros((1, 84, 100), dtype=np.float32)
    raw[0, 4 + 15, 0] = 0.9
    pred = _squeeze_pred(raw, 84)
    assert pred.shape == (100, 84)
    _, scores, class_ids = _split_coco(pred)
    assert list(class_ids) == [15]
    assert scores[0] > 0.85


def test_tag_species_prefers_animal_over_person():
    face = (40, 40, 20, 20)
    coco = [
        ((10, 10, 80, 80), 0.9, "person"),
        ((30, 30, 40, 40), 0.8, "dog"),
    ]
    assert _tag_species(face, coco) == "dog"


def test_tag_species_person_only():
    face = (40, 40, 20, 20)
    coco = [((10, 10, 80, 80), 0.9, "person")]
    assert _tag_species(face, coco) == "person"


def test_tag_species_none_when_no_body():
    face = (5, 5, 10, 10)
    coco = [((80, 80, 20, 20), 0.9, "cat")]
    assert _tag_species(face, coco) is None


def test_parse_face_empty():
    assert _parse_face_yolo(np.zeros((0,)), (100, 100), 1.0, (0, 0)) == []


def test_pet_species_only_cat_dog():
    assert PET_SPECIES == frozenset({"cat", "dog"})
    assert _tag_species((40, 40, 20, 20), [((10, 10, 80, 80), 0.9, "bear")]) == "bear"
    assert "bear" not in PET_SPECIES
