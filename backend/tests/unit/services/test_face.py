"""脸检索编排（不连真实模型 / Qdrant）。"""
from types import SimpleNamespace

from datetime import date, datetime

from app.services.face import FaceService, match_detections, shot_range_bounds
from app.services.vector_store import collection_for_subject
from app.tools.face.types import DetectedFace
import pytest


def test_collection_routing():
    assert collection_for_subject("human") == "subjects_human"
    assert collection_for_subject("pet") == "subjects_pet"
    assert collection_for_subject("animal") == "subjects_pet"
    with pytest.raises(ValueError):
        collection_for_subject("clip")


def test_match_detections_keeps_best_per_subject(monkeypatch):
    class FakeStore:
        def search(self, kind, vector, limit, thresh):
            return [{"id": 1, "score": 0.9, "payload": {"subject_id": 7}}]

    monkeypatch.setattr("app.services.face.VectorStore.instance", classmethod(lambda cls: FakeStore()))
    first = DetectedFace("human", (0, 0, 10, 10), [0.1], "m", 0.4)
    second = DetectedFace("human", (1, 1, 12, 12), [0.2], "m", 0.8)
    kept = match_detections([first, second])
    assert len(kept) == 1
    assert kept[0].subject_id == 7
    assert kept[0].det_score == 0.8


def test_match_detections_drops_miss(monkeypatch):
    class FakeStore:
        def search(self, kind, vector, limit, thresh):
            return []

    monkeypatch.setattr("app.services.face.VectorStore.instance", classmethod(lambda cls: FakeStore()))
    det = DetectedFace("human", (0, 0, 10, 10), [0.1], "m", 0.9)
    assert match_detections([det]) == []


def test_resolve_infer_path_prefers_preview(tmp_path, monkeypatch):
    from app.config import settings
    from app.services.face import FaceService

    monkeypatch.setattr(settings, "NAS_DATA_PATH", str(tmp_path))
    (tmp_path / "t.webp").write_bytes(b"t")
    (tmp_path / "p.webp").write_bytes(b"p")
    asset = SimpleNamespace(thumbnail_path="t.webp", preview_path="p.webp", original_path=None)
    assert FaceService.resolve_infer_path(asset).endswith("p.webp")


def test_resolve_infer_path_skips_video_original(tmp_path, monkeypatch):
    from app.config import settings
    from app.services.face import FaceService

    monkeypatch.setattr(settings, "NAS_DATA_PATH", str(tmp_path))
    (tmp_path / "clip.MOV").write_bytes(b"x")
    (tmp_path / "t.webp").write_bytes(b"t")
    asset = SimpleNamespace(thumbnail_path="t.webp", preview_path=None, original_path="clip.MOV")
    assert FaceService.resolve_infer_path(asset).endswith("t.webp")


def test_shot_range_bounds_inclusive_end():
    start, end = shot_range_bounds(date(2024, 1, 1), date(2024, 1, 31))
    assert start == datetime(2024, 1, 1)
    assert end == datetime(2024, 2, 1)
    assert shot_range_bounds(None, None) == (None, None)
