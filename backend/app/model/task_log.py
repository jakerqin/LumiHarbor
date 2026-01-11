"""任务日志模型"""
from sqlalchemy import Column, String, DateTime, BIGINT, Integer, Text, Index, JSON, func
from ..db import Base


class TaskLog(Base):
    """异步任务日志表（通用）

    用于记录各种异步任务的执行状态，包括：
    - phash 计算
    - 地理位置编码
    - 人脸识别
    - 其他耗时任务

    Attributes:
        id: 任务日志ID
        task_type: 任务类型（phash, geocoding, face_detection 等）
        task_status: 任务状态（pending, running, success, failed）
        asset_id: 关联的资源ID
        task_params: 任务参数（JSON 格式）
        retry_count: 当前重试次数
        max_retries: 最大重试次数
        error_message: 错误信息（仅失败时记录）
        executed_at: 最后执行时间
        created_at: 创建时间
        updated_at: 更新时间
    """
    __tablename__ = "task_logs"

    # 主键
    id = Column(BIGINT, primary_key=True, autoincrement=True, comment='任务日志ID')

    # 任务标识
    task_type = Column(String(50), nullable=False, comment='任务类型: phash, geocoding, face_detection 等')
    task_status = Column(String(20), nullable=False, default='pending', comment='任务状态: pending, running, success, failed')

    # 关联资源
    asset_id = Column(BIGINT, nullable=False, index=True, comment='关联的资源ID')

    # 任务参数（JSON 格式，适配不同任务类型）
    task_params = Column(JSON, comment='任务参数，如: {"latitude": 39.9042, "longitude": 116.4074}')

    # 重试机制
    retry_count = Column(Integer, default=0, comment='当前重试次数')
    max_retries = Column(Integer, default=3, comment='最大重试次数')

    # 执行结果
    error_message = Column(Text, comment='错误信息（仅失败时记录）')
    executed_at = Column(DateTime, comment='最后执行时间')

    # 时间戳
    created_at = Column(DateTime, server_default=func.now(), comment='创建时间')
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), comment='更新时间')

    # 复合索引
    __table_args__ = (
        Index('idx_task_type', 'task_type'),
        Index('idx_task_status', 'task_status'),
        Index('idx_task_type_status', 'task_type', 'task_status'),
        Index('idx_created_at', 'created_at'),
    )

    def __repr__(self):
        return f"<TaskLog(id={self.id}, type={self.task_type}, status={self.task_status}, asset_id={self.asset_id})>"
