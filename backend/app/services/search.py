"""素材混合检索：SigLIP 2 + 词法 RRF。"""
from datetime import datetime
from typing import Dict, List, Optional, Sequence

from sqlalchemy.orm import Session

from .. import model
from ..config import settings
from ..tools.utils import get_logger
from .vector_store import VectorStore

logger = get_logger(__name__)

RRF_K = 60
VISUAL_LIMIT = 80
LEX_LIMIT = 40
LOCATION_KEYS = (
    "location_poi",
    "location_city",
    "location_district",
    "location_formatted",
)


def rrf_fuse(ranked_lists: Sequence[Sequence[int]]) -> Dict[int, float]:
    scores: Dict[int, float] = {}
    for ids in ranked_lists:
        for rank, asset_id in enumerate(ids):
            scores[asset_id] = scores.get(asset_id, 0.0) + 1.0 / (RRF_K + rank)
    return scores


def escape_like(raw: str) -> str:
    return raw.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


class SearchService:
    @staticmethod
    def rank_asset_ids(db: Session, query: str) -> List[int]:
        text = query.strip()
        if not text:
            return []
        like = f"%{escape_like(text)}%"
        scores = rrf_fuse([
            _visual_ids(text),
            _path_ids(db, like),
            _location_ids(db, like),
            _subject_ids(db, like),
        ])
        if not scores:
            return []
        shot_at = _shot_at_map(db, list(scores))
        return sorted(scores, key=lambda aid: _rank_key(scores[aid], shot_at.get(aid)))


def _rank_key(score: float, shot_at: Optional[datetime]) -> tuple:
    ts = shot_at.timestamp() if shot_at else 0.0
    return (-score, shot_at is None, -ts)


def _visual_ids(text: str) -> List[int]:
    try:
        from ..tools.clip import encode_text, model_available

        if not model_available():
            logger.warning("SigLIP 2 权重未就绪，语义检索只走词法")
            return []
        hits = VectorStore.instance().search_assets(
            encode_text(text), VISUAL_LIMIT, settings.CLIP_MATCH
        )
        return [int(hit["id"]) for hit in hits]
    except Exception as exc:
        logger.warning(f"语义向量检索失败，回退词法: {exc}")
        return []


def _path_ids(db: Session, like: str) -> List[int]:
    rows = db.query(model.Asset.id).filter(
        model.Asset.is_deleted == False,
        model.Asset.original_path.like(like),
    ).order_by(model.Asset.shot_at.desc()).limit(LEX_LIMIT).all()
    return [row[0] for row in rows]


def _location_ids(db: Session, like: str) -> List[int]:
    rows = db.query(model.AssetTag.asset_id).filter(
        model.AssetTag.is_deleted == False,
        model.AssetTag.tag_key.in_(LOCATION_KEYS),
        model.AssetTag.tag_value.like(like),
    ).distinct().limit(LEX_LIMIT).all()
    return [row[0] for row in rows]


def _subject_ids(db: Session, like: str) -> List[int]:
    subject_ids = db.query(model.Subject.id).filter(
        model.Subject.is_deleted == False,
        model.Subject.name.like(like),
    )
    rows = db.query(model.Face.asset_id).join(
        model.Asset, model.Asset.id == model.Face.asset_id
    ).filter(
        model.Face.is_deleted == False,
        model.Face.subject_id.in_(subject_ids),
        model.Asset.is_deleted == False,
    ).distinct().limit(LEX_LIMIT).all()
    return [row[0] for row in rows]


def _shot_at_map(db: Session, asset_ids: List[int]) -> Dict[int, Optional[datetime]]:
    if not asset_ids:
        return {}
    rows = db.query(model.Asset.id, model.Asset.shot_at).filter(
        model.Asset.id.in_(asset_ids)
    ).all()
    return {row[0]: row[1] for row in rows}
