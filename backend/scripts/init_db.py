import sys
import os

# 将 backend 目录添加到 python 路径，以便导入 app 模块
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app.database import engine, Base
from app import models

def init_db():
    print("正在连接数据库并创建表...")
    try:
        # 这会自动在目标数据库上创建所有继承自 Base 的模型对应的表
        Base.metadata.create_all(bind=engine)
        print("✅ 数据库表初始化成功！")
    except Exception as e:
        print(f"❌ 数据库初始化失败: {e}")

if __name__ == "__main__":
    init_db()
