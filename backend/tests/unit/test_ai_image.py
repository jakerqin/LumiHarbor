"""AI 修图 / 生图：预设、尺寸、任务流转、版本切换、接口错误码（OpenAI 调用全部 mock）"""
import asyncio
import io
from unittest.mock import MagicMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from PIL import Image

from app import model
from app.routers import ai_image as ai_router
from app.services.ai_image import AiImageDisabled, AiImageError, AiImageLimitExceeded, service, versions
from app.services.ai_image.client import edit_size
from app.services.ai_image.presets import KEEP_IDENTITY, build_prompt

ORIGINAL = "original/ab/photo.jpg"
THUMB = "processed/thumbnails/1_thumbnail.webp"


def _png(color=(200, 50, 50), size=(64, 48)) -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", size, color).save(buffer, format="PNG")
    return buffer.getvalue()


@pytest.fixture
def nas(tmp_path, monkeypatch):
    for key, value in {"NAS_DATA_PATH": str(tmp_path), "OPENAI_API_KEY": "sk-test", "PUBLIC_BASE_URL": "",
                       "AI_IMAGE_DAILY_LIMIT": 50}.items():
        monkeypatch.setattr(f"app.config.settings.{key}", value)
    for rel, color in ((ORIGINAL, (10, 10, 10)), (THUMB, (20, 20, 20))):
        path = tmp_path / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        Image.new("RGB", (400, 300), color).save(path)
    return tmp_path


@pytest.fixture
def asset(sqlite_db, nas):
    row = model.Asset(id=1, original_path=ORIGINAL, thumbnail_path=THUMB, asset_type="image", created_by=1)
    sqlite_db.add(row)
    sqlite_db.commit()
    return row


def _run(db, job_id, png=None, error=None):
    async def fake_call(prompt, images, size, quality):
        if error:
            raise error
        return png or _png()
    with patch("app.services.ai_image.client.call_images_api", side_effect=fake_call) as call:
        asyncio.run(service.run_job(db, job_id))
    return call


# ---------- 预设与尺寸 ----------

def test_edit_prompt_always_keeps_identity():
    assert build_prompt("edit", "enhance", None).endswith(KEEP_IDENTITY)
    assert KEEP_IDENTITY not in build_prompt("generate", "hand_drawn", "一只猫")


@pytest.mark.parametrize("args, message", [
    (("edit", "remove_objects", ""), "需要补充描述"),
    (("edit", None, ""), "请选择预设或填写描述"),
    (("edit", "greeting_card", "中秋"), "不能用于修图"),
    (("edit", "nope", "x"), "未知预设"),
])
def test_prompt_validation(args, message):
    with pytest.raises(ValueError, match=message):
        build_prompt(*args)


@pytest.mark.parametrize("w, h, tier, expected", [
    (4032, 3024, "standard", "1536x1152"),
    (3024, 4032, "hq", "1536x2048"),
    (1000, 5000, "standard", "512x1536"),  # 超过 1:3 被夹住
])
def test_edit_size_keeps_ratio_and_multiple_of_16(w, h, tier, expected):
    assert edit_size(w, h, tier) == expected


# ---------- 建任务校验 ----------

def test_disabled_when_switch_off_or_no_key(sqlite_db, asset, monkeypatch):
    sqlite_db.add(model.TaskDefinition(task_code="ai_image", name="AI", is_enabled=False))
    sqlite_db.commit()
    with pytest.raises(AiImageDisabled):
        service.create_job(sqlite_db, job_type="edit", user_id=1, asset_id=1, preset_code="enhance")
    sqlite_db.query(model.TaskDefinition).update({"is_enabled": True})
    monkeypatch.setattr("app.config.settings.OPENAI_API_KEY", "")
    with pytest.raises(AiImageDisabled):
        service.create_job(sqlite_db, job_type="edit", user_id=1, asset_id=1, preset_code="enhance")


