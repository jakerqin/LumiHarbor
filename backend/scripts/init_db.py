import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db import engine, Base
# 导入所有模型以确保表结构被注册到 Base.metadata
from app.model import User, Asset, Note, TagDefinition, AssetTag

def init_db():
    # 确保所有模型都已加载（避免 linter 警告）
    _ = (User, Asset, Note, TagDefinition, AssetTag)

    print("正在连接数据库并创建表...")
    try:
        # 这会自动在目标数据库上创建所有继承自 Base 的模型对应的表
        Base.metadata.create_all(bind=engine)
        print("✅ 数据库表初始化成功！")
    except Exception as e:
        print(f"❌ 数据库初始化失败: {e}")

if __name__ == "__main__":
    init_db()
