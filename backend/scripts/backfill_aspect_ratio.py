"""
为现有素材批量补充 aspect_ratio 标签

执行方式：
python -m scripts.backfill_aspect_ratio
"""
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from app.config import settings
from app.model.asset import Asset
from app.model.asset_tag import AssetTag
from app.tools.aspect_ratio import calculate_aspect_ratio

def backfill_aspect_ratio():
    """为现有素材批量补充 aspect_ratio 标签"""
    engine = create_engine(settings.DATABASE_URL)

    with Session(engine) as db:
        print("开始批量补充 aspect_ratio 标签...")

        # 1. 查询所有素材
        assets = db.execute(
            select(Asset).where(Asset.is_deleted == False)
        ).scalars().all()

        print(f"共找到 {len(assets)} 个素材")

        success_count = 0
        skip_count = 0

        for asset in assets:
            # 2. 检查是否已有 aspect_ratio 标签
            existing = db.execute(
                select(AssetTag).where(
                    AssetTag.asset_id == asset.id,
                    AssetTag.tag_key == 'aspect_ratio',
                    AssetTag.is_deleted == False
                )
            ).scalar_one_or_none()

            if existing:
                skip_count += 1
                continue

            # 3. 查询 width 和 height 标签
            width_tag = db.execute(
                select(AssetTag.tag_value).where(
                    AssetTag.asset_id == asset.id,
                    AssetTag.tag_key == 'width',
                    AssetTag.is_deleted == False
                )
            ).scalar_one_or_none()

            height_tag = db.execute(
                select(AssetTag.tag_value).where(
                    AssetTag.asset_id == asset.id,
                    AssetTag.tag_key == 'height',
                    AssetTag.is_deleted == False
                )
            ).scalar_one_or_none()

            # 4. 计算 aspect_ratio
            try:
                width = int(width_tag) if width_tag else 0
                height = int(height_tag) if height_tag else 0
                aspect_ratio = calculate_aspect_ratio(width, height)
            except (ValueError, TypeError):
                aspect_ratio = 'square'

            # 5. 保存 aspect_ratio 标签
            new_tag = AssetTag(
                asset_id=asset.id,
                tag_key='aspect_ratio',
                tag_value=aspect_ratio
            )
            db.add(new_tag)
            success_count += 1

            # 每 100 条提交一次
            if success_count % 100 == 0:
                db.commit()
                print(f"已处理 {success_count} 个素材...")

        # 最终提交
        db.commit()

        print(f"\n✅ 批量补充完成!")
        print(f"  - 新增标签: {success_count} 个")
        print(f"  - 已存在跳过: {skip_count} 个")
        print(f"  - 总计: {len(assets)} 个")

if __name__ == "__main__":
    backfill_aspect_ratio()