def test_daily_limit(sqlite_db, asset, monkeypatch):
    monkeypatch.setattr("app.config.settings.AI_IMAGE_DAILY_LIMIT", 1)
    service.create_job(sqlite_db, job_type="edit", user_id=1, asset_id=1, preset_code="enhance")
    with pytest.raises(AiImageLimitExceeded):
        service.create_job(sqlite_db, job_type="edit", user_id=1, asset_id=1, preset_code="enhance")


def test_edit_rejects_video_and_computes_size(sqlite_db, asset):
    sqlite_db.add(model.Asset(id=2, original_path="v.mov", asset_type="video", created_by=1))
    sqlite_db.commit()
    with pytest.raises(ValueError, match="只支持图片"):
        service.create_job(sqlite_db, job_type="edit", user_id=1, asset_id=2, preset_code="enhance")
    job = service.create_job(sqlite_db, job_type="edit", user_id=1, asset_id=1, preset_code="enhance", tier="hq")
    assert (job.size, job.quality, job.status) == ("2048x1536", "high", "pending")


def test_generate_rejects_too_many_references(sqlite_db, asset):
    with pytest.raises(ValueError, match="最多 4 张"):
        service.create_job(sqlite_db, job_type="generate", user_id=1, prompt="猫",
                           reference_asset_ids=[1, 2, 3, 4, 5])


# ---------- 执行与版本 ----------

def test_edit_job_creates_version_without_switching(sqlite_db, asset, nas):
    job = service.create_job(sqlite_db, job_type="edit", user_id=1, asset_id=1, preset_code="enhance")
    call = _run(sqlite_db, job.id)

    sqlite_db.refresh(job)
    assert job.status == "success" and job.result_version_id
    prompt, images, size, quality = call.call_args.args
    assert len(images) == 1 and size == job.size and quality == "medium"
    rows = versions.list_versions(sqlite_db, 1)
    assert [v.kind for v in rows] == ["original", "ai_edit"]
    assert (nas / rows[1].file_path).exists() and (nas / rows[1].thumbnail_path).exists()
    # 不自动切换，原图不动
    assert (asset.current_version_id, asset.thumbnail_path) == (None, THUMB)


def test_switch_versions_and_back(sqlite_db, asset):
    job = service.create_job(sqlite_db, job_type="edit", user_id=1, asset_id=1, preset_code="enhance")
    _run(sqlite_db, job.id)
    edited = versions.list_versions(sqlite_db, 1)[1]

    versions.set_current(sqlite_db, asset, edited.id)
    assert (asset.current_version_id, asset.thumbnail_path, asset.preview_path) == (
        edited.id, edited.thumbnail_path, edited.file_path)

    versions.set_current(sqlite_db, asset, None)
    assert (asset.current_version_id, asset.thumbnail_path, asset.preview_path) == (None, THUMB, None)
    assert asset.original_path == ORIGINAL


def test_delete_current_version_falls_back_to_original(sqlite_db, asset, nas):
    job = service.create_job(sqlite_db, job_type="edit", user_id=1, asset_id=1, preset_code="enhance")
    _run(sqlite_db, job.id)
    edited = versions.list_versions(sqlite_db, 1)[1]
    versions.set_current(sqlite_db, asset, edited.id)

    versions.delete_version(sqlite_db, asset, edited.id)

    assert (asset.current_version_id, asset.thumbnail_path) == (None, THUMB)
    assert not (nas / edited.file_path).exists()
    assert [v.kind for v in versions.list_versions(sqlite_db, 1)] == ["original"]
    with pytest.raises(versions.VersionError):
        versions.delete_version(sqlite_db, asset, versions.list_versions(sqlite_db, 1)[0].id)


def test_second_edit_uses_current_version_as_input(sqlite_db, asset, nas):
    job = service.create_job(sqlite_db, job_type="edit", user_id=1, asset_id=1, preset_code="enhance")
    _run(sqlite_db, job.id, png=_png((0, 255, 0)))
    versions.set_current(sqlite_db, asset, versions.list_versions(sqlite_db, 1)[1].id)

    job2 = service.create_job(sqlite_db, job_type="edit", user_id=1, asset_id=1, preset_code="film_look")
    call = _run(sqlite_db, job2.id)
    sent = Image.open(io.BytesIO(call.call_args.args[1][0]))
    r, g, b = sent.getpixel((0, 0))
    assert g > 240 and r < 15 and b < 15  # 发出去的是上一次修好的绿色版本（webp 有损，取近似）


