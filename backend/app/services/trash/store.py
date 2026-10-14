"""回收站目录读写

目录结构由删除流程决定（AssetService._move_assets_to_trash）：
    {NAS}/recycle_bin/{删除时间 %Y%m%d_%H%M%S}/asset_{id}/{相对 NAS 的原路径}

删除时间以目录名为准：数据库里没有单独的删除时间列，目录名和级联软删时写入的 updated_at 一致。
"""
import shutil
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

from ...config import settings
from ...tools.utils import get_logger
from ..scanning.filesystem import RECYCLE_BIN_DIR

logger = get_logger(__name__)

TIMESTAMP_FORMAT = "%Y%m%d_%H%M%S"
ASSET_DIR_PREFIX = "asset_"
# 人脸裁剪图不随删除进回收站（恢复后还要用），清理时按素材 ID 删除
FACE_CROP_GLOB = "processed/faces/{asset_id}_*.webp"
# 系统自动生成的文件，判断批次目录是否为空时忽略（macOS 访达会在打开过的目录里写 .DS_Store）
SYSTEM_JUNK = {".DS_Store", "Thumbs.db", "desktop.ini"}


@dataclass
class TrashEntry:
    """回收站里的一个素材"""
    asset_id: int
    deleted_at: datetime
    root: Path  # recycle_bin/{时间}/asset_{id}

    def files(self) -> List[Path]:
        """素材文件（不含 .DS_Store 等系统文件，恢复时不该挪回 NAS）"""
        return [p for p in self.root.rglob("*") if p.is_file() and not _is_system_junk(p.name)]

    def size_bytes(self) -> int:
        return sum(p.stat().st_size for p in self.files())

    def find(self, relative_path: Optional[str]) -> Optional[Path]:
        """素材某个相对路径（如 thumbnail_path）在回收站里的位置；不存在返回 None"""
        if not relative_path or ".." in Path(relative_path).parts:
            return None
        path = self.root / relative_path
        return path if path.is_file() else None


def nas_root() -> Optional[Path]:
    if not settings.NAS_DATA_PATH:
        return None
    root = Path(settings.NAS_DATA_PATH).expanduser().resolve()
    return root if root.is_dir() else None


def scan_entries() -> Dict[int, TrashEntry]:
    """列出回收站里所有素材；同一素材出现多次时取最近一次删除"""
    root = nas_root()
    trash = root / RECYCLE_BIN_DIR if root else None
    if not trash or not trash.is_dir():
        return {}

    entries: Dict[int, TrashEntry] = {}
    for batch_dir in trash.iterdir():
        deleted_at = _parse_timestamp(batch_dir.name)
        if not deleted_at or not batch_dir.is_dir():
            continue
        for asset_dir in batch_dir.iterdir():
            asset_id = _parse_asset_id(asset_dir.name)
            if asset_id is None or not asset_dir.is_dir():
                continue
            current = entries.get(asset_id)
            if not current or deleted_at > current.deleted_at:
                entries[asset_id] = TrashEntry(asset_id, deleted_at, asset_dir)
    return entries


def remove_entry(entry: TrashEntry) -> None:
    """删除回收站里这个素材的目录；批次目录空了一并删掉"""
    shutil.rmtree(entry.root, ignore_errors=True)
    _remove_if_empty(entry.root.parent)


def remove_empty_batches() -> None:
    """清掉只剩系统文件的批次目录（之前删除时被 .DS_Store 挡住没删掉的）"""
    root = nas_root()
    trash = root / RECYCLE_BIN_DIR if root else None
    if not trash or not trash.is_dir():
        return
    for batch_dir in trash.iterdir():
        if batch_dir.is_dir() and _parse_timestamp(batch_dir.name):
            _remove_if_empty(batch_dir)


def _remove_if_empty(batch_dir: Path) -> None:
    try:
        if not batch_dir.is_dir():
            return
        children = list(batch_dir.iterdir())
        if any(not _is_system_junk(c.name) for c in children):
            return
        for child in children:
            child.unlink()
        batch_dir.rmdir()
    except OSError as exc:
        logger.warning("删除空的回收站批次目录失败: %s (%s)", batch_dir, exc)


def remove_face_crops(asset_id: int) -> int:
    root = nas_root()
    if not root:
        return 0
    removed = 0
    for path in root.glob(FACE_CROP_GLOB.format(asset_id=asset_id)):
        path.unlink(missing_ok=True)
        removed += 1
    return removed


def _is_system_junk(name: str) -> bool:
    return name in SYSTEM_JUNK or name.startswith("._")


def _parse_timestamp(name: str) -> Optional[datetime]:
    try:
        return datetime.strptime(name, TIMESTAMP_FORMAT)
    except ValueError:
        return None


def _parse_asset_id(name: str) -> Optional[int]:
    if not name.startswith(ASSET_DIR_PREFIX):
        return None
    suffix = name[len(ASSET_DIR_PREFIX):]
    return int(suffix) if suffix.isdigit() else None
