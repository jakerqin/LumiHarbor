"""标签元数据定义模型"""
from sqlalchemy import Column, String, DateTime, BIGINT, Boolean, Integer, Text, JSON
from datetime import datetime
from ..db import Base


class TagDefinition(Base):
    """标签元数据定义表

    用于定义系统中所有可用的标签类型及其展示配置。

    Attributes:
        id: 标签定义ID
        tag_key: 标签键名（唯一标识）
        tag_name: 标签显示名称
        input_type: 输入组件类型（1:TextInput、2:TreeSelect、3:DateRangePicker）
        extra_info: 扩展信息（JSON格式，包含 min/max/options/placeholder 等）
        description: 标签描述
        created_at: 创建时间
        updated_at: 更新时间
        is_deleted: 是否删除（软删除标记）
    """
    __tablename__ = "tag_definitions"

    # 主键
    id = Column(BIGINT, primary_key=True, autoincrement=True, comment='标签定义ID')

    # 标签标识
    tag_key = Column(
        String(100),
        unique=True,
        nullable=False,
        index=True,
        comment='标签键名（唯一）: gps_lat, camera_model, ai_tag_person'
    )
    tag_name = Column(
        String(200),
        nullable=False,
        comment='标签显示名称: GPS纬度, 相机型号, AI人物标签'
    )

    # 前端展示配置
    input_type = Column(
        Integer,
        nullable=True,
        index=True,
        comment='输入组件类型：1:TextInput、2:TreeSelect、3:DateRangePicker'
    )
    extra_info = Column(
        JSON,
        nullable=True,
        comment='扩展信息（JSON格式）: {"min": -90, "max": 90, "options": [...], "placeholder": "..."}'
    )

    # 元信息
    description = Column(Text, nullable=True, comment='标签描述')

    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow, comment='创建时间')
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        comment='更新时间'
    )
    is_deleted = Column(Boolean, nullable=False, default=False, comment='是否删除')
