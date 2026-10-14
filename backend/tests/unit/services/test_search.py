"""混合检索 RRF 与 LIKE 转义"""
from datetime import datetime

from app.services.search import escape_like, rrf_fuse, _rank_key


def test_rrf_prefers_overlap():
    visual = [1, 2, 3]
    path = [3, 4]
    scores = rrf_fuse([visual, path])
    assert scores[3] > scores[1]
    assert scores[3] > scores[4]


def test_rrf_keeps_first_rank():
    scores = rrf_fuse([[10, 20]])
    assert scores[10] > scores[20]


def test_escape_like_masks_wildcards():
    assert escape_like("a%b_c") == r"a\%b\_c"
    assert escape_like("foo\\bar") == r"foo\\bar"


def test_rank_key_newer_shot_wins_tie():
    older = datetime(2024, 1, 1)
    newer = datetime(2025, 1, 1)
    assert _rank_key(0.5, newer) < _rank_key(0.5, older)
    assert _rank_key(0.5, newer) < _rank_key(0.5, None)
