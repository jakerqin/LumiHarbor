"""
素材摄入模块

负责将外部素材纳入系统的所有入口：
- 本地文件系统扫描
- HTTP 上传接口
- 目录监控（未来）
- 第三方云存储同步（未来）
"""
from .scan import router as scan_router

__all__ = ['scan_router']
