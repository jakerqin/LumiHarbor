from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "拾光坞 (LumiHarbor)"
    DATABASE_URL: str = "mysql+pymysql://root:root@localhost:3306/lumiharbor?charset=utf8mb4"
    NAS_DATA_PATH: str = "YOUR_NAS_PATH"
    SECRET_KEY: str = "your-secret-key-change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    class Config:
        env_file = ".env"

settings = Settings()
