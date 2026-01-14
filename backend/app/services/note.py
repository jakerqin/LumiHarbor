"""笔记业务逻辑层"""

from __future__ import annotations

import re
from typing import List, Optional, Tuple

from sqlalchemy.orm import Session

from .. import model, schema


_ASSET_REF_PATTERN = re.compile(r"asset://(\d+)")


def _extract_related_asset_ids(markdown: str) -> List[int]:
    """从 Markdown 文本中提取 asset://{id} 引用的素材 ID（去重并保持首次出现顺序）"""
    seen = set()
    asset_ids: List[int] = []
    for match in _ASSET_REF_PATTERN.finditer(markdown):
        asset_id = int(match.group(1))
        if asset_id in seen:
            continue
        seen.add(asset_id)
        asset_ids.append(asset_id)
    return asset_ids


def _build_excerpt(markdown: str, max_length: int = 160) -> str:
    """从 Markdown 派生摘要文本（用于列表页）"""
    text = markdown
    # 移除 fenced code block
    text = re.sub(r"```[\s\S]*?```", "", text)
    # 移除 inline code
    text = re.sub(r"`[^`]*`", "", text)
    # 图片/链接：保留可读文本
    text = re.sub(r"!\[([^\]]*)\]\([^)]*\)", r"\1", text)
    text = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", text)
    # 常见 Markdown 前缀（标题、引用、列表）
    text = re.sub(r"^\s{0,3}#{1,6}\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"^\s{0,3}>\s?", "", text, flags=re.MULTILINE)
    text = re.sub(r"^\s{0,3}[-*+]\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"^\s{0,3}\d+\.\s+", "", text, flags=re.MULTILINE)
    # 移除素材引用协议
    text = _ASSET_REF_PATTERN.sub("", text)
    # 收敛空白
    text = re.sub(r"\s+", " ", text).strip()
    if not text:
        return ""
    return text[:max_length]


class NoteService:
    """笔记服务类（业务逻辑层）"""

    @staticmethod
    def list_notes(
        db: Session,
        skip: int = 0,
        limit: int = 50,
        sort_by: str = "created_at",
        order: str = "desc",
        created_by: Optional[int] = None,
        search: Optional[str] = None,
    ) -> Tuple[List[model.Note], int]:
        """获取笔记列表（支持排序、分页、搜索）"""
        query = db.query(model.Note).filter(model.Note.is_deleted == False)

        if created_by is not None:
            query = query.filter(model.Note.created_by == created_by)

        if search:
            query = query.filter(model.Note.title.like(f"%{search}%"))

        total = query.count()

        sort_field = getattr(model.Note, sort_by, model.Note.created_at)
        if order == "asc":
            query = query.order_by(sort_field.asc())
        else:
            query = query.order_by(sort_field.desc())

        notes = query.offset(skip).limit(limit).all()
        return notes, total

    @staticmethod
    def get_note_by_id(db: Session, note_id: int, include_deleted: bool = False) -> Optional[model.Note]:
        """根据 ID 获取笔记"""
        query = db.query(model.Note).filter(model.Note.id == note_id)
        if not include_deleted:
            query = query.filter(model.Note.is_deleted == False)
        return query.first()

    @staticmethod
    def _missing_asset_ids(db: Session, asset_ids: List[int]) -> List[int]:
        """检查素材是否存在（不包含已删除素材），返回缺失的 ID 列表"""
        if not asset_ids:
            return []

        existing_ids = {
            row[0]
            for row in db.query(model.Asset.id)
            .filter(
                model.Asset.id.in_(asset_ids),
                model.Asset.is_deleted == False,
            )
            .all()
        }
        return [asset_id for asset_id in asset_ids if asset_id not in existing_ids]

    @staticmethod
    def create_note(db: Session, note_data: schema.NoteCreate, created_by: int) -> model.Note:
        """创建笔记（会派生 related_assets）"""
        related_assets = _extract_related_asset_ids(note_data.content)

        missing_ids = NoteService._missing_asset_ids(db, related_assets)
        if note_data.cover_asset_id is not None:
            missing_ids += NoteService._missing_asset_ids(db, [note_data.cover_asset_id])

        if missing_ids:
            raise ValueError(f"引用的素材不存在或已删除: {sorted(set(missing_ids))}")

        note = model.Note(
            created_by=created_by,
            title=note_data.title,
            content=note_data.content,
            cover_asset_id=note_data.cover_asset_id,
            related_assets=related_assets,
            shot_at=note_data.shot_at,
            is_encrypted=False,
            is_deleted=False,
        )
        db.add(note)
        db.commit()
        db.refresh(note)
        return note

    @staticmethod
    def update_note(db: Session, note_id: int, note_data: schema.NoteUpdate) -> Optional[model.Note]:
        """更新笔记（仅更新提供的字段，content 更新会重算 related_assets）"""
        note = NoteService.get_note_by_id(db, note_id)
        if not note:
            return None

        update_data = note_data.model_dump(exclude_unset=True)

        if "content" in update_data:
            content = update_data["content"]
            related_assets = _extract_related_asset_ids(content)
            missing_ids = NoteService._missing_asset_ids(db, related_assets)
            if missing_ids:
                raise ValueError(f"引用的素材不存在或已删除: {sorted(set(missing_ids))}")
            note.content = content
            note.related_assets = related_assets

        if "title" in update_data:
            note.title = update_data["title"]

        if "shot_at" in update_data:
            note.shot_at = update_data["shot_at"]

        if "cover_asset_id" in update_data:
            cover_asset_id = update_data["cover_asset_id"]
            if cover_asset_id is not None:
                missing_ids = NoteService._missing_asset_ids(db, [cover_asset_id])
                if missing_ids:
                    raise ValueError(f"封面素材不存在或已删除: {missing_ids[0]}")
            note.cover_asset_id = cover_asset_id

        db.commit()
        db.refresh(note)
        return note

    @staticmethod
    def delete_note(db: Session, note_id: int) -> bool:
        """删除笔记（软删除）"""
        note = NoteService.get_note_by_id(db, note_id)
        if not note:
            return False
        note.is_deleted = True
        db.commit()
        return True

    @staticmethod
    def build_excerpt(markdown: str, max_length: int = 160) -> str:
        """对外暴露摘要生成（便于路由层复用/测试）"""
        return _build_excerpt(markdown, max_length=max_length)

