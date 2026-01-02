#!/usr/bin/env python
"""
FastAPI 应用启动脚本

使用方法（从 backend 目录运行）:
    python run.py

功能:
    - 启动 FastAPI 应用（端口 8000）
    - 自动启动 Taskiq Worker（开发环境）
    - 通过环境变量控制行为

环境变量:
    AUTO_START_WORKER=true|false   是否自动启动 Worker（默认: true）
    WORKER_COUNT=N                  Worker 数量（默认: 2）
    LOG_LEVEL=debug|info|warning    日志级别（默认: info）
"""
import sys
import subprocess
import signal
import time
import uvicorn

# 导入配置（确保从 .env 文件加载环境变量）
from app.config import settings

# 全局变量存储 Worker 进程
worker_process = None


def check_redis_connection():
    """检查 Redis 是否可用"""
    try:
        import redis
        client = redis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            db=settings.REDIS_DB,
            password=settings.REDIS_PASSWORD or None,
            socket_connect_timeout=2
        )
        client.ping()
        return True
    except Exception as e:
        print(f"⚠️  Redis 连接失败: {e}")
        return False


def start_worker():
    """启动 Taskiq Worker 子进程"""
    global worker_process

    # 检查是否启用自动启动
    if not settings.AUTO_START_WORKER:
        print("ℹ️  自动启动 Worker 已禁用（AUTO_START_WORKER=false）")
        return None

    # 检查 Redis 连接
    if not check_redis_connection():
        print("⚠️  警告: Redis 未连接，跳过 Worker 启动")
        print("提示: 异步任务功能将不可用，请先启动 Redis:")
        print("  macOS: brew services start redis")
        print("  Linux: sudo systemctl start redis")
        return None

    # 获取配置
    worker_count = settings.WORKER_COUNT
    log_level = settings.LOG_LEVEL

    # 构建启动命令
    cmd = [
        sys.executable,  # 使用当前 Python 解释器
        "-m", "taskiq",
        "worker",
        "app.tasks.broker:broker",
        "--workers", str(worker_count),
        "--log-level", log_level,
    ]

    print("\n" + "=" * 50)
    print("🚀 启动 Taskiq Worker")
    print("=" * 50)
    print(f"Worker 数量: {worker_count}")
    print(f"日志级别:   {log_level}")
    print(f"命令: {' '.join(cmd)}")
    print("=" * 50 + "\n")

    try:
        # 启动子进程
        worker_process = subprocess.Popen(
            cmd,
            stdout=sys.stdout,
            stderr=sys.stderr,
        )

        # 等待 Worker 启动
        time.sleep(2)

        # 检查进程是否存活
        if worker_process.poll() is None:
            print(f"✅ Worker 启动成功 (PID: {worker_process.pid})\n")
            return worker_process
        else:
            print(f"❌ Worker 启动失败 (退出码: {worker_process.returncode})\n")
            return None

    except Exception as e:
        print(f"❌ Worker 启动异常: {e}\n")
        return None


def stop_worker():
    """停止 Worker 进程"""
    global worker_process

    if worker_process and worker_process.poll() is None:
        print("\n🛑 正在停止 Worker...")

        try:
            # 发送 SIGTERM 信号（优雅关闭）
            worker_process.terminate()

            # 等待最多 5 秒
            try:
                worker_process.wait(timeout=5)
                print("✅ Worker 已停止")
            except subprocess.TimeoutExpired:
                # 超时则强制杀死
                print("⚠️  Worker 未响应，强制终止...")
                worker_process.kill()
                worker_process.wait()
                print("✅ Worker 已强制停止")

        except Exception as e:
            print(f"❌ 停止 Worker 失败: {e}")


def signal_handler(sig, frame):
    """处理终止信号（Ctrl+C）"""
    print("\n\n收到终止信号，正在清理...")
    stop_worker()
    sys.exit(0)


if __name__ == "__main__":
    # 注册信号处理器
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    # 启动 Worker（如果启用）
    start_worker()

    # 启动 FastAPI 应用
    print("=" * 50)
    print("🌐 启动 FastAPI 应用")
    print("=" * 50)
    print("地址: http://0.0.0.0:8000")
    print("文档: http://0.0.0.0:8000/docs")
    print("=" * 50 + "\n")

    try:
        uvicorn.run(
            "app.main:app",
            host="0.0.0.0",
            port=8000,
            reload=True,
            log_level=settings.LOG_LEVEL
        )
    finally:
        # 确保 Worker 被停止
        stop_worker()
