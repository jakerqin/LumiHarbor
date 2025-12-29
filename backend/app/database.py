from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import settings

# MySQL 引擎配置，添加连接池和字符编码设置
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,  # 自动检测失效连接
    pool_recycle=3600,   # 每小时回收连接
    echo=False           # 生产环境设为 False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
