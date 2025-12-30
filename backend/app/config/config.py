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
    """
    PROJECT_NAME: str = "拾光坞 (LumiHarbor)"
    DATABASE_URL: str = "mysql+pymysql://root:root@localhost:3306/lumiharbor?charset=utf8mb4"
    NAS_DATA_PATH: str = "YOUR_NAS_PATH"
    SECRET_KEY: str = "your-secret-key-change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    class Config:
        """Pydantic 配置"""
        env_file = ".env"


# 全局配置实例
settings = Settings()
