"""用户模型"""
from sqlalchemy import Column, String, DateTime, BIGINT, func
from ..db import Base


class User(Base):
    """用户表

    Attributes:
        id: 用户唯一ID
        username: 用户名（唯一）
        password_hash: 密码哈希
        role: 用户角色（admin, member, guest）
        avatar_url: 头像URL
        created_at: 创建时间
    """
    __tablename__ = "users"

    id = Column(BIGINT, primary_key=True, autoincrement=True, comment='用户ID')
    username = Column(String(255), unique=True, index=True, nullable=False, comment='用户名')
    password_hash = Column(String(255), nullable=False, comment='密码哈希')
    role = Column(String(50), default="member", comment='用户角色')
    avatar_url = Column(String(500), nullable=True, comment='头像URL')
    created_at = Column(DateTime, server_default=func.now(), comment='创建时间')
