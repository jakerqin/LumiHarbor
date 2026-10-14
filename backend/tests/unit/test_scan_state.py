"""扫描：同一时间只允许一个、进度可查、后台任务自己开会话"""
from unittest.mock import MagicMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.routers.ingestion import scan as scan_router
from app.services.ingestion.scan_state import ScanState
from app.services.ingestion.statistics import ImportStatistics


def test_only_one_scan_at_a_time():
    state = ScanState()
    assert state.try_start("/a")
    assert not state.try_start("/b")
    state.finish()
    assert state.try_start("/b")


def test_snapshot_follows_live_statistics():
    state = ScanState()
    assert state.snapshot()["status"] == "idle"
    state.try_start("/a")
    stats = ImportStatistics(total=3)
    state.attach(stats)
    stats.record_success()
    stats.record_failure("x.jpg", "坏文件")
    snap = state.snapshot()
    assert (snap["status"], snap["total"], snap["imported"], snap["failed"]) == ("scanning", 3, 1, 1)
    assert snap["failed_files"] == [{"path": "x.jpg", "error": "坏文件"}]
    state.finish(error="RuntimeError")
    assert state.snapshot()["status"] == "failed"


@pytest.fixture
def client(tmp_path, monkeypatch):
    state = ScanState()
    monkeypatch.setattr(scan_router, "scan_state", state)
    monkeypatch.setattr(scan_router.settings, "NAS_DATA_PATH", str(tmp_path))
    app = FastAPI()
    app.include_router(scan_router.router)
    app.dependency_overrides[scan_router.get_db] = lambda: MagicMock()
    return TestClient(app), state


def test_second_scan_returns_409(client, monkeypatch):
    http, state = client
    # 后台任务什么都不做 → 扫描一直处于 scanning
    monkeypatch.setattr(scan_router, "_run_import_task", lambda *a, **k: None)
    assert http.post("/ingestion/scan", json={}).status_code == 200
    assert http.post("/ingestion/scan", json={}).status_code == 409
    assert http.get("/ingestion/scan/status").json()["result"]["status"] == "scanning"


def test_invalid_request_does_not_take_the_slot(client):
    http, state = client
    resp = http.post("/ingestion/scan", json={"source_path": "/not/exist"})
    assert resp.status_code == 404
    assert state.snapshot()["status"] == "idle"


def test_task_uses_own_session_and_marks_finished(client, monkeypatch):
    http, state = client
    session = MagicMock()
    monkeypatch.setattr(scan_router, "SessionLocal", lambda: session)
    service = MagicMock()
    service.statistics = ImportStatistics(total=1, imported=1)
    service.import_assets.return_value = service.statistics
    monkeypatch.setattr(scan_router, "AssetImportService", lambda config: service)

    assert http.post("/ingestion/scan", json={}).status_code == 200
    result = http.get("/ingestion/scan/status").json()["result"]
    assert (result["status"], result["imported"]) == ("completed", 1)
    session.close.assert_called_once()


def test_task_failure_marks_failed_without_details(client, monkeypatch):
    http, state = client
    monkeypatch.setattr(scan_router, "SessionLocal", MagicMock)

    def boom(config):
        raise RuntimeError("/Users/secret/path 打不开")
    monkeypatch.setattr(scan_router, "AssetImportService", boom)

    http.post("/ingestion/scan", json={})
    result = http.get("/ingestion/scan/status").json()["result"]
    assert result["status"] == "failed"
    assert "secret" not in result["error"]
