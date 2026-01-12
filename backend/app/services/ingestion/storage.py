"""素材入库的存储抽象

目标：
- 扫描任意 source_path
- 将源文件“入库”到存储后端（local/oss/...），并返回用于数据库持久化的路径/对象 key
- 同时提供当前进程可访问的本地路径（用于元数据、缩略图、异步任务参数等）

设计：
- Strategy：`AssetStorageBackend` 定义统一接口，便于扩展 OSS 等后端
- Factory：`IngestionStorageFactory` 根据 provider 选择具体实现
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
import os
import re
import shutil
import tempfile
from pathlib import Path, PurePosixPath

from ...tools.utils import get_logger

logger = get_logger(__name__)


@dataclass(frozen=True)
class StagedAssetFile:
    """已规划/入库后的文件信息

    Attributes:
        stored_path: 写入数据库的路径/对象 key（相对存储根目录）
        local_path: 当前进程可直接访问的本地完整路径
    """

    stored_path: str
    local_path: str


class AssetStorageBackend(ABC):
    """存储后端策略接口"""

    @property
    @abstractmethod
    def processing_root(self) -> Path:
        """本地处理根目录（缩略图等派生文件会写入此目录下）"""

    @abstractmethod
    def ensure_ready(self) -> None:
        """校验存储后端可用性（目录/权限/凭证等）"""

    @abstractmethod
    def plan_stage(self, source_full_path: str, file_hash: str, source_rel_path: str) -> StagedAssetFile:
        """规划入库路径（不执行 IO，便于先做去重判断）"""

    @abstractmethod
    def ensure_staged(self, staged: StagedAssetFile, source_full_path: str) -> None:
        """执行入库动作（复制/上传等），保证 staged.local_path 可用"""


class LocalNasStorage(AssetStorageBackend):
    """本地 NAS 存储策略（当前默认实现）"""

    _WINDOWS_FORBIDDEN_CHARS_RE = re.compile(r'[<>:"/\\\\|?*\x00-\x1F]')

    def __init__(self, nas_root: str) -> None:
        if not nas_root:
            raise ValueError("NAS 根目录不能为空")
        self._nas_root = Path(nas_root).expanduser().resolve()

    @property
    def processing_root(self) -> Path:
        return self._nas_root

    def ensure_ready(self) -> None:
        if not self._nas_root.exists():
            raise FileNotFoundError(f"NAS_DATA_PATH 不存在: {self._nas_root}")
        if not self._nas_root.is_dir():
            raise NotADirectoryError(f"NAS_DATA_PATH 不是目录: {self._nas_root}")

    def plan_stage(self, source_full_path: str, file_hash: str, source_rel_path: str) -> StagedAssetFile:
        source = Path(source_full_path).expanduser().resolve()

        # 如果源文件已经在 NAS 根目录下，直接复用相对路径，不做复制
        try:
            stored_path = source.relative_to(self._nas_root).as_posix()
            return StagedAssetFile(stored_path=stored_path, local_path=str(source))
        except ValueError:
            pass

        stored_path = self._build_destination_relative_path(file_hash, os.path.basename(source_rel_path))
        local_path = str(self._nas_root / Path(stored_path))
        return StagedAssetFile(stored_path=stored_path, local_path=local_path)

    def ensure_staged(self, staged: StagedAssetFile, source_full_path: str) -> None:
        source = Path(source_full_path).expanduser().resolve()
        if self._is_under_nas(source):
            return
        self._ensure_copied_to_nas(str(source), staged.stored_path)

    def _is_under_nas(self, source: Path) -> bool:
        try:
            source.relative_to(self._nas_root)
            return True
        except ValueError:
            return False

    def _build_destination_relative_path(self, file_hash: str, original_filename: str) -> str:
        prefix = (file_hash or "")[:2]
        safe_name_max_len = max(32, 240 - (len(file_hash) + 1))
        safe_filename = self._sanitize_filename(original_filename, max_length=safe_name_max_len)
        dest_name = f"{file_hash}_{safe_filename}"
        return (PurePosixPath("original") / prefix / dest_name).as_posix()

    def _ensure_copied_to_nas(self, source_full_path: str, dest_relative_path: str) -> str:
        """确保源文件存在于 NAS 目标路径（必要时复制）。"""
        self.ensure_ready()

        source = Path(source_full_path).expanduser().resolve()
        dest_rel = Path(dest_relative_path)
        if dest_rel.is_absolute() or ".." in dest_rel.parts:
            raise ValueError(f"非法目标相对路径: {dest_relative_path}")

        dest = self._nas_root / dest_rel
        dest.parent.mkdir(parents=True, exist_ok=True)

        if dest.exists():
            try:
                if dest.stat().st_size == source.stat().st_size:
                    return dest_relative_path
            except OSError:
                pass

        tmp_fd, tmp_path = tempfile.mkstemp(
            prefix=f"{dest.name}.",
            suffix=".tmp",
            dir=str(dest.parent)
        )
        os.close(tmp_fd)

        try:
            shutil.copy2(source, tmp_path)
            os.replace(tmp_path, dest)
            return dest_relative_path
        finally:
            try:
                if os.path.exists(tmp_path):
                    os.remove(tmp_path)
            except OSError:
                pass

    @classmethod
    def _sanitize_filename(cls, filename: str, max_length: int = 180) -> str:
        """清洗文件名，避免跨平台非法字符与过长文件名。"""
        name = (filename or "").strip()
        if not name:
            return "file"

        path_obj = Path(name)
        stem = path_obj.stem or "file"
        suffix = path_obj.suffix or ""

        stem = cls._WINDOWS_FORBIDDEN_CHARS_RE.sub("_", stem)
        suffix = cls._WINDOWS_FORBIDDEN_CHARS_RE.sub("_", suffix)

        stem = stem.strip(" .")
        suffix = suffix.strip()

        if not stem:
            stem = "file"

        if max_length < 16:
            max_length = 16

        allowed_stem_len = max(1, max_length - len(suffix))
        if len(stem) > allowed_stem_len:
            stem = stem[:allowed_stem_len]

        return f"{stem}{suffix}".rstrip(" .")


class IngestionStorageFactory:
    """存储后端工厂（Factory）

    当前仅实现 local，OSS 后端可在未来按同一接口扩展。
    """

    @classmethod
    def create(cls, provider_name: str, nas_root: str) -> AssetStorageBackend:
        provider = (provider_name or "local").lower()

        if provider == "local":
            return LocalNasStorage(nas_root)

        if provider == "oss":
            raise NotImplementedError("ASSET_STORAGE_PROVIDER=oss 尚未实现")

        raise ValueError(f"不支持的存储后端: {provider_name}")
