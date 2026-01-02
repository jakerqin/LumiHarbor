#!/bin/bash
# Taskiq Worker 启动脚本

set -e

# 脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR"

# 默认配置
WORKERS=4
LOG_LEVEL="info"
RELOAD=false

# 帮助信息
show_help() {
    cat << EOF
LumiHarbor Taskiq Worker 启动脚本

用法: $0 [选项]

选项:
    -w, --workers NUM       Worker 进程数量（默认: 4）
    -l, --log-level LEVEL   日志级别: debug|info|warning|error（默认: info）
    -r, --reload            启用热重载（仅开发环境）
    -h, --help              显示此帮助信息

示例:
    # 开发环境（热重载）
    $0 --reload --log-level debug

    # 生产环境（4 个 Worker）
    $0 --workers 4

    # 高并发场景（8 个 Worker）
    $0 --workers 8 --log-level warning

EOF
}

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case $1 in
        -w|--workers)
            WORKERS="$2"
            shift 2
            ;;
        -l|--log-level)
            LOG_LEVEL="$2"
            shift 2
            ;;
        -r|--reload)
            RELOAD=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo "未知参数: $1"
            show_help
            exit 1
            ;;
    esac
done

# 检查 Redis 是否运行
echo "🔍 检查 Redis 连接..."
if ! redis-cli ping > /dev/null 2>&1; then
    echo "❌ 错误: 无法连接到 Redis"
    echo "请确保 Redis 已启动: brew services start redis (macOS) 或 systemctl start redis (Linux)"
    exit 1
fi
echo "✅ Redis 连接正常"

# 进入 backend 目录
cd "$BACKEND_DIR"

# 检查虚拟环境
if [ -z "$VIRTUAL_ENV" ]; then
    echo "⚠️  警告: 未检测到虚拟环境"
    echo "建议先激活虚拟环境: source venv/bin/activate"
    read -p "是否继续? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 构建启动命令
CMD="taskiq worker app.tasks.broker:broker"
CMD="$CMD --workers $WORKERS"
CMD="$CMD --log-level $LOG_LEVEL"

if [ "$RELOAD" = true ]; then
    CMD="$CMD --reload"
fi

# 显示配置
echo ""
echo "========================================="
echo "🚀 LumiHarbor Taskiq Worker"
echo "========================================="
echo "Worker 数量: $WORKERS"
echo "日志级别:   $LOG_LEVEL"
echo "热重载:     $([ "$RELOAD" = true ] && echo "启用" || echo "禁用")"
echo "工作目录:   $BACKEND_DIR"
echo "========================================="
echo ""

# 启动 Worker
echo "💼 启动 Worker..."
echo "命令: $CMD"
echo ""

exec $CMD
