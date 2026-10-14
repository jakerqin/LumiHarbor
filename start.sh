#!/bin/bash
# 拾光坞本地全栈启动：检查依赖、拉起前后端、Ctrl+C 一起停。
set -e
cd "$(dirname "$0")"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

BACKEND_PID=""
FRONTEND_PID=""

kill_tree() {
    local pid=$1
    local child
    for child in $(pgrep -P "$pid" 2>/dev/null); do
        kill_tree "$child"
    done
    kill "$pid" 2>/dev/null || true
}

cleanup() {
    trap - INT TERM
    echo ""
    echo -e "${YELLOW}正在关闭服务...${NC}"
    if [ -n "$BACKEND_PID" ]; then
        kill_tree "$BACKEND_PID"
        echo -e "${RED}[后端] 已停止${NC}"
    fi
    if [ -n "$FRONTEND_PID" ]; then
        kill_tree "$FRONTEND_PID"
        echo -e "${BLUE}[前端] 已停止${NC}"
    fi
    wait 2>/dev/null || true
    echo -e "${GREEN}所有服务已关闭${NC}"
    exit 0
}

trap cleanup INT TERM

need_cmd() {
    if ! command -v "$1" >/dev/null 2>&1; then
        echo -e "${RED}错误: 未找到 $1。$2${NC}"
        exit 1
    fi
}

echo -e "${CYAN}检查依赖...${NC}"
need_cmd python3 "请先安装 Python 3.12（建议 pyenv 环境 lumiHarbor）"
need_cmd npm "请先安装 Node.js 18+"

if [ ! -f backend/.env ]; then
    echo -e "${RED}错误: 缺少 backend/.env，请复制 backend/.env.example 后填写${NC}"
    exit 1
fi

if ! python3 -c "import fastapi, uvicorn, taskiq" >/dev/null 2>&1; then
    echo -e "${RED}错误: 当前 Python 缺少后端依赖。请激活虚拟环境后执行:${NC}"
    echo "  cd backend && pip install -r requirements.txt"
    exit 1
fi

if [ ! -d frontend/node_modules ]; then
    echo -e "${BLUE}[前端] 未找到 node_modules，正在 npm install...${NC}"
    (cd frontend && npm install)
fi

if ! command -v ffmpeg >/dev/null 2>&1; then
    echo -e "${YELLOW}警告: 未找到 ffmpeg，视频元数据/缩略图会失败${NC}"
fi

if command -v docker >/dev/null 2>&1; then
    if ! curl -sf --max-time 2 http://localhost:6333/readyz >/dev/null 2>&1; then
        echo -e "${CYAN}启动 Qdrant (docker compose)...${NC}"
        docker compose up -d qdrant
    else
        echo -e "${GREEN}Qdrant 已在 6333 就绪${NC}"
    fi
else
    echo -e "${YELLOW}警告: 未找到 docker，人脸检索需要自行启动 Qdrant${NC}"
fi

echo -e "${GREEN}[后端] 启动 (端口 8000，含 Taskiq Worker)...${NC}"
(
    cd backend
    python3 run.py 2>&1 | sed "s/^/$(printf "${RED}[后端]${NC} ")/"
) &
BACKEND_PID=$!

echo -e "${BLUE}[前端] 启动 (端口 3000)...${NC}"
(
    cd frontend
    npm run dev 2>&1 | sed "s/^/$(printf "${BLUE}[前端]${NC} ")/"
) &
FRONTEND_PID=$!

echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  拾光坞 (LumiHarbor) 开发服务器${NC}"
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  前端: http://localhost:3000${NC}"
echo -e "${CYAN}  后端: http://localhost:8000${NC}"
echo -e "${CYAN}  文档: http://localhost:8000/docs${NC}"
echo -e "${CYAN}  按 Ctrl+C 停止前后端（含 Worker）${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

wait
