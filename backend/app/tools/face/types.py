"""检测结果数据结构。"""
from dataclasses import dataclass
from typing import List, Optional, Tuple

BBox = Tuple[float, float, float, float]


@dataclass
class DetectedFace:
    """一张检出的脸（像素框 + 已归一化 embedding）。"""

    subject_type: str
    bbox: BBox
    embedding: List[float]
    embedding_model: str
    det_score: float
    species: Optional[str] = None
    quality_score: Optional[float] = None
    subject_id: Optional[int] = None
