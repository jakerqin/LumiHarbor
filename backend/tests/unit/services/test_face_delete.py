"""软删素材上的匹配脸，不再写 Qdrant 检出点。"""
from types import SimpleNamespace
from unittest.mock import MagicMock

from app.services.face import FaceService


def test_soft_delete_only_marks_mysql():
    human = SimpleNamespace(id=1, subject_type="human", is_deleted=False)
    animal = SimpleNamespace(id=2, subject_type="animal", is_deleted=False)
    db = MagicMock()
    db.query.return_value.filter.return_value.all.return_value = [human, animal]

    FaceService.soft_delete_for_assets(db, [10])

    assert human.is_deleted is True
    assert animal.is_deleted is True
    db.commit.assert_called_once()
