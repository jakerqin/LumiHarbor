"""
Schemas Package

定义所有 Pydantic Schema，用于请求/响应验证。
导出所有 Schema 模型，使其他模块可以通过以下方式导入：
    from app.schemas import AssetBase, AssetOut

Schema 说明：
    AssetBase: 资源基础 Schema（用于创建请求）
    AssetOut: 资源输出 Schema（用于响应）
"""
from .asset import AssetBase, AssetOut

# 导出所有 Schema，方便其他模块导入
__all__ = [
    'AssetBase',
    'AssetOut',
]
