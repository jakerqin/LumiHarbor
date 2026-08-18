# 拾光坞 (LumiHarbor) - 个人与家庭足迹记忆管理系统

> **收集时光碎片，归航家庭港湾。**
> A secure, private, and intelligent memory harbor for your family footprints.

[![Status](https://img.shields.io/badge/Status-In%20Development-blue)](https://github.com/your-repo/lumiharbor)
[![Stack](https://img.shields.io/badge/Stack-FastAPI%20%7C%20Next.js%20%7C%20MySQL-green)](./plans/technical_design.md)
[![License](https://img.shields.io/badge/License-MIT-orange)]()

## 📖 项目简介

**拾光坞 (LumiHarbor)** 是一个专为家庭设计的私有化记忆管理系统。它不仅是一个简单的网络相册，更是一个深度集成了 **AI 智能** 与 **时光轴叙事** 的家庭情感资产中心。

该项目基于 **NAS/Docker 私有云** 部署架构，致力于在保护家庭数据隐私的前提下，通过技术让冰冷的数字文件重新焕发生命力。

### ✨ 核心价值
*   **安全归航 (Secure)**：数据完全私有，基于 NAS 本地存储，无云端泄露风险。
*   **拾光叙事 (Narrative)**：打破照片与笔记的界限，通过 AI 自动聚合与时光轴（Timeline）重构家庭记忆。
*   **智能连接 (Intelligent)**：内置本地化 AI 引擎，实现人脸识别、场景打标与自然语言搜索。

---

## 🚀 当前功能 (v0.2)

### 🎨 前端界面 (已完成)

#### 首页 - 垂直滚动三大区域
*   **精选照片墙**：Dome Gallery
*   **足迹地图预览**：高德 2D，点进 `/map`
*   **大事记时间轴**：按年份分组的垂直时间线

#### 核心功能页面
*   **素材库**：网格展示所有照片/视频，支持类型、地点、标签、排序筛选，分页浏览
*   **相册管理**：相册列表 + 详情页，全屏封面展示，支持创建相册
*   **笔记系统**：双视图模式（网格视图/时间轴视图），支持封面图和多标签

#### 交互特性
*   **Spotlight 搜索**：`Cmd+K` / `/` 快捷键唤醒，全局搜索素材/相册/笔记，键盘导航支持
*   **右侧 Dock 导航**：macOS 风格，Hover 交互，7 个导航项 + 快捷键提示
*   **深色主题**：Apple Vision Pro 风格，Glass Morphism 效果，流畅动画

### 🛠️ 后端架构 (已完成)

#### 核心功能
*   **全栈容器化**：基于 Docker Compose 的一键部署方案，集成 Backend、Frontend、Database、Cache
*   **多模态数据模型**：支持图片、视频、GPS 地理位置及 AI 标签的数据库 Schema

#### 素材导入系统
*   **智能扫描**：自动递归扫描 NAS 指定目录下的历史照片与视频
*   **元数据深度解析**：自动提取 EXIF 信息（相机型号、光圈快门、ISO）和拍摄时间
*   **高性能预览**：自动生成 WebP 缩略图，优化加载性能
*   **异步任务流**：Taskiq + Redis 实现后台无阻塞批量导入
*   **标签系统**：基于模板的标签系统，支持 15 个预定义全局标签，跨类型复用

#### 智能处理
*   **文件哈希去重**：SHA256 精确去重，大文件采样哈希优化
*   **感知哈希**：基于 average_hash 的相似度搜索
*   **视频处理**：智能 seek 策略生成缩略图，兼容所有时长视频

---

## 🛠️ 技术栈

### 后端
*   **语言**: Python 3.12.9
*   **框架**: FastAPI + SQLAlchemy + Pydantic
*   **异步任务**: Taskiq + Redis
*   **数据库**: MySQL 8.0
*   **元数据提取**: exifread (图片) + ffmpeg (视频)
*   **图像处理**: Pillow + imagehash
*   **缩略图**: WebP 格式

### 前端
*   **框架**: Next.js 16 (App Router) + TypeScript
*   **样式**: Tailwind CSS + 自定义深色主题
*   **图标**: lucide-react
*   **字体**: Space Grotesk (英文) + Noto Sans SC (中文)
*   **动画**: GSAP
*   **状态管理**: TanStack Query
*   **HTTP 客户端**: Axios
*   **日期处理**: date-fns

### 基础设施
*   **容器化**: Docker + Docker Compose
*   **缓存/队列**: Redis 7
*   **AI 处理**: InsightFace (Planned), CLIP (Planned)

---

## ⚡ 快速启动 (Quick Start)

### 前置要求
*   Docker & Docker Compose (推荐)
*   Python 3.12.9 (本地开发)
*   Node.js 18+ (前端开发)
*   **ffmpeg** (视频缩略图生成，必需)

### 1. 克隆项目
```bash
git clone https://github.com/your-username/lumiharbor.git
cd lumiharbor
```

### 2. 安装系统依赖

#### ffmpeg 安装

视频缩略图生成功能依赖 **ffmpeg**，请根据你的操作系统安装：

**macOS (使用 Homebrew):**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install ffmpeg
```

**CentOS/RHEL/Fedora:**
```bash
sudo yum install ffmpeg
# 或
sudo dnf install ffmpeg
```

**Windows:**
1. 从 [ffmpeg官网](https://ffmpeg.org/download.html) 下载预编译包
2. 解压到任意目录（如 `C:\ffmpeg`）
3. 将 `bin` 目录添加到系统环境变量 `PATH` 中
4. 重启命令行工具并验证：
   ```bash
   ffmpeg -version
   ```

**验证安装:**
```bash
ffmpeg -version
# 输出应显示 ffmpeg 版本信息
```

**Docker 环境:**
如果使用 Docker 部署，ffmpeg 已包含在镜像中，无需手动安装。

### 3. 环境配置

#### 后端环境变量
```bash
cp backend/.env.example backend/.env
# 编辑 backend/.env 设置 NAS_DATA_PATH=/path/to/your/photos
```

#### 前端环境变量
```bash
cp frontend/.env.local.example frontend/.env.local
# 默认配置：NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 4. 运行项目

#### 方式 A：Docker 模式 (推荐，全栈环境)
```bash
docker-compose up -d --build
```
启动后：
*   **前端页面**: `http://localhost:3000`
*   **后端 API 文档**: `http://localhost:8000/docs`

#### 方式 B：本地开发模式

**后端启动：**

建议使用 `pyenv` 创建独立的虚拟环境：

1. **创建并激活环境**:
```bash
pyenv install 3.12.9
pyenv virtualenv 3.12.9 lumiHarbor
pyenv activate lumiHarbor
```

2. **安装依赖**:
```bash
cd backend
pip install -r requirements.txt
```

3. **初始化数据库表**:
```bash
cd backend
python -m scripts.init_db
```

4. **启动后端服务**:
```bash
cd backend
python run.py
# 或
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**前端启动：**

1. **安装依赖**:
```bash
cd frontend
npm install
```

2. **启动开发服务器**:
```bash
npm run dev
```

前端将在 `http://localhost:3000` 启动，后端 API 在 `http://localhost:8000`

### 5. 导入历史照片

服务启动后，调用 API 触发扫描你的 NAS 目录：

```bash
# owner_id 可在数据库 users 表生成或暂时使用任意整数
curl -X POST "http://localhost:8000/api/ingestion/scan" \
  -H "Content-Type: application/json" \
  -d '{
    "path": "/path/to/your/photos",
    "owner_id": 1,
    "recursive": true
  }'
```

### 6. 体验前端功能

访问 `http://localhost:3000`，使用右侧 Dock 导航：

*   🏠 **首页** - 精选照片墙 + 3D 足迹 + 大事记时间轴
*   🖼️ **素材库** (`/assets`) - 浏览所有照片和视频，支持筛选
*   📂 **相册** (`/albums`) - 相册列表和详情页
*   📝 **笔记** (`/notes`) - 网格视图和时间轴视图

**快捷键：**
*   `Cmd+K` 或 `Ctrl+K` - 打开 Spotlight 搜索
*   `/` - 打开 Spotlight 搜索（焦点不在输入框时）
*   `ESC` - 关闭 Spotlight 搜索

---

## 🗺️ 开发路线图 (Roadmap)

- [x] **v0.1**: 核心架构搭建，数据库设计，历史素材扫描与元数据提取
- [x] **v0.2**: 前端 Next.js 界面（首页三大区域、素材库、相册、笔记、Spotlight 搜索）
- [ ] **v0.3**: 后端 API 完善（素材/相册/笔记 CRUD，与前端联调）
- [ ] **v0.4**: 集成 InsightFace 实现本地人脸聚类
- [ ] **v0.5**: 实现"地图足迹"与"那年今日"功能
- [ ] **v0.6**: 完善家庭权限体系与多人协作功能

---

## 📁 项目结构

```
PersonalLifeFlow/
├── backend/                    # 后端服务
│   ├── app/                   # 应用核心代码
│   │   ├── routers/          # API 路由
│   │   ├── services/         # 业务逻辑（元数据、缩略图、标签）
│   │   ├── model/            # 数据库模型
│   │   ├── schema/           # Pydantic 模型
│   │   ├── tasks/            # 异步任务（Taskiq）
│   │   └── tools/            # 工具函数（哈希计算）
│   ├── tests/                # 测试
│   ├── scripts/              # 脚本工具
│   ├── requirements.txt      # Python 依赖
│   └── run.py               # 启动脚本
├── frontend/                  # 前端应用
│   ├── app/                  # Next.js App Router
│   │   ├── (main)/          # 主应用路由
│   │   ├── layout.tsx       # 根布局
│   │   └── globals.css      # 全局样式
│   ├── components/           # React 组件
│   │   ├── layout/          # 布局组件（Dock 导航）
│   │   ├── search/          # 搜索组件（Spotlight）
│   │   ├── home/            # 首页组件
│   │   ├── assets/          # 素材库组件
│   │   ├── albums/          # 相册组件
│   │   └── notes/           # 笔记组件
│   ├── lib/                 # 库文件
│   │   ├── api/             # API 客户端
│   │   └── utils/           # 工具函数
│   ├── package.json         # Node 依赖
│   └── tailwind.config.ts   # Tailwind 配置
├── plans/                    # 产品文档
│   ├── prd_outline.md       # PRD
│   └── technical_design.md  # 技术设计
├── docker-compose.yml        # Docker 编排
├── README.md                 # 本文档
└── CLAUDE.md                 # Claude 协作指南
```

---

## 📄 详细文档

*   **协作指南**: [CLAUDE.md](./CLAUDE.md) - Claude AI 协作开发指南
*   **产品需求**: [prd_outline.md](./plans/prd_outline.md) - 产品需求纲要
*   **技术设计**: [technical_design.md](./plans/technical_design.md) - 技术设计文档
*   **前端文档**: [frontend/README.md](./frontend/README.md) - 前端开发指南
*   **Taskiq 文档**: [backend/app/tasks/README.md](./backend/app/tasks/README.md) - 异步任务系统文档


---

## 📝 License

本项目采用 MIT 协议开源 - 详见 [LICENSE](LICENSE) 文件


---

**最后更新**: 2026-01-05
**当前版本**: v0.2.0

**v0.2.0 更新内容** (2026-01-05):
- ✅ 完成前端基础界面开发
- ✅ 实现首页三大区域（精选照片墙、3D 足迹地图、大事记时间轴）
- ✅ 实现素材库、相册、笔记三大功能页面
- ✅ 实现 Spotlight 全局搜索（Cmd+K 快捷键）
- ✅ 实现右侧 Dock 导航（macOS 风格）
- ✅ 深色主题 + Apple Vision Pro 风格设计
- ✅ 所有页面使用 Mock 数据，可独立运行
