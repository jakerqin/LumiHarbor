"""手动清理回收站中超过保留天数的素材

后端运行时会自动清理（启动时一次，之后每 24 小时一次），本脚本用于提前查看清单或手动执行。
只删除文件（回收站目录 + 人脸裁剪图），数据库记录保留为已删除。

用法（在 backend 目录下）：
    python scripts/purge_recycle_bin.py                 # 只预览，按 RECYCLE_RETENTION_DAYS
    python scripts/purge_recycle_bin.py --days 30       # 预览，按 30 天算
    python scripts/purge_recycle_bin.py --apply         # 执行删除
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import settings  # noqa: E402
from app.db import SessionLocal  # noqa: E402
from app.services.trash import purge_expired  # noqa: E402


def main(days: int, apply: bool) -> None:
    if days <= 0:
        print("保留天数 <= 0，不清理")
        return
    db = SessionLocal()
    try:
        items = purge_expired(db, days, apply=apply)
        for item in items:
            print(f"asset {item.asset_id}: 删除于 {item.deleted_at:%Y-%m-%d %H:%M:%S}，{item.size_bytes / 1024 / 1024:.1f}MB")
        total_mb = sum(i.size_bytes for i in items) / 1024 / 1024
        print(f"\n共 {len(items)} 个素材超过 {days} 天，合计 {total_mb:.1f}MB")
        print("已删除" if apply else "预览模式，未删除；确认后加 --apply 执行")
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="清理回收站中超过保留天数的素材文件")
    parser.add_argument("--days", type=int, default=settings.RECYCLE_RETENTION_DAYS, help="保留天数")
    parser.add_argument("--apply", action="store_true", help="执行删除（默认只预览）")
    args = parser.parse_args()
    main(args.days, args.apply)