@pytest.mark.parametrize("error, expected", [
    (AiImageError("内容被 OpenAI 安全审核拦截"), "内容被 OpenAI 安全审核拦截"),
    (RuntimeError("boom /secret/path"), service.GENERIC_FAILURE),
])
def test_failed_job_records_user_facing_reason(sqlite_db, asset, error, expected):
    job = service.create_job(sqlite_db, job_type="edit", user_id=1, asset_id=1, preset_code="enhance")
    _run(sqlite_db, job.id, error=error)
    sqlite_db.refresh(job)
    assert (job.status, job.error_message) == ("failed", expected)
    assert versions.list_versions(sqlite_db, 1) == []


def test_generate_job_imports_asset_with_ai_tag(sqlite_db, asset):
    def fake_import_service(config):
        fake = MagicMock()

        def do_import():
            sqlite_db.add(model.Asset(id=9, original_path="original/zz/ai.png", asset_type="image", created_by=1))
            sqlite_db.commit()
            fake.imported_asset_ids = [9]
        fake.import_assets.side_effect = do_import
        return fake

    job = service.create_job(sqlite_db, job_type="generate", user_id=1, preset_code="hand_drawn",
                             prompt="一只猫", size="portrait", reference_asset_ids=[1])
    with patch.object(service, "AssetImportService", side_effect=fake_import_service):
        call = _run(sqlite_db, job.id)

    sqlite_db.refresh(job)
    assert (job.status, job.result_asset_id, job.size) == ("success", 9, "1024x1536")
    assert len(call.call_args.args[1]) == 1  # 参考图作为输入
    tag = sqlite_db.query(model.AssetTag).filter_by(asset_id=9, tag_key="ai_generated").one()
    assert tag.tag_value == "1"


# ---------- 接口 ----------

@pytest.fixture
def api(sqlite_db):
    app = FastAPI()
    app.include_router(ai_router.router)
    app.dependency_overrides[ai_router.get_db] = lambda: sqlite_db
    return TestClient(app)


def test_api_error_codes(api, sqlite_db, asset, monkeypatch):
    with patch.object(ai_router, "run_coroutine_sync"), patch.object(ai_router, "ai_image_task"):
        assert api.post("/ai-image/jobs", json={"job_type": "edit", "asset_id": 1}).status_code == 400
        monkeypatch.setattr("app.config.settings.AI_IMAGE_DAILY_LIMIT", 1)
        assert api.post("/ai-image/jobs", json={"job_type": "edit", "asset_id": 1,
                                                "preset_code": "enhance"}).status_code == 200
        assert api.post("/ai-image/jobs", json={"job_type": "edit", "asset_id": 1,
                                                "preset_code": "enhance"}).status_code == 429
    monkeypatch.setattr("app.config.settings.OPENAI_API_KEY", "")
    assert api.post("/ai-image/jobs", json={"job_type": "edit", "asset_id": 1}).status_code == 403
    assert api.get("/ai-image/status").json()["result"]["enabled"] is False


def test_api_marks_job_failed_when_queue_down(api, asset):
    with patch.object(ai_router, "run_coroutine_sync", side_effect=ConnectionError("redis down")), \
            patch.object(ai_router, "ai_image_task"):
        result = api.post("/ai-image/jobs", json={"job_type": "edit", "asset_id": 1,
                                                  "preset_code": "enhance"}).json()["result"]
    assert result["status"] == "failed" and "任务队列" in result["error_message"]


def test_api_versions_for_untouched_asset(api, asset):
    result = api.get("/assets/1/versions").json()["result"]
    assert result["current_version_id"] is None
    assert [(v["kind"], v["is_current"]) for v in result["versions"]] == [("original", True)]
