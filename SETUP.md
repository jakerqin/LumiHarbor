# 🔧 环境配置指南

## 快速开始

### 1. 配置环境变量

```bash
# 复制示例配置文件
cp backend/.env.example backend/.env

# 编辑配置文件
vim backend/.env  # 或使用你喜欢的编辑器
```

**必须修改的配置项：**
- `DATABASE_URL`: 你的 MySQL 数据库连接信息
- `NAS_DATA_PATH`: 照片存储路径
- `SECRET_KEY`: 生成一个随机密钥（建议使用 `openssl rand -hex 32`）

### 2. 安装依赖

```bash
cd backend
pip install -r requirements.txt
```

### 3. 初始化数据库

```bash
cd backend
python scripts/init_db.py
```

### 4. 启动项目

```bash
cd backend
python -m app.main
```

访问 http://localhost:8000/docs 查看 API 文档

---

## 📝 关于 .gitignore

项目已配置 `.gitignore` 文件，以下文件和目录**不会**被提交到 Git：

### 敏感文件
- ✅ `.env` - 环境变量配置（包含密码等敏感信息）
- ✅ `*.key`, `*.pem` - 密钥文件

### 临时文件
- ✅ `__pycache__/` - Python 字节码缓存
- ✅ `*.pyc` - 编译后的 Python 文件
- ✅ `node_modules/` - Node.js 依赖
- ✅ `.DS_Store` - macOS 系统文件

### 数据文件
- ✅ `data/` - 数据库数据文件
- ✅ `processed/` - 处理后的缩略图
- ✅ `*.log` - 日志文件

### IDE 配置
- ✅ `.vscode/` - VS Code 配置
- ✅ `.idea/` - PyCharm 配置

---

## 🚨 重要提醒

**永远不要提交以下内容到 Git：**

1. **环境变量文件** (`.env`) - 包含数据库密码和密钥
2. **数据库文件** - 体积大且包含用户数据
3. **用户上传的照片** - 应该存储在 NAS 而不是代码仓库
4. **API 密钥和 Token** - 会导致安全风险

**如果不小心提交了敏感文件怎么办？**

```bash
# 从 Git 历史中移除（但保留本地文件）
git rm --cached 敏感文件路径

# 提交更改
git commit -m "Remove sensitive files"

# 如果已经推送到远程仓库，需要强制推送（危险操作！）
git push --force
```

---

## 📂 推荐的项目结构

```
LumiHarbor/
├── .gitignore              # Git 忽略规则
├── README.md               # 项目说明
├── SETUP.md                # 本文件
├── backend/
│   ├── .env.example        # 环境变量示例（可提交）
│   ├── .env                # 实际环境变量（不提交）
│   ├── app/
│   │   └── ...
│   └── requirements.txt
├── frontend/
│   └── ...
├── data/                   # 数据库数据（不提交）
├── scripts/
│   └── init_db.sql
└── docker-compose.yml
```

---

## 🔐 生成安全密钥

```bash
# 生成 SECRET_KEY
openssl rand -hex 32

# 或者使用 Python
python -c "import secrets; print(secrets.token_hex(32))"
```

---

## 📚 更多信息

- [FastAPI 文档](https://fastapi.tiangolo.com/zh/)
- [SQLAlchemy 文档](https://docs.sqlalchemy.org/)
- [Git .gitignore 规则](https://git-scm.com/docs/gitignore)
