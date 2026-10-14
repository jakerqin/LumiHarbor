"""回收站：走真实的删除流程，再列出、恢复、到期清理"""
import os
from datetime import datetime, timedelta
from unittest.mock import patch

import pytest

from app import model
from app.services.asset import AssetService
from app.services.trash import TrashService, purge_expired
from app.services.trash import service as trash_service

ORIGINAL = "original/ab/abc_photo.jpg"
THUMB = "processed/thumbnails/1_thumbnail.webp"


@pytest.fixture
def nas(tmp_path, monkeypatch):
    monkeypatch.setattr("app.config.settings.NAS_DATA_PATH", str(tmp_path))
    monkeypatch.setattr("app.config.settings.RECYCLE_RETENTION_DAYS", 90)
    monkeypatch.setattr("app.config.settings.PUBLIC_BASE_URL", "")
    # 删除流程里的外部依赖：向量库、Redis 字典缓存、语义向量任务
    with patch("app.services.vector_store.VectorStore.instance"), \
            patch("app.services.asset.MetadataDictionaryService"), \
            patch.object(trash_service, "MetadataDictionaryService"), \
            patch.object(trash_service, "_enqueue_clip"):
        yield tmp_path


def _write(nas, rel, content=b"x"):
    path = nas / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(content)
    return path


def _make_asset(db, nas, file_hash="hash-1", asset_id=1):
    _write(nas, ORIGINAL)
    _write(nas, THUMB)
    _write(nas, f"processed/faces/{asset_id}_7.webp")
    asset = model.Asset(id=asset_id, original_path=ORIGINAL, thumbnail_path=THUMB, asset_type="image",
                        file_hash=file_hash, created_by=1)
    db.add(asset)
    db.add(model.Album(id=5, name="旅行", created_by=1))
    db.add(model.AlbumAsset(album_id=5, asset_id=asset_id))
    db.add(model.AssetTag(asset_id=asset_id, tag_key="aspect_ratio", tag_value="1.5"))
    # 删除素材前就被单独删掉的标签，恢复时不能被带回来
    db.add(model.AssetTag(asset_id=asset_id, tag_key="device_model", tag_value="X", is_deleted=True,
                          updated_at=datetime(2020, 1, 1)))
    db.commit()
    return asset


def _delete(db, nas):
    _make_asset(db, nas)
    AssetService.batch_delete_assets(db, [1])


def test_list_shows_deleted_asset_with_trash_thumbnail(sqlite_db, nas):
    _delete(sqlite_db, nas)
    items = TrashService.list_items(sqlite_db, user_id=1)
    assert len(items) == 1
    item = items[0]
    assert item["thumbnail_url"].startswith("/media/recycle_bin/")
    assert item["aspect_ratio"] == 1.5
    assert (item["days_left"], item["restorable"]) == (90, True)


def test_restore_moves_files_back_and_revives_cascade(sqlite_db, nas):
    _delete(sqlite_db, nas)
    assert not (nas / ORIGINAL).exists()

    result = TrashService.restore(sqlite_db, [1], user_id=1)

    assert result == {"restored": [1], "failed": []}
    assert (nas / ORIGINAL).exists() and (nas / THUMB).exists()
    assert not any((nas / "recycle_bin").iterdir())
    assert sqlite_db.get(model.Asset, 1).is_deleted is False
    tags = {t.tag_key: t.is_deleted for t in sqlite_db.query(model.AssetTag).filter_by(asset_id=1)}
    assert tags == {"aspect_ratio": False, "device_model": True}
    assert sqlite_db.query(model.AlbumAsset).filter_by(asset_id=1).one().is_deleted is False
    assert TrashService.list_items(sqlite_db, user_id=1) == []


def test_reimported_file_cannot_be_restored(sqlite_db, nas):
    _delete(sqlite_db, nas)
    # 删除后又导入了同一个文件
    _write(nas, ORIGINAL)
    sqlite_db.add(model.Asset(id=2, original_path=ORIGINAL, asset_type="image", file_hash="hash-1", created_by=1))
    sqlite_db.commit()

    assert TrashService.list_items(sqlite_db, user_id=1)[0]["restorable"] is False
    result = TrashService.restore(sqlite_db, [1], user_id=1)
    assert result["restored"] == [] and result["failed"][0]["asset_id"] == 1
    assert sqlite_db.get(model.Asset, 1).is_deleted is True


def test_purge_only_expired_and_preview_does_nothing(sqlite_db, nas):
    _delete(sqlite_db, nas)
    face_crop = nas / "processed/faces/1_7.webp"

    assert purge_expired(sqlite_db, 90, apply=True) == []  # 刚删除，未到期

    later = datetime.now() + timedelta(days=91)
    preview = purge_expired(sqlite_db, 90, apply=False, now=later)
    assert [i.asset_id for i in preview] == [1]
    assert face_crop.exists()

    purge_expired(sqlite_db, 90, apply=True, now=later)
    assert not face_crop.exists()
    assert not any((nas / "recycle_bin").iterdir())
    # 数据库记录保留为已删除
    assert sqlite_db.get(model.Asset, 1).is_deleted is True


def test_purge_skips_restored_asset_with_stale_dir(sqlite_db, nas):
    """素材已经是正常状态时，即便回收站里还残留同 ID 的旧目录，也不删它的人脸图"""
    _make_asset(sqlite_db, nas)
    old_dir = nas / "recycle_bin/20200101_000000/asset_1"
    _write(nas, f"recycle_bin/20200101_000000/asset_1/{ORIGINAL}")

    assert purge_expired(sqlite_db, 90, apply=True) == []
    assert old_dir.exists() and (nas / "processed/faces/1_7.webp").exists()


def test_ignores_unrelated_dirs(sqlite_db, nas):
    os.makedirs(nas / "recycle_bin/not-a-timestamp/asset_1")
    os.makedirs(nas / "recycle_bin/20200101_000000/readme")
    assert TrashService.list_items(sqlite_db, user_id=1) == []


def test_batch_dir_with_only_ds_store_is_removed(sqlite_db, nas):
    """macOS 访达写的 .DS_Store 不能让批次目录一直残留"""
    _delete(sqlite_db, nas)
    batch_dir = next((nas / "recycle_bin").iterdir())
    (batch_dir / ".DS_Store").write_bytes(b"x")
    leftover = nas / "recycle_bin/20200101_000000"
    leftover.mkdir()
    (leftover / ".DS_Store").write_bytes(b"x")

    purge_expired(sqlite_db, 90, apply=True, now=datetime.now() + timedelta(days=91))

    assert not batch_dir.exists() and not leftover.exists()


def test_restore_ignores_ds_store(sqlite_db, nas):
    """回收站和原目录里都有 .DS_Store 时，不能判成「原位置已有文件」"""
    _delete(sqlite_db, nas)
    asset_dir = next((nas / "recycle_bin").iterdir()) / "asset_1"
    (asset_dir / "original/ab/.DS_Store").write_bytes(b"x")
    _write(nas, "original/ab/.DS_Store")

    assert TrashService.restore(sqlite_db, [1], user_id=1)["restored"] == [1]
    assert (nas / ORIGINAL).exists()


def test_purge_removes_ai_versions_dir(sqlite_db, nas):
    _delete(sqlite_db, nas)
    version_file = _write(nas, "processed/versions/1/v3.webp")

    purge_expired(sqlite_db, 90, apply=True, now=datetime.now() + timedelta(days=91))

    assert not version_file.exists() and not version_file.parent.exists()
