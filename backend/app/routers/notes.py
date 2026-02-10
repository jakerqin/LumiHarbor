"""笔记相关路由"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Optional

from ..db import get_db
from .. import model, schema
from ..services.note import NoteService
from ..services.asset_url import AssetUrlProviderFactory


router = APIRouter(
    prefix="/notes",
    tags=["Notes"],
)


def _cover_meta_for_notes(db: Session, notes: List[model.Note]) -> dict:
    """批量获取封面素材缩略图路径/URL映射 {cover_asset_id: (path, url)}"""
    cover_asset_ids = [n.cover_asset_id for n in notes if n.cover_asset_id is not None]
    if not cover_asset_ids:
        return {}

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
    mapping = {}
    for asset in cover_assets:
        mapping[asset.id] = (
            asset.thumbnail_path,
            url_provider.maybe_to_public_url(asset.thumbnail_path),
        )
    return mapping


def _cover_detail_meta_for_note(db: Session, cover_asset_id: int) -> dict:
    """获取封面素材的详细信息（用于详情页，包含原图和预览图）
    
    Returns:
        {
            'thumbnail_path': str | None,
            'thumbnail_url': str | None,
            'original_path': str | None,
            'original_url': str | None,
            'preview_path': str | None,
            'preview_url': str | None,
        }
    """
    if not cover_asset_id:
        return {
            'thumbnail_path': None,
            'thumbnail_url': None,
            'original_path': None,
            'original_url': None,
            'preview_path': None,
            'preview_url': None,
        }

    asset = (
        db.query(model.Asset)
        .filter(
            and_(
                model.Asset.id == cover_asset_id,
                model.Asset.is_deleted == False,
            )
        )
        .first()
    )

    if not asset:
        return {
            'thumbnail_path': None,
            'thumbnail_url': None,
            'original_path': None,
            'original_url': None,
            'preview_path': None,
            'preview_url': None,
        }

    url_provider = AssetUrlProviderFactory.create()
    return {
        'thumbnail_path': asset.thumbnail_path,
        'thumbnail_url': url_provider.maybe_to_public_url(asset.thumbnail_path),
        'original_path': asset.original_path,
        'original_url': url_provider.maybe_to_public_url(asset.original_path),
        'preview_path': asset.preview_path,
        'preview_url': url_provider.maybe_to_public_url(asset.preview_path),
    }


@router.post("", response_model=schema.ApiResponse[schema.NoteDetailOut])
def create_note(
    note_data: schema.NoteCreate,
    db: Session = Depends(get_db),
    current_user_id: int = 1,  # TODO: 从认证中间件获取
):
    """创建笔记"""
    try:
        note = NoteService.create_note(db, note_data, created_by=current_user_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    cover_meta = _cover_detail_meta_for_note(db, note.cover_asset_id)

    # 优先使用 content_markdown，如果为空则从 content JSON 生成纯文本摘要
    excerpt = note.content_markdown or NoteService.build_excerpt(note.content)

    return schema.ApiResponse.success(
        data=schema.NoteDetailOut(
            id=note.id,
            created_by=note.created_by,
            title=note.title,
            excerpt=excerpt,
            cover_asset_id=note.cover_asset_id,
            cover_thumbnail_path=cover_meta['thumbnail_path'],
            cover_thumbnail_url=cover_meta['thumbnail_url'],
            cover_original_path=cover_meta['original_path'],
            cover_original_url=cover_meta['original_url'],
            cover_preview_path=cover_meta['preview_path'],
            cover_preview_url=cover_meta['preview_url'],
            shot_at=note.shot_at,
            created_at=note.created_at,
            updated_at=note.updated_at,
            content=note.content,
        )
    )


@router.get("", response_model=schema.ApiResponse[schema.NotesPageResponse])
def list_notes(
    skip: int = Query(0, ge=0, description="跳过的记录数"),
    limit: int = Query(50, ge=1, le=200, description="返回的最大记录数"),
    sort_by: schema.NoteSortBy = Query(schema.NoteSortBy.UPDATED_AT, description="排序字段"),
    order: str = Query("desc", pattern="^(asc|desc)$", description="排序顺序"),
    created_by: Optional[int] = Query(None, description="按创建者筛选"),
    search: Optional[str] = Query(None, description="按标题模糊搜索"),
    db: Session = Depends(get_db),
):
    """获取笔记列表（分页）"""
    notes, total = NoteService.list_notes(
        db,
        skip=skip,
        limit=limit,
        sort_by=sort_by.value,
        order=order,
        created_by=created_by,
        search=search,
    )

    cover_meta = _cover_meta_for_notes(db, notes)
    notes_out: List[schema.NoteSummaryOut] = []
    for note in notes:
        cover_thumbnail_path, cover_thumbnail_url = (None, None)
        if note.cover_asset_id:
            cover_thumbnail_path, cover_thumbnail_url = cover_meta.get(note.cover_asset_id, (None, None))

        # 始终从 content JSON 生成纯文本摘要（用于列表页预览）
        excerpt = NoteService.build_excerpt(note.content)

        notes_out.append(
            schema.NoteSummaryOut(
                id=note.id,
                created_by=note.created_by,
                title=note.title,
                excerpt=excerpt,
                cover_asset_id=note.cover_asset_id,
                cover_thumbnail_path=cover_thumbnail_path,
                cover_thumbnail_url=cover_thumbnail_url,
                shot_at=note.shot_at,
                created_at=note.created_at,
                updated_at=note.updated_at,
            )
        )

    has_more = skip + limit < total
    return schema.ApiResponse.success(
        data=schema.NotesPageResponse(
            notes=notes_out,
            total=total,
            skip=skip,
            limit=limit,
            has_more=has_more,
        )
    )


@router.get("/{note_id}", response_model=schema.ApiResponse[schema.NoteDetailOut])
def get_note(
    note_id: int,
    db: Session = Depends(get_db),
):
    """获取笔记详情"""
    note = NoteService.get_note_by_id(db, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="笔记不存在")

    # 获取封面素材的详细信息（包含原图和预览图）
    cover_meta = _cover_detail_meta_for_note(db, note.cover_asset_id)

    # 优先使用 content_markdown，如果为空则从 content JSON 生成纯文本摘要
    excerpt = note.content_markdown or NoteService.build_excerpt(note.content)

    return schema.ApiResponse.success(
        data=schema.NoteDetailOut(
            id=note.id,
            created_by=note.created_by,
            title=note.title,
            excerpt=excerpt,
            cover_asset_id=note.cover_asset_id,
            cover_thumbnail_path=cover_meta['thumbnail_path'],
            cover_thumbnail_url=cover_meta['thumbnail_url'],
            cover_original_path=cover_meta['original_path'],
            cover_original_url=cover_meta['original_url'],
            cover_preview_path=cover_meta['preview_path'],
            cover_preview_url=cover_meta['preview_url'],
            shot_at=note.shot_at,
            created_at=note.created_at,
            updated_at=note.updated_at,
            content=note.content,
        )
    )


@router.patch("/{note_id}", response_model=schema.ApiResponse[schema.NoteDetailOut])
def update_note(
    note_id: int,
    note_data: schema.NoteUpdate,
    db: Session = Depends(get_db),
):
    """更新笔记"""
    try:
        note = NoteService.update_note(db, note_id, note_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not note:
        raise HTTPException(status_code=404, detail="笔记不存在")

    cover_meta = _cover_detail_meta_for_note(db, note.cover_asset_id)

    # 优先使用 content_markdown，如果为空则从 content JSON 生成纯文本摘要
    excerpt = note.content_markdown or NoteService.build_excerpt(note.content)

    return schema.ApiResponse.success(
        data=schema.NoteDetailOut(
            id=note.id,
            created_by=note.created_by,
            title=note.title,
            excerpt=excerpt,
            cover_asset_id=note.cover_asset_id,
            cover_thumbnail_path=cover_meta['thumbnail_path'],
            cover_thumbnail_url=cover_meta['thumbnail_url'],
            cover_original_path=cover_meta['original_path'],
            cover_original_url=cover_meta['original_url'],
            cover_preview_path=cover_meta['preview_path'],
            cover_preview_url=cover_meta['preview_url'],
            shot_at=note.shot_at,
            created_at=note.created_at,
            updated_at=note.updated_at,
            content=note.content,
        )
    )


@router.delete("/{note_id}", response_model=schema.ApiResponse[dict])
def delete_note(note_id: int, db: Session = Depends(get_db)):
    """删除笔记（软删除）"""
    success = NoteService.delete_note(db, note_id)
    if not success:
        raise HTTPException(status_code=404, detail="笔记不存在")
    return schema.ApiResponse.success(data={"deleted": True})

