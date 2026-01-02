-- ==========================================
-- 拾光坞 (LumiHarbor) 数据库设计 V2.0
-- 基于 EAV 模式的灵活资源管理系统
-- MySQL 8.0
-- ==========================================

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'member' COMMENT 'admin, member, guest',
    avatar_url VARCHAR(500),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- ==========================================
-- 核心资源表 (精简版)
-- ==========================================
CREATE TABLE IF NOT EXISTS assets (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '资源唯一ID',

    -- 核心物理属性（不可变）
    original_path VARCHAR(1000) NOT NULL COMMENT 'NAS 物理相对路径',
    thumbnail_path VARCHAR(1000) COMMENT '缩略图路径',

    -- 文件基础信息
    asset_type VARCHAR(20) NOT NULL COMMENT '资源类型: image, video, audio',
    mime_type VARCHAR(100) COMMENT 'MIME类型: image/jpeg, video/mp4',
    file_size BIGINT COMMENT '文件大小（字节）',
    phash VARCHAR(64) COMMENT '感知哈希（用于查找相似素材，如相似图片搜索）',
    file_hash VARCHAR(64) COMMENT '文件内容哈希（SHA256，用于精确去重）',

    -- 权限控制
    visibility VARCHAR(20) DEFAULT 'general' COMMENT '可见性: general(公共), private(私有)',

    created_by BIGINT NOT NULL COMMENT '创建者用户ID',
    -- 时间戳
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    status tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否删除（0：未删除，1：已删除）',

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='资源核心表';

-- ==========================================
-- 标签元数据定义表
-- ==========================================
CREATE TABLE IF NOT EXISTS tag_definitions (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '标签定义ID',

    -- 标签标识
    tag_key VARCHAR(100) UNIQUE NOT NULL COMMENT '标签键名（唯一）: gps_lat, camera_model, ai_tag_person',
    tag_name VARCHAR(200) NOT NULL COMMENT '标签显示名称: GPS纬度, 相机型号, AI人物标签',

    -- 前端展示配置
    input_type INT(11) DEFAULT NULL COMMENT '输入组件类型：1:TextInput、2:TreeSelect、3:DateRangePicker',
    extra_info JSON COMMENT '扩展信息（JSON格式）: {"min": -90, "max": 90, "options": [...], "placeholder": "..."}',

    -- 元信息
    description TEXT COMMENT '标签描述',

    -- 时间戳
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    status tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否删除（0：未删除，1：已删除）',

    -- 索引
    INDEX idx_tag_key (tag_key),
    INDEX idx_input_type (input_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='标签元数据定义表';

-- ==========================================
-- 资源标签关联表
-- ==========================================
CREATE TABLE IF NOT EXISTS asset_tags (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '关联记录ID',

    asset_id BIGINT NOT NULL COMMENT '资源ID',
    tag_id BIGINT NOT NULL COMMENT '标签定义ID',

    -- 多类型值存储（根据前端组件类型使用对应字段）
    tag_value mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '标签值',

    -- 时间戳
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    status tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否删除（0：未删除，1：已删除）',

    -- 索引
    INDEX idx_asset_id (asset_id),
    INDEX idx_tag_id (tag_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='资源标签关联表';

-- ==========================================
-- 叙事笔记表
-- ==========================================
CREATE TABLE IF NOT EXISTS notes (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    created_by BIGINT NOT NULL COMMENT '创建者用户ID',
    title VARCHAR(255),
    content TEXT NOT NULL,
    is_encrypted BOOLEAN DEFAULT FALSE,
    related_assets JSON COMMENT '关联资源列表 (JSON 数组)',
    shot_at DATETIME COMMENT '叙事发生时间',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_created_by (created_by),
    INDEX idx_shot_at (shot_at),

    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='叙事笔记表';
