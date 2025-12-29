-- 拾光坞 (LumiHarbor) 数据库初始化脚本 - MySQL 8.0

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'member', -- admin, member, guest
    avatar_url VARCHAR(500),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 多模态资源表 (Assets)
CREATE TABLE IF NOT EXISTS assets (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    owner_id BIGINT NOT NULL, -- 创作者所有权
    original_path VARCHAR(1000) NOT NULL, -- NAS 物理相对路径
    thumbnail_path VARCHAR(1000),
    asset_type VARCHAR(20) NOT NULL, -- image, video, audio
    file_size BIGINT,
    mime_type VARCHAR(100),
    phash VARCHAR(64), -- 感知哈希用于去重
    exif_data JSON, -- 存储相机元数据
    gps_lat DOUBLE,
    gps_lng DOUBLE,
    city VARCHAR(100),
    address VARCHAR(500),
    ai_tags JSON, -- AI 自动标签 (JSON 数组)
    shot_at DATETIME, -- 拍摄时间
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME, -- 软删除
    INDEX idx_owner_id (owner_id),
    INDEX idx_shot_at (shot_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 叙事笔记表 (Notes)
CREATE TABLE IF NOT EXISTS notes (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    owner_id BIGINT NOT NULL,
    title VARCHAR(255),
    content TEXT NOT NULL,
    is_encrypted BOOLEAN DEFAULT FALSE,
    related_assets JSON, -- 关联资源列表 (JSON 数组)
    shot_at DATETIME, -- 叙事发生时间
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    INDEX idx_owner_id (owner_id),
    INDEX idx_shot_at (shot_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
