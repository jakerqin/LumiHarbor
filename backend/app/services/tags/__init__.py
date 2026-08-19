"""标签服务模块"""
from .service import TagService
from .mapper import MetadataTagMapper
from .admin import TagAdminService
from .mapping_service import TagMappingService

__all__ = ['TagService', 'MetadataTagMapper', 'TagAdminService', 'TagMappingService']
