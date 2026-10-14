"""软删行复活：唯一键不含 is_deleted，取消后再添加不能重插"""
from datetime import datetime

from fastapi.testclient import TestClient

from app import model
from app.db import get_db
from app.main import app
from app.services.album import AlbumService


def _seed_asset(db, asset_id: int = 1) -> model.Asset:
    asset = model.Asset(
        id=asset_id,
        original_path=f"photos/{asset_id}.jpg",
        asset_type="image",
        created_by=1,
        shot_at=datetime(2026, 1, asset_id),
    )
    db.add(asset)
    db.commit()
    return asset


def _seed_album(db) -> model.Album:
    album = model.Album(name="旅行", created_by=1)
    db.add(album)
    db.commit()
    return album


def test_favorite_unfavorite_favorite_again(sqlite_db):
    _seed_asset(sqlite_db)
    app.dependency_overrides[get_db] = lambda: sqlite_db
    try:
        client = TestClient(app)
        assert client.post("/assets/1/favorite").json()["code"] == "0"
        assert client.delete("/assets/1/favorite").json()["code"] == "0"
        resp = client.post("/assets/1/favorite").json()
    finally:
        app.dependency_overrides.clear()

    assert resp["code"] == "0"
    rows = sqlite_db.query(model.UserFavorite).all()
    assert len(rows) == 1
    assert rows[0].is_deleted is False


def test_album_remove_then_add_again(sqlite_db):
    _seed_asset(sqlite_db)
    album = _seed_album(sqlite_db)

    assert AlbumService.add_asset_to_album(sqlite_db, album.id, 1) is not None
    assert AlbumService.remove_asset_from_album(sqlite_db, album.id, 1)
    assert AlbumService.add_asset_to_album(sqlite_db, album.id, 1) is not None

    rows = sqlite_db.query(model.AlbumAsset).all()
    assert len(rows) == 1
    assert rows[0].is_deleted is False


def test_album_batch_revives_and_dedupes(sqlite_db):
    _seed_asset(sqlite_db, 1)
    _seed_asset(sqlite_db, 2)
    album = _seed_album(sqlite_db)

    AlbumService.add_assets_to_album_batch(sqlite_db, album.id, [1])
    AlbumService.remove_asset_from_album(sqlite_db, album.id, 1)
    success, failed = AlbumService.add_assets_to_album_batch(sqlite_db, album.id, [1, 2, 2, 99])

    assert success == 2
    assert failed == [99]
    rows = sqlite_db.query(model.AlbumAsset).filter(model.AlbumAsset.is_deleted == False).all()
    assert sorted(r.asset_id for r in rows) == [1, 2]
