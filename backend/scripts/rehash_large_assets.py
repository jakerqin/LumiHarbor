"""按新采样算法重算大文件（≥100MB）的 file_hash

旧采样哈希混入了 mtime，新算法改为头/中/尾采样 + 文件大小。不重算的话，
同一个大文件再次导入时新旧哈希对不上，会重复入库。

用法（在 backend 目录下）：
    python scripts/rehash_large_assets.py          # 只预览
    python scripts/rehash_large_assets.py --apply  # 写库
"""
import argparse
import os
import sys
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import model  # noqa: E402
from app.config import settings  # noqa: E402
from app.db import SessionLocal  # noqa: E402
from app.tools.file_hash import LARGE_FILE_THRESHOLD, calculate_file_hash  # noqa: E402


def _plan(assets):
    """返回 [(asset, new_hash)]，文件缺失或未变化的跳过"""
    planned = []
    for asset in assets:
        full_path = os.path.join(settings.NAS_DATA_PATH, asset.original_path)
        if not os.path.exists(full_path):
            print(f"跳过 asset {asset.id}: 文件不存在 {asset.original_path}")
            continue
        new_hash = calculate_file_hash(full_path)
        if new_hash == asset.file_hash:
            continue
        planned.append((asset, new_hash))
        print(f"asset {asset.id}: {asset.original_path}  {(asset.file_hash or '')[:12]}… -> {new_hash[:12]}…")
    return planned


def _report_collisions(planned):
    """新哈希相同 = 同一文件被重复导入过（旧哈希因 mtime 不同没拦住）"""
    counts = Counter(new_hash for _, new_hash in planned)
    for new_hash, count in counts.items():
        if count > 1:
            ids = [asset.id for asset, h in planned if h == new_hash]
            print(f"⚠️ 疑似重复素材（内容相同）: {ids}，可在素材库里确认后删除多余的")


def main(apply: bool) -> None:
    db = SessionLocal()
    try:
        assets = db.query(model.Asset).filter(
            model.Asset.is_deleted == False,
            model.Asset.file_size >= LARGE_FILE_THRESHOLD
        ).all()
        planned = _plan(assets)
        _report_collisions(planned)

        print(f"\n共 {len(planned)} 条待更新（≥100MB 的素材 {len(assets)} 个）")
        if not apply:
            print("预览模式，未写库；确认后加 --apply 执行")
            return

        for asset, new_hash in planned:
            asset.file_hash = new_hash
        db.commit()
        print(f"已更新 {len(planned)} 条")
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="重算大文件采样哈希")
    parser.add_argument("--apply", action="store_true", help="实际写库（默认只预览）")
    main(parser.parse_args().apply)
