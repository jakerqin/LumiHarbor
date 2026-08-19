"""相似推荐加权排序"""
from app.services.similar import BONUS_SAME_ALBUM, BONUS_SAME_DAY, BONUS_SAME_POI, ContextMatch, context_bonus
from app.tools.perceptual_hash import visual_percent


def test_context_bonus_prefers_day_place_album():
    none = context_bonus(ContextMatch())
    day = context_bonus(ContextMatch(same_day=True))
    full = context_bonus(ContextMatch(same_day=True, same_poi=True, same_album=True))
    assert none == 0
    assert day == BONUS_SAME_DAY
    assert full == BONUS_SAME_DAY + BONUS_SAME_POI + BONUS_SAME_ALBUM


def test_poi_overrides_city_and_gps():
    poi = context_bonus(ContextMatch(same_poi=True, same_city=True, near_gps=True))
    city = context_bonus(ContextMatch(same_city=True, near_gps=True))
    assert poi == BONUS_SAME_POI
    assert city == BONUS_SAME_CITY


def test_same_context_can_outrank_slightly_closer_visual():
    close_unrelated = visual_percent(6) + context_bonus(ContextMatch())
    a_bit_farther_same_trip = visual_percent(10) + context_bonus(
        ContextMatch(same_day=True, same_poi=True, same_album=True)
    )
    assert a_bit_farther_same_trip > close_unrelated
