"""模板字段绑定模型"""
from sqlalchemy import Column, String, DateTime, BIGINT, Boolean, Integer, JSON, func
from ..db import Base


class TemplateField(Base):
    """某模板下展示/筛选/写入的字段"""
    __tablename__ = "template_fields"

    id = Column(BIGINT, primary_key=True, autoincrement=True, comment='字段绑定ID')
    template_id = Column(BIGINT, nullable=False, index=True, comment='模板ID')
    field_source = Column(
        String(20),
        nullable=False,
        comment='tag / asset / relation'
    )
    field_key = Column(String(100), nullable=False, comment='tag_key 或资产列名')
    sort_order = Column(Integer, nullable=False, default=0, comment='排序')
    is_required = Column(Boolean, nullable=False, default=False, comment='是否必填')
    is_readonly = Column(Boolean, nullable=False, default=False, comment='是否只读')
    widget_override = Column(Integer, nullable=True, comment='覆盖 input_type')
    extra_info = Column(JSON, nullable=True, comment='字段级扩展')
    created_at = Column(DateTime, server_default=func.now(), comment='创建时间')
    updated_at = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        comment='更新时间'
    )
    is_deleted = Column(Boolean, nullable=False, default=False, server_default='0', comment='是否删除')
