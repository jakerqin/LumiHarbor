"""素材语义向量：编码入库与补算名单。"""
from datetime import date
from typing import List, Optional, Tuple

from sqlalchemy.orm import Session

from .. import model
from ..tools.clip import CLIP_MODEL_NAME, encode_image
from ..tools.utils import get_logger
from .face import FaceService
from .vector_store import VectorStore

logger = get_logger(__name__)


class ClipService:
    @staticmethod
    def process_asset(db: Session, asset: model.Asset) -> dict:
        if asset.asset_type == "audio":
            return {"success": True, "message": "音频跳过"}
        infer_path = FaceService.resolve_infer_path(asset)
        if not infer_path:
            return {"success": False, "message": "找不到可推理图片"}
        vector = encode_image(infer_path)
        VectorStore.instance().upsert_asset(
            asset.id,
            vector,
            {"asset_id": asset.id, "asset_type": asset.asset_type},
        )
        asset.clip_model = CLIP_MODEL_NAME
        db.commit()
        return {"success": True, "message": "ok"}

    @staticmethod
    def assets_need_backfill(
        db: Session,
        asset_ids: Optional[List[int]],
        missing_only: bool,
        limit: int,
        shot_range: Optional[Tuple[Optional[date], Optional[date]]] = None,
    ) -> List[int]:
        from .face import _filter_shot_range

        query = db.query(model.Asset.id).filter(
            model.Asset.is_deleted == False,
            model.Asset.asset_type.in_(["image", "video"]),
        )
        if asset_ids:
            query = query.filter(model.Asset.id.in_(asset_ids))
        if missing_only:
            query = query.filter(
                (model.Asset.clip_model.is_(None)) | (model.Asset.clip_model == "")
            )
        query = _filter_shot_range(query, shot_range)
        return [row[0] for row in query.order_by(model.Asset.id.desc()).limit(limit).all()]
