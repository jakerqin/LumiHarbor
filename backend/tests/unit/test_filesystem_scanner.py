"""扫描器跳过 NAS 系统目录与 macOS 伴生文件"""
from unittest.mock import patch

from app.services.scanning import FilesystemScanner


def _touch(path):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(b"x")


def _scan(root) -> list:
    return sorted(item["original_path"] for item in FilesystemScanner.scan(str(root), created_by=1))


def test_scan_nas_root_skips_reserved_and_hidden(tmp_path):
    nas = tmp_path / "nas"
    _touch(nas / "photos" / "a.jpg")
    _touch(nas / "photos" / "._a.jpg")
    _touch(nas / "recycle_bin" / "20261013_120000" / "asset_1" / "b.jpg")
    _touch(nas / "processed" / "thumbnails" / "c.jpg")
    _touch(nas / ".Trashes" / "501" / "d.jpg")
    # 非 NAS 根下的同名目录是用户自己的文件夹，不能跳过
    _touch(nas / "photos" / "processed" / "e.jpg")

    with patch("app.services.scanning.filesystem.settings.NAS_DATA_PATH", str(nas)):
        assert _scan(nas) == ["photos/a.jpg", "photos/processed/e.jpg"]


def test_scan_external_dir_keeps_reserved_names(tmp_path):
    """SD 卡等外部目录不在 NAS 根下，名为 recycle_bin 的普通目录照常扫描"""
    nas = tmp_path / "nas"
    nas.mkdir()
    card = tmp_path / "SDCARD"
    _touch(card / "DCIM" / "100CANON" / "IMG_0001.JPG")
    _touch(card / "DCIM" / "100CANON" / "._IMG_0001.JPG")
    _touch(card / "recycle_bin" / "f.jpg")

    with patch("app.services.scanning.filesystem.settings.NAS_DATA_PATH", str(nas)):
        assert _scan(card) == ["DCIM/100CANON/IMG_0001.JPG", "recycle_bin/f.jpg"]
