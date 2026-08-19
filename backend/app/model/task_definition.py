"""可开关的导入后处理任务定义"""
from sqlalchemy import Column, String, DateTime, BIGINT, Boolean, JSON, func
from ..db import Base


class TaskDefinition(Base):
    """任务定义（不含 extract_metadata / map_tags）"""
    __tablename__ = "task_definitions"

    id = Column(BIGINT, primary_key=True, autoincrement=True, comment='任务定义ID')
    task_code = Column(String(50), unique=True, nullable=False, index=True, comment='稳定键')
    name = Column(String(200), nullable=False, comment='展示名')
    description = Column(String(500), nullable=True, comment='说明')
    run_mode = Column(String(20), nullable=False, default='sync', comment='sync / async')
    is_enabled = Column(Boolean, nullable=False, default=True, comment='是否启用')
    extra_info = Column(JSON, nullable=True, comment='重试等参数')
    created_at = Column(DateTime, server_default=func.now(), comment='创建时间')
    updated_at = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        comment='更新时间'
    )
    is_deleted = Column(Boolean, nullable=False, default=False, server_default='0', comment='是否删除')
