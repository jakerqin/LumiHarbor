import sys
import os
from pathlib import Path
from typing import List

from sqlalchemy import text

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db import engine
# 导入所有模型以确保表结构被注册到 Base.metadata
from app.model import User, Asset, Note, TagDefinition, AssetTag

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
SQL_FILE_PATH = REPO_ROOT / "scripts" / "init_db.sql"


def _load_sql_statements(sql_file: Path) -> List[str]:
    """读取 SQL 文件并按分号拆分成独立语句（忽略空行与注释）"""
    sql_content = sql_file.read_text(encoding="utf-8")

    statements: List[str] = []
    buffer: List[str] = []
    for line in sql_content.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("--"):
            continue

        buffer.append(line)
        if stripped.endswith(";"):
            statements.append("\n".join(buffer).rstrip(";").strip())
            buffer = []

    # 处理末尾没有以分号结束的语句
    if buffer:
        statements.append("\n".join(buffer).strip())

    return statements


def init_db():
    # 确保所有模型都已加载（避免 linter 警告）
    _ = (User, Asset, Note, TagDefinition, AssetTag)

    if not SQL_FILE_PATH.exists():
        raise FileNotFoundError(f"未找到初始化 SQL 文件: {SQL_FILE_PATH}")

    print("正在连接数据库并执行初始化 SQL...")
    try:
        statements = _load_sql_statements(SQL_FILE_PATH)

        # 使用事务执行 SQL 文件中的 DDL+DML
        with engine.begin() as connection:
            for statement in statements:
                connection.execute(text(statement))

        print(f"✅ 初始化 SQL 执行完成，共 {len(statements)} 条语句")
    except Exception as e:
        print(f"❌ 数据库初始化失败: {e}")
        raise


if __name__ == "__main__":
    init_db()
