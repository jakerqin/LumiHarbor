import uuid
from sqlalchemy import Column, String, DateTime, BIGINT, Float, Boolean, JSON, text
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from .database import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String, unique=True, index=True)
    password_hash = Column(String)
    role = Column(String, default="member")
    avatar_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Asset(Base):
    __tablename__ = "assets"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(UUID(as_uuid=True), nullable=False)
    original_path = Column(String, nullable=False)
    thumbnail_path = Column(String, nullable=True)
    asset_type = Column(String)
    file_size = Column(BIGINT)
    mime_type = Column(String)
    phash = Column(String, nullable=True)
    exif_data = Column(JSONB, nullable=True)
    gps_lat = Column(Float, nullable=True)
    gps_lng = Column(Float, nullable=True)
    city = Column(String, nullable=True)
    address = Column(String, nullable=True)
    ai_tags = Column(ARRAY(String), nullable=True)
    shot_at = Column(DateTime, nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)

class Note(Base):
    __tablename__ = "notes"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(UUID(as_uuid=True), nullable=False)
    title = Column(String, nullable=True)
    content = Column(String)
    is_encrypted = Column(Boolean, default=False)
    related_assets = Column(ARRAY(UUID(as_uuid=True)), nullable=True)
    shot_at = Column(DateTime, nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)
