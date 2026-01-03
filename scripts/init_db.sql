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
    shot_at DATETIME COMMENT '拍摄时间',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否删除（软删除标记）',

    -- 索引
    INDEX idx_created_by (created_by),
    INDEX idx_file_hash (file_hash),
    INDEX idx_original_path (original_path),
    INDEX idx_shot_at (shot_at),
    INDEX idx_file_hash_not_deleted (file_hash, is_deleted),
    INDEX idx_original_path_not_deleted (original_path, is_deleted),
    INDEX idx_created_by_shot_at (created_by, shot_at)

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
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否删除（软删除标记）',

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
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否删除（软删除标记）',

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
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否删除（软删除标记）',

    INDEX idx_created_by (created_by),
    INDEX idx_shot_at (shot_at)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='叙事笔记表';

-- ==========================================
-- 相册表
-- ==========================================
CREATE TABLE IF NOT EXISTS albums (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '相册唯一ID',

    -- 基础信息
    name VARCHAR(255) NOT NULL COMMENT '相册名称',
    description TEXT COMMENT '相册描述',

    -- 时间范围（自动维护）
    start_time DATETIME COMMENT '相册开始时间（素材最早拍摄时间）',
    end_time DATETIME COMMENT '相册结束时间（素材最晚拍摄时间）',

    -- 封面设置
    cover_asset_id BIGINT COMMENT '封面素材ID（自动选择或手动指定）',

    -- 权限控制
    visibility VARCHAR(20) DEFAULT 'general' COMMENT '可见性: general(公共), private(私有)',
    created_by BIGINT NOT NULL COMMENT '创建者用户ID',

    -- 时间戳
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否删除（软删除标记）',

    -- 索引
    INDEX idx_created_by (created_by),
    INDEX idx_start_time (start_time),
    INDEX idx_end_time (end_time),
    INDEX idx_time_range (start_time, end_time),
    INDEX idx_cover_asset_id (cover_asset_id)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='相册表';

-- ==========================================
-- 相册素材关联表
-- ==========================================
CREATE TABLE IF NOT EXISTS album_assets (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '关联记录ID',

    album_id BIGINT NOT NULL COMMENT '相册ID',
    asset_id BIGINT NOT NULL COMMENT '素材ID',

    -- 排序字段（用于相册内素材排序）
    sort_order INT DEFAULT 0 COMMENT '排序顺序（数字越小越靠前）',

    -- 时间戳
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '添加时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否删除（软删除标记）',

    -- 索引
    INDEX idx_album_id (album_id),
    INDEX idx_asset_id (asset_id),
    INDEX idx_album_sort (album_id, sort_order),
    UNIQUE KEY uk_album_asset (album_id, asset_id)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='相册素材关联表';
