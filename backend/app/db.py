"""数据库连接配置

使用 SQLAlchemy 管理数据库连接和 Session。
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import settings


# MySQL 引擎配置
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,  # 自动检测失效连接
    pool_recycle=3600,   # 每小时回收连接
    echo=False,          # 生产环境设为 False
    connect_args={"init_command": f"SET time_zone = '{settings.DB_TIMEZONE}'"}
)

# Session 工厂
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# ORM 基类
Base = declarative_base()


def get_db():
    """FastAPI 依赖注入：获取数据库 Session

    Yields:
        Session: 数据库会话对象

    Examples:
        ```python
        @app.get("/users")
        def get_users(db: Session = Depends(get_db)):
            return db.query(User).all()
        ```
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
