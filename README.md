# 拾光坞 (LumiHarbor) - 个人与家庭足迹记忆管理系统

> **收集时光碎片，归航家庭港湾。**
> A secure, private, and intelligent memory harbor for your family footprints.

[![Status](https://img.shields.io/badge/Status-In%20Development-blue)](https://github.com/your-repo/lumiharbor)
[![Stack](https://img.shields.io/badge/Stack-FastAPI%20%7C%20Next.js%20%7C%20PostgreSQL-green)](./plans/technical_design.md)
[![License](https://img.shields.io/badge/License-MIT-orange)]()

## 📖 项目简介

**拾光坞 (LumiHarbor)** 是一个专为家庭设计的私有化记忆管理系统。它不仅是一个简单的网络相册，更是一个深度集成了 **AI 智能** 与 **时光轴叙事** 的家庭情感资产中心。

该项目基于 **NAS/Docker 私有云** 部署架构，致力于在保护家庭数据隐私的前提下，通过技术让冰冷的数字文件重新焕发生命力。

### ✨ 核心价值
*   **安全归航 (Secure)**：数据完全私有，基于 NAS 本地存储，无云端泄露风险。
*   **拾光叙事 (Narrative)**：打破照片与笔记的界限，通过 AI 自动聚合与时光轴（Timeline）重构家庭记忆。
*   **智能连接 (Intelligent)**：内置本地化 AI 引擎，实现人脸识别、场景打标与自然语言搜图。

---

## 🚀 当前功能 (v0.1)

目前系统处于基础架构与核心数据层建设阶段，已实现以下关键能力：

### 🛠️ 核心架构
*   **全栈容器化**：基于 Docker Compose 的一键部署方案，集成 Backend (FastAPI)、Frontend (Next.js)、Database (PostgreSQL) 与 Cache (Redis)。
*   **多模态数据模型**：设计了支持图片、视频、GPS 地理位置及 AI 标签的去中心化数据库 Schema。

### 💾 历史素材导入 (Historian Service)
*   **智能扫描**：自动递归扫描 NAS 指定目录下的历史照片与视频。
*   **元数据深度解析**：
    *   自动提取 **EXIF 信息**（相机型号、光圈快门、ISO）。
    *   自动解析 **拍摄时间**（优先使用 `DateTimeOriginal`，智能回退创建时间）。
*   **高性能预览**：导入时自动生成高效的 **WEBP 缩略图**，极大优化移动端浏览体验。
*   **异步任务流**：支持后台无阻塞批量导入海量素材。

---

## 🛠️ 技术栈

*   **Backend**: Python 3.12.9, FastAPI, SQLAlchemy, Pydantic, TaskIQ (Async Workers)
*   **Frontend**: Next.js 14, React, Tailwind CSS (Planned)
*   **Database**: PostgreSQL 15 (Metadata), Redis 7 (Queue)
*   **AI & Processing**: Pillow (Image), ExifRead (Metadata), InsightFace (Planned), CLIP (Planned)
*   **Infrastructure**: Docker, Docker Compose

---

## ⚡ 快速启动 (Quick Start)

### 前置要求
*   Docker & Docker Compose (推荐)
*   Python 3.12.9 (本地开发)
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
复制并重命名环境变量文件，根据你的环境修改（特别是 `NAS_DATA_PATH`）：

```bash
cp backend/.env.example backend/.env
# 编辑 backend/.env 设置 NAS_DATA_PATH=/path/to/your/photos
```

### 4. 运行项目

#### 方式 A：Docker 模式 (推荐，全栈环境)
```bash
docker-compose up -d --build
```
启动后：
*   **后端 API 文档**: `http://localhost:8000/docs`
*   **前端页面**: `http://localhost:3000`

#### 方式 B：本地开发模式 (仅后端)
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
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 5. 导入历史照片
服务启动后，调用 API 触发扫描你的 NAS 目录：

```bash
# owner_id 可在数据库 users 表生成或暂时使用任意 UUID
curl -X POST "http://localhost:8000/tasks/import-history?owner_id=your-uuid-here"
```

---

## 🗺️ 开发路线图 (Roadmap)

- [x] **v0.1**: 核心架构搭建，数据库设计，历史素材扫描与元数据提取。
- [ ] **v0.2**: 前端 Next.js 基础界面（时光轴预览、相册墙）。
- [ ] **v0.3**: 集成 InsightFace 实现本地人脸聚类。
- [ ] **v0.4**: 实现“地图足迹”与“那年今日”功能。
- [ ] **v0.5**: 完善家庭权限体系与多人协作功能。

---

## 📄 详细文档
*   [产品需求纲要 (PRD)](./plans/prd_outline.md)
*   [技术设计文档 (TDD)](./plans/technical_design.md)
