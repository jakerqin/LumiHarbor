"""大文件采样哈希：与 mtime 无关，能感知中段改动"""
import os

import pytest

from app.tools import file_hash
from app.tools.file_hash import calculate_file_hash


@pytest.fixture
def small_threshold(monkeypatch):
    """把阈值/采样缩到 KB 级，避免测试写 100MB 文件"""
    monkeypatch.setattr(file_hash, "LARGE_FILE_THRESHOLD", 64 * 1024)
    monkeypatch.setattr(file_hash, "SAMPLE_BYTES", 16 * 1024)


def _write(path, size: int, middle_byte: bytes = b"\x00"):
    data = bytearray(b"a" * size)
    data[size // 2] = middle_byte[0]
    path.write_bytes(bytes(data))


def test_sample_hash_ignores_mtime(tmp_path, small_threshold):
    path = tmp_path / "video.mov"
    _write(path, 200 * 1024)
    before = calculate_file_hash(str(path))
    os.utime(path, (1_000_000, 1_000_000))
    assert calculate_file_hash(str(path)) == before


def test_sample_hash_same_content_different_files(tmp_path, small_threshold):
    a, b = tmp_path / "a.mov", tmp_path / "b.mov"
    _write(a, 200 * 1024)
    _write(b, 200 * 1024)
    os.utime(b, (2_000_000, 2_000_000))
    assert calculate_file_hash(str(a)) == calculate_file_hash(str(b))


def test_sample_hash_detects_middle_change(tmp_path, small_threshold):
    a, b = tmp_path / "a.mov", tmp_path / "b.mov"
    _write(a, 200 * 1024, b"\x00")
    _write(b, 200 * 1024, b"\x01")
    assert calculate_file_hash(str(a)) != calculate_file_hash(str(b))


def test_small_file_uses_full_hash(tmp_path, small_threshold):
    import hashlib
    path = tmp_path / "a.jpg"
    path.write_bytes(b"x" * 1024)
    assert calculate_file_hash(str(path)) == hashlib.sha256(b"x" * 1024).hexdigest()
