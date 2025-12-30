#!/usr/bin/env python
"""
FastAPI 应用启动脚本

使用方法（从 backend 目录运行）:
    python run.py
"""
import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
