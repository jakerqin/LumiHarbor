"""足迹格子查询条件：要有可走索引的范围条件，且范围覆盖 ROUND 的边界"""
from sqlalchemy.dialects import mysql

from app.routers.map import _grid_conditions


def _sql(cond) -> str:
    return str(cond.compile(dialect=mysql.dialect(), compile_kwargs={"literal_binds": True}))


def test_has_index_friendly_range_on_raw_columns():
    lat_range, lng_range, *_ = _grid_conditions(24.34, 109.41)
    assert _sql(lat_range).startswith("assets.gps_latitude BETWEEN")
    assert _sql(lng_range).startswith("assets.gps_longitude BETWEEN")


def test_range_covers_rounding_boundaries():
    """ROUND(24.335, 2) = 24.34，ROUND(24.3449, 2) = 24.34，两端都得在范围内"""
    lat_range = _grid_conditions(24.34, 109.41)[0]
    low, high = lat_range.right.clauses[0].value, lat_range.right.clauses[1].value
    assert low <= 24.335 and high >= 24.345


def test_negative_coordinates():
    lat_range = _grid_conditions(-33.87, 151.21)[0]
    low, high = lat_range.right.clauses[0].value, lat_range.right.clauses[1].value
    assert low <= -33.875 and high >= -33.865
