"""名单校验。"""
import pytest

from app.services.subject import _center_inside, _filter_for_subject, _pixel_bbox, _validate_kind
from app.tools.face.types import DetectedFace


def test_validate_pet_requires_species():
    with pytest.raises(ValueError):
        _validate_kind("pet", None)
    assert _validate_kind("pet", "cat") == ("pet", "cat")
    assert _validate_kind("human", "cat") == ("human", None)


def test_filter_for_subject_keeps_matching_kind():
    human = DetectedFace("human", (0, 0, 10, 10), [0.1], "m", 0.9)
    cat = DetectedFace("animal", (0, 0, 10, 10), [0.1], "m", 0.9, species="cat")
    dog = DetectedFace("animal", (0, 0, 10, 10), [0.1], "m", 0.9, species="dog")
    subject = type("S", (), {"kind": "pet", "species": "cat"})()
    assert _filter_for_subject([human, cat, dog], subject) == [cat]


def test_pixel_bbox_and_center():
    assert _pixel_bbox((0.1, 0.2, 0.3, 0.4), (100, 200)) == (10.0, 40.0, 30.0, 80.0)
    assert _center_inside((20, 20, 10, 10), (0, 0, 40, 40))
    assert not _center_inside((80, 80, 10, 10), (0, 0, 40, 40))
