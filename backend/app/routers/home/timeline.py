"""时间轴路由"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc
from typing import List, Optional

from ...db import get_db
from ... import model, schema
from ...services.asset_url import AssetUrlProviderFactory


router = APIRouter(
    prefix="/home",
    tags=["Home"],
)


@router.get("/timeline", response_model=schema.ApiResponse[schema.TimelineResponse])
def get_timeline(
    limit: int = Query(10, ge=1, le=50, description="返回的最大记录数"),
    created_by: Optional[int] = Query(None, description="按创建者筛选"),
    db: Session = Depends(get_db),
):
    """获取首页时间轴数据（基于笔记）

    返回按创建时间倒序排列的笔记列表，用于首页大事记展示
    """
    query = db.query(model.Note).filter(model.Note.is_deleted == False)

    if created_by:
        query = query.filter(model.Note.created_by == created_by)

    # 按创建时间倒序排列
    notes = (
        query.order_by(desc(model.Note.created_at))
        .limit(limit)
        .all()
    )

    # 批量获取封面素材信息
    cover_asset_ids = [n.cover_asset_id for n in notes if n.cover_asset_id]
    cover_assets_map = {}
    if cover_asset_ids:
        cover_assets = (
            db.query(model.Asset)
            .filter(
                and_(
                    model.Asset.id.in_(cover_asset_ids),
                    model.Asset.is_deleted == False,
                )
            )
            .all()
        )
        url_provider = AssetUrlProviderFactory.create()
        for asset in cover_assets:
            cover_assets_map[asset.id] = {
                'id': asset.id,
                'thumbnail_url': url_provider.maybe_to_public_url(asset.thumbnail_path),
                'type': asset.asset_type,
            }

    # 转换为时间轴笔记格式
    timeline_notes: List[schema.TimelineNote] = []
    for note in notes:
        # 获取封面信息
        cover_asset = None
        if note.cover_asset_id and note.cover_asset_id in cover_assets_map:
            cover_asset = cover_assets_map[note.cover_asset_id]

        timeline_notes.append(
            schema.TimelineNote(
                id=note.id,
                title=note.title or "无标题",
                cover_asset=cover_asset,
                created_at=note.created_at,
            )
        )

    return schema.ApiResponse.success(
        data=schema.TimelineResponse(notes=timeline_notes)
    )
