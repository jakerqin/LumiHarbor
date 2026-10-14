"""单元测试共用 fixtures"""
import pytest
from sqlalchemy import BIGINT, create_engine
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import Base
from app import model  # noqa: F401  注册全部 ORM 表


@compiles(BIGINT, "sqlite")
def _bigint_as_integer(type_, compiler, **kw):
    """SQLite 只有 INTEGER PRIMARY KEY 才自增，测试库里把 BIGINT 映射过去"""
    return "INTEGER"


@pytest.fixture
def sqlite_db():
    """内存 SQLite 会话（建全部表，含唯一约束，可复现软删 + 唯一键冲突）"""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    session = sessionmaker(autocommit=False, autoflush=False, bind=engine)()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()
