"""素材对外访问 URL 生成器

目标：
- 数据库存储相对路径（original_path / thumbnail_path）
- 对外 API 返回可访问的完整 URL（original_url / thumbnail_url）

设计：
- 策略模式：不同存储后端生成 URL 的规则不同（local/oss/…）
- 工厂模式：根据配置选择当前策略，调用方无需关心具体实现
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Dict, Optional
from urllib.parse import quote

from ..config import settings
from ..tools.utils import get_logger

logger = get_logger(__name__)


def _is_absolute_url(value: str) -> bool:
    lower = value.lower()
    return lower.startswith("http://") or lower.startswith("https://")


def _normalize_base_url(base_url: str) -> str:
    return base_url.rstrip("/")


def _normalize_path_prefix(prefix: str) -> str:
    if not prefix:
        return ""
    if not prefix.startswith("/"):
        prefix = f"/{prefix}"
    return prefix.rstrip("/")


def _join_url(base_url: str, *parts: str) -> str:
    """拼接 URL，自动处理多余的 / 并对路径做 URL 编码。"""
    url = _normalize_base_url(base_url)
    for part in parts:
        if not part:
            continue
        clean = part.strip("/")
        url += "/" + quote(clean, safe="/")
    return url


class AssetUrlProvider(ABC):
    """素材 URL 生成策略接口"""

    @abstractmethod
    def to_public_url(self, relative_path: str) -> str:
        """将相对路径/对象 key 转换为可公开访问的完整 URL"""
        raise NotImplementedError

    def maybe_to_public_url(self, relative_path: Optional[str]) -> Optional[str]:
        """允许输入为空的便捷方法（缩略图可能不存在）"""
        if not relative_path:
            return None
        return self.to_public_url(relative_path)


class LocalAssetUrlProvider(AssetUrlProvider):
    """本地文件 URL 生成器

    约定：
    - 后端通过 StaticFiles 将 settings.NAS_DATA_PATH 挂载到 settings.MEDIA_BASE_PATH
    - 数据库存储的路径相对于 NAS_DATA_PATH
    """

    def __init__(self, public_base_url: str, media_base_path: str):
        self.public_base_url = _normalize_base_url(public_base_url)
        self.media_base_path = _normalize_path_prefix(media_base_path)

    def to_public_url(self, relative_path: str) -> str:
        if _is_absolute_url(relative_path):
            return relative_path
        return _join_url(self.public_base_url, self.media_base_path, relative_path)


class OssAssetUrlProvider(AssetUrlProvider):
    """OSS 对外访问 URL 生成器（预留）

    约定：
    - relative_path 视为对象 key
    - 使用 OSS_PUBLIC_BASE_URL 作为对外访问域名（可为 CDN 域名）
    """

    def __init__(self, oss_public_base_url: str):
        self.oss_public_base_url = _normalize_base_url(oss_public_base_url)

    def to_public_url(self, relative_path: str) -> str:
        if _is_absolute_url(relative_path):
            return relative_path
        return _join_url(self.oss_public_base_url, relative_path)


class AssetUrlProviderFactory:
    """素材 URL 生成器工厂"""

    _providers: Dict[str, AssetUrlProvider] = {}

    @classmethod
    def create(cls, provider_name: Optional[str] = None) -> AssetUrlProvider:
        provider_name = (provider_name or settings.ASSET_URL_PROVIDER or "local").lower()
        cached = cls._providers.get(provider_name)
        if cached:
            return cached

        if provider_name == "oss":
            if not settings.OSS_PUBLIC_BASE_URL:
                raise ValueError("ASSET_URL_PROVIDER=oss 需要配置 OSS_PUBLIC_BASE_URL")
            provider = OssAssetUrlProvider(settings.OSS_PUBLIC_BASE_URL)
        else:
            provider = LocalAssetUrlProvider(
                public_base_url=settings.PUBLIC_BASE_URL,
                media_base_path=settings.MEDIA_BASE_PATH,
            )

        cls._providers[provider_name] = provider
        logger.debug(f"创建 AssetUrlProvider: {provider_name} -> {provider.__class__.__name__}")
        return provider

