"""应用配置

使用 pydantic-settings 管理配置，支持从环境变量和 .env 文件读取。
"""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """应用设置

    Attributes:
        PROJECT_NAME: 项目名称
        DATABASE_URL: 数据库连接 URL
        NAS_DATA_PATH: NAS 数据路径
        SECRET_KEY: JWT 密钥
        ALGORITHM: JWT 算法
        ACCESS_TOKEN_EXPIRE_MINUTES: Token 过期时间（分钟）
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
    SECRET_KEY: str = "your-secret-key-change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

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
    PUBLIC_BASE_URL: str = "http://localhost:8000"  # 生产环境建议配置为固定域名，如 https://api.example.com
    MEDIA_BASE_PATH: str = "/media"  # 本地文件对外访问的 URL 前缀（StaticFiles mount path）
    ASSET_URL_PROVIDER: str = "local"  # 'local' | 'oss'（未来可扩展）
    ASSET_STORAGE_PROVIDER: str = "local"  # 'local' | 'oss'（与 ASSET_URL_PROVIDER 建议保持一致）
    OSS_PUBLIC_BASE_URL: str = ""  # 当 ASSET_URL_PROVIDER=oss 时必填，如 https://cdn.example.com

    class Config:
        """Pydantic 配置"""
        env_file = ".env"


# 全局配置实例
settings = Settings()
