"""应用配置

使用 pydantic-settings 管理配置，支持从环境变量和 .env 文件读取。
"""
from pathlib import Path

from pydantic_settings import BaseSettings

_BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """应用设置

    Attributes:
        PROJECT_NAME: 项目名称
        DATABASE_URL: 数据库连接 URL
        NAS_DATA_PATH: NAS 数据路径
        REDIS_HOST: Redis 主机地址
        REDIS_PORT: Redis 端口
        REDIS_DB: Redis 数据库编号
        REDIS_PASSWORD: Redis 密码（可选）
        AUTO_START_WORKER: 是否自动启动 Worker（开发环境建议 true，生产环境建议 false）
        WORKER_COUNT: Worker 进程数量
        LOG_LEVEL: 日志级别
        AMAP_API_KEY: 高德地图 API Key（可选，不配置则使用 Nominatim）
    """
    PROJECT_NAME: str = "拾光坞 (LumiHarbor)"
    DATABASE_URL: str = "mysql+pymysql://root:root@localhost:3306/lumiharbor?charset=utf8mb4"
    DB_TIMEZONE: str = "+08:00"  # 数据库会话时区，默认东八区
    NAS_DATA_PATH: str = "YOUR_NAS_PATH"

    # Redis 配置（用于异步任务队列）
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_PASSWORD: str = ""

    # Taskiq Worker 配置
    AUTO_START_WORKER: bool = True
    WORKER_COUNT: int = 2
    LOG_LEVEL: str = "INFO"

    # 地理编码服务配置
    AMAP_API_KEY: str = ""  # 高德地图 API Key（可选，不配置则使用 Nominatim）

    # 对外访问配置（用于生成可访问的资源 URL）
    # 为空时媒体返回相对路径 /media/...（前端 Next 转发，任何主机访问都可用）；
    # 媒体要走独立域名/CDN 时再配，如 https://api.example.com
    PUBLIC_BASE_URL: str = ""
    MEDIA_BASE_PATH: str = "/media"  # 本地文件对外访问的 URL 前缀（StaticFiles mount path）

    # 单次 /ingestion/upload* 请求体上限（MB），超出返回 413。手机 4K 视频单个就可能数 GB
    MAX_UPLOAD_REQUEST_MB: int = 4096
    # 回收站保留天数，超过后自动彻底删除文件（数据库记录保留为已删除）；0 关闭自动清理
    RECYCLE_RETENTION_DAYS: int = 90
    ASSET_URL_PROVIDER: str = "local"  # 'local' | 'oss'（未来可扩展）
    ASSET_STORAGE_PROVIDER: str = "local"  # 'local' | 'oss'（与 ASSET_URL_PROVIDER 建议保持一致）
    OSS_PUBLIC_BASE_URL: str = ""  # 当 ASSET_URL_PROVIDER=oss 时必填，如 https://cdn.example.com

    # 向量库（Docker 中的 Qdrant）。本机开发连 localhost，compose 内用 http://qdrant:6333
    QDRANT_URL: str = "http://localhost:6333"
    # 人脸 / 动物权重目录（默认 backend/models，不进 Git）
    FACE_MODEL_DIR: str = str(_BACKEND_DIR / "models")
    # SigLIP 2 B 权重目录（默认 backend/models/siglip2）
    CLIP_MODEL_DIR: str = str(_BACKEND_DIR / "models" / "siglip2")
    CLIP_MATCH: float = 0.045

    class Config:
        """Pydantic 配置"""
        env_file = ".env"


# 全局配置实例
settings = Settings()
