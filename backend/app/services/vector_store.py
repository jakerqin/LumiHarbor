"""Qdrant 向量库封装。名单参考向量；不做业务权威。"""
from typing import Any, Dict, List, Optional

from qdrant_client import QdrantClient
from qdrant_client.http.exceptions import UnexpectedResponse
from qdrant_client.models import Distance, PointIdsList, PointStruct, VectorParams

from ..config import settings
from ..tools.utils import get_logger

logger = get_logger(__name__)

COLLECTION_HUMAN = "subjects_human"
COLLECTION_PET = "subjects_pet"
COLLECTION_CLIP = "assets_clip"
LEGACY_FACE_COLLECTIONS = ("faces_human", "faces_animal")

DIM_HUMAN = 512
DIM_PET = 768
DIM_CLIP = 768


def collection_for_subject(kind: str) -> str:
    if kind == "human":
        return COLLECTION_HUMAN
    if kind in ("pet", "animal"):
        return COLLECTION_PET
    raise ValueError(f"未知 kind: {kind}")


class VectorStore:
    """按 collection 分流的 Qdrant 客户端。"""

    _instance: Optional["VectorStore"] = None

    def __init__(self, url: Optional[str] = None):
        self._url = url or settings.QDRANT_URL
        self._client = QdrantClient(url=self._url, timeout=10)
        self._ensured = False

    @classmethod
    def instance(cls) -> "VectorStore":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def ping(self) -> bool:
        try:
            self._client.get_collections()
            return True
        except Exception as exc:
            logger.warning(f"Qdrant 不可达: {exc}")
            return False

    def ensure_collections(self) -> None:
        if self._ensured:
            return
        self._create_if_missing(COLLECTION_HUMAN, DIM_HUMAN)
        self._create_if_missing(COLLECTION_PET, DIM_PET)
        self._create_if_missing(COLLECTION_CLIP, DIM_CLIP)
        self._drop_legacy()
        self._ensured = True

    def upsert_face(
        self,
        subject_type: str,
        point_id: int,
        vector: List[float],
        payload: Dict[str, Any],
    ) -> None:
        self.ensure_collections()
        name = collection_for_subject(subject_type)
        self._client.upsert(
            collection_name=name,
            points=[PointStruct(id=point_id, vector=vector, payload=payload)],
        )

    def search(
        self,
        subject_type: str,
        vector: List[float],
        limit: int,
        score_threshold: float,
    ) -> List[Dict[str, Any]]:
        self.ensure_collections()
        name = collection_for_subject(subject_type)
        resp = self._client.query_points(
            collection_name=name,
            query=vector,
            limit=limit,
            score_threshold=score_threshold,
        )
        return [
            {"id": hit.id, "score": float(hit.score), "payload": hit.payload or {}}
            for hit in resp.points
        ]

    def upsert_asset(
        self,
        asset_id: int,
        vector: List[float],
        payload: Dict[str, Any],
    ) -> None:
        self.ensure_collections()
        self._client.upsert(
            collection_name=COLLECTION_CLIP,
            points=[PointStruct(id=asset_id, vector=vector, payload=payload)],
        )

    def search_assets(
        self,
        vector: List[float],
        limit: int,
        score_threshold: float,
    ) -> List[Dict[str, Any]]:
        self.ensure_collections()
        resp = self._client.query_points(
            collection_name=COLLECTION_CLIP,
            query=vector,
            limit=limit,
            score_threshold=score_threshold,
        )
        return [
            {"id": hit.id, "score": float(hit.score), "payload": hit.payload or {}}
            for hit in resp.points
        ]

    def delete_assets(self, asset_ids: List[int]) -> None:
        if not asset_ids:
            return
        try:
            self.ensure_collections()
            self._client.delete(
                collection_name=COLLECTION_CLIP,
                points_selector=PointIdsList(points=asset_ids),
            )
        except Exception as exc:
            logger.warning(f"删除 assets_clip 点失败: {exc}")

    def delete_points(self, subject_type: str, point_ids: List[int]) -> None:
        if not point_ids:
            return
        try:
            self.ensure_collections()
            self._client.delete(
                collection_name=collection_for_subject(subject_type),
                points_selector=PointIdsList(points=point_ids),
            )
        except UnexpectedResponse as exc:
            logger.warning(f"删除 Qdrant 点失败 ({subject_type}): {exc}")
        except Exception as exc:
            logger.warning(f"删除 Qdrant 点失败 ({subject_type}): {exc}")

    def _create_if_missing(self, name: str, dim: int) -> None:
        if self._client.collection_exists(name):
            return
        self._client.create_collection(
            collection_name=name,
            vectors_config=VectorParams(size=dim, distance=Distance.COSINE),
        )
        logger.info(f"已创建 Qdrant collection: {name} dim={dim}")

    def _drop_legacy(self) -> None:
        for name in LEGACY_FACE_COLLECTIONS:
            try:
                if self._client.collection_exists(name):
                    self._client.delete_collection(name)
                    logger.info(f"已删除旧 Qdrant collection: {name}")
            except Exception as exc:
                logger.warning(f"删除旧 collection {name} 失败: {exc}")
