"""清空 notes 表数据的脚本"""
import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import text
from app.db import engine


def truncate_notes_table():
    """清空 notes 表数据"""
    try:
        with engine.connect() as conn:
            conn.execute(text("TRUNCATE TABLE notes;"))
            conn.commit()
            print("✅ notes 表数据已清空")
    except Exception as e:
        print(f"❌ 清空失败: {e}")
        sys.exit(1)


if __name__ == "__main__":
    print("⚠️  即将清空 notes 表的所有数据...")
    truncate_notes_table()
