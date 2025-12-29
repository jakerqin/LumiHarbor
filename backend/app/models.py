from sqlalchemy import Column, String, DateTime, BIGINT, Float, Boolean, JSON, Text
from .database import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"
    id = Column(BIGINT, primary_key=True, autoincrement=True)
    username = Column(String(255), unique=True, index=True)
    password_hash = Column(String(255))
    role = Column(String(50), default="member")
    avatar_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Asset(Base):
    __tablename__ = "assets"
    id = Column(BIGINT, primary_key=True, autoincrement=True)
    owner_id = Column(BIGINT, nullable=False, index=True)
    original_path = Column(String(1000), nullable=False)
    thumbnail_path = Column(String(1000), nullable=True)
    asset_type = Column(String(50))
    file_size = Column(BIGINT)
    mime_type = Column(String(100))
    phash = Column(String(255), nullable=True)
    exif_data = Column(JSON, nullable=True)
    gps_lat = Column(Float, nullable=True)
    gps_lng = Column(Float, nullable=True)
    city = Column(String(200), nullable=True)
    address = Column(String(500), nullable=True)
    ai_tags = Column(JSON, nullable=True)  # 存储为 JSON 数组
    shot_at = Column(DateTime, nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)

class Note(Base):
    __tablename__ = "notes"
    id = Column(BIGINT, primary_key=True, autoincrement=True)
    owner_id = Column(BIGINT, nullable=False, index=True)
    title = Column(String(500), nullable=True)
    content = Column(Text)
    is_encrypted = Column(Boolean, default=False)
    related_assets = Column(JSON, nullable=True)  # 存储为 JSON 数组
    shot_at = Column(DateTime, nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)
