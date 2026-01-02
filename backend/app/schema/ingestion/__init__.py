"""
Ingestion Schema Package

导入相关的所有请求/响应模型
"""
from .scan import ScanRequest, ScanResponseData

# 导出所有 Schema
__all__ = [
    'ScanRequest',
    'ScanResponseData',
]
