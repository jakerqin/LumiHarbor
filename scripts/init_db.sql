-- 拾光坞 (LumiHarbor) 数据库初始化脚本

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'member', -- admin, member, guest
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 多模态资源表 (Assets)
CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY,
    owner_id UUID NOT NULL, -- 创作者所有权
    original_path TEXT NOT NULL, -- NAS 物理相对路径
    thumbnail_path TEXT,
    asset_type VARCHAR(20) NOT NULL, -- image, video, audio
    file_size BIGINT,
    mime_type VARCHAR(50),
    phash VARCHAR(64), -- 感知哈希用于去重
    exif_data JSONB, -- 存储相机元数据
    gps_lat DOUBLE PRECISION,
    gps_lng DOUBLE PRECISION,
    city VARCHAR(100),
    address TEXT,
    ai_tags TEXT[], -- AI 自动标签
    shot_at TIMESTAMP WITH TIME ZONE, -- 拍摄时间
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE -- 软删除
);

-- 叙事笔记表 (Notes)
CREATE TABLE IF NOT EXISTS notes (
    id UUID PRIMARY KEY,
    owner_id UUID NOT NULL,
    title VARCHAR(255),
    content TEXT NOT NULL,
    is_encrypted BOOLEAN DEFAULT FALSE,
    related_assets UUID[], -- 关联资源列表
    shot_at TIMESTAMP WITH TIME ZONE, -- 叙事发生时间
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 创建索引优化查询
CREATE INDEX IF NOT EXISTS idx_assets_owner ON assets(owner_id);
CREATE INDEX IF NOT EXISTS idx_assets_shot_at ON assets(shot_at);
CREATE INDEX IF NOT EXISTS idx_notes_owner ON notes(owner_id);
CREATE INDEX IF NOT EXISTS idx_notes_shot_at ON notes(shot_at);
