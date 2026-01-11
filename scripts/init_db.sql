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
    original_path VARCHAR(255) NOT NULL COMMENT 'NAS 物理相对路径',
    thumbnail_path VARCHAR(255) COMMENT '缩略图路径',
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
    is_deleted BOOLEAN NOT NULL DEFAULT '0' COMMENT '是否删除（软删除标记）',

    -- 索引
    INDEX idx_created_by (created_by),
    INDEX idx_file_hash (file_hash),
    INDEX idx_original_path (original_path(255)),
    INDEX idx_shot_at (shot_at),
    INDEX idx_file_hash_not_deleted (file_hash, is_deleted),
    INDEX idx_original_path_not_deleted (original_path(255), is_deleted),
    INDEX idx_created_by_shot_at (created_by, shot_at)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='资源核心表';

-- ==========================================
-- 标签元数据定义表
-- ==========================================
CREATE TABLE IF NOT EXISTS tag_definitions (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '标签定义ID',
    tag_key VARCHAR(100) UNIQUE NOT NULL COMMENT '标签键名（唯一）: gps_lat, camera_model, ai_tag_person',
    tag_name VARCHAR(200) NOT NULL COMMENT '标签显示名称: GPS纬度, 相机型号, AI人物标签',
    input_type INT(11) DEFAULT NULL COMMENT '输入组件类型：1:TextInput、2:TreeSelect、3:DateRangePicker',
    extra_info JSON COMMENT '扩展信息（JSON格式）: {"min": -90, "max": 90, "options": [...], "placeholder": "..."}',
    description TEXT COMMENT '标签描述',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT '0' COMMENT '是否删除（软删除标记）',

    INDEX idx_tag_key (tag_key),
    INDEX idx_input_type (input_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='标签元数据定义表';

-- ==========================================
-- 资源模板与标签关联表
-- ==========================================
CREATE TABLE IF NOT EXISTS asset_template_tags (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '关联记录ID',
    template_type VARCHAR(20) NOT NULL COMMENT '模板类型: image, video, audio',
    tag_key VARCHAR(100) NOT NULL COMMENT '标签键名',
    sort_order INT DEFAULT 0 COMMENT '排序顺序（前端展示）',
    is_required BOOLEAN DEFAULT '0' COMMENT '是否必填标签',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT '0' COMMENT '是否删除（软删除标记）',
    INDEX idx_template_type (template_type),
    INDEX idx_tag_key (tag_key),
    UNIQUE KEY uk_template_tag (template_type, tag_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='资源模板与标签关联表';

-- ==========================================
-- 资源标签关联表
-- ==========================================
CREATE TABLE IF NOT EXISTS asset_tags (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '关联记录ID',
    asset_id BIGINT NOT NULL COMMENT '资源ID',
    tag_key VARCHAR(100) NOT NULL COMMENT '标签键名',
    tag_value MEDIUMTEXT COMMENT '标签值',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT '0' COMMENT '是否删除（软删除标记）',
    INDEX idx_asset_id (asset_id),
    INDEX idx_tag_key (tag_key),
    UNIQUE KEY uk_asset_tag (asset_id, tag_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='资源标签关联表';

-- ==========================================
-- 叙事笔记表
-- ==========================================
CREATE TABLE IF NOT EXISTS notes (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    created_by BIGINT NOT NULL COMMENT '创建者用户ID',
    title VARCHAR(255),
    content TEXT NOT NULL,
    is_encrypted BOOLEAN DEFAULT '0',
    related_assets JSON COMMENT '关联资源列表 (JSON 数组)',
    shot_at DATETIME COMMENT '叙事发生时间',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT '0' COMMENT '是否删除（软删除标记）',

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
    is_deleted BOOLEAN NOT NULL DEFAULT '0' COMMENT '是否删除（软删除标记）',

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
    is_deleted BOOLEAN NOT NULL DEFAULT '0' COMMENT '是否删除（软删除标记）',

    -- 索引
    INDEX idx_album_id (album_id),
    INDEX idx_asset_id (asset_id),
    INDEX idx_album_sort (album_id, sort_order),
    UNIQUE KEY uk_album_asset (album_id, asset_id)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='相册素材关联表';

-- ==========================================
-- 全局标签定义（可跨类型复用）
-- ==========================================

-- 相机/设备信息类 (3个)
INSERT INTO tag_definitions (tag_key, tag_name, input_type, extra_info, description) VALUES
('device_model', '设备型号', 1, JSON_OBJECT('placeholder', '如: iPhone 15 Pro, Canon EOS R5'), '拍摄设备型号'),
('lens_model', '镜头型号', 1, JSON_OBJECT('placeholder', '如: EF 24-70mm f/2.8L'), '使用的镜头型号');

-- 拍摄参数类 (6个)
INSERT INTO tag_definitions (tag_key, tag_name, input_type, extra_info, description) VALUES
('exposure_time', '快门速度', 1, JSON_OBJECT('placeholder', '如: 1/125, 1/500'), '曝光时间'),
('aperture', '光圈值', 1, JSON_OBJECT('placeholder', '如: f/2.8, f/5.6'), '光圈大小'),
('iso', 'ISO感光度', 1, JSON_OBJECT('placeholder', '如: 100, 400'), 'ISO设置'),
('focal_length', '焦距', 1, JSON_OBJECT('placeholder', '如: 50mm, 24mm'), '镜头焦距');

-- GPS位置类 (3个)
INSERT INTO tag_definitions (tag_key, tag_name, input_type, extra_info, description) VALUES
('gps_latitude', 'GPS纬度', 1, JSON_OBJECT('placeholder', '如: 121.472644'), '拍摄位置纬度'),
('gps_longitude', 'GPS经度', 1, JSON_OBJECT('placeholder', '如: 31.231706'), '拍摄位置经度'),
('gps_altitude', 'GPS海拔', 1, JSON_OBJECT('placeholder', '如: 134189/22602'), '拍摄位置海拔');

-- 地点信息类 (6个，基于逆地理编码)
INSERT INTO tag_definitions (tag_key, tag_name, input_type, extra_info, description) VALUES
('location_country', '国家', 1, JSON_OBJECT('placeholder', '如: 中国'), '拍摄地点所属国家'),
('location_province', '省份', 1, JSON_OBJECT('placeholder', '如: 北京市'), '拍摄地点所属省份/州'),
('location_city', '城市', 1, JSON_OBJECT('placeholder', '如: 北京市'), '拍摄地点所属城市'),
('location_district', '区县', 1, JSON_OBJECT('placeholder', '如: 东城区'), '拍摄地点所属区县'),
('location_poi', '地标', 1, JSON_OBJECT('placeholder', '如: 故宫博物院'), '拍摄地点的地标'),
('location_formatted', '完整地址', 1, JSON_OBJECT('placeholder', '如: 北京市东城区故宫'), '格式化的完整地址');

-- 媒体属性类 (4个)
INSERT INTO tag_definitions (tag_key, tag_name, input_type, extra_info, description) VALUES
('width', '宽度', 1, JSON_OBJECT('placeholder', '如: 1280'), '媒体宽度（像素）'),
('height', '高度', 1, JSON_OBJECT('placeholder', '如: 720'), '媒体高度（像素）'),
('duration', '时长', 1, JSON_OBJECT('placeholder', '如: 00:02:30'), '视频/音频时长'),
('aspect_ratio', '宽高比', 1, JSON_OBJECT('placeholder', '如: 1.78'), '宽度/高度的比值');

-- ==========================================
-- Image 模板标签配置（12个）
-- ==========================================
INSERT INTO asset_template_tags (template_type, tag_key, sort_order, is_required) VALUES
-- 设备信息
('image', 'device_model', 2, FALSE),
('image', 'lens_model', 3, FALSE),

-- 拍摄参数
('image', 'exposure_time', 4, FALSE),
('image', 'aperture', 5, FALSE),
('image', 'iso', 6, FALSE),
('image', 'focal_length', 7, FALSE),

-- GPS
('image', 'gps_latitude', 10, FALSE),
('image', 'gps_longitude', 11, FALSE),
('image', 'gps_altitude', 12, FALSE),

-- 地点信息（基于 GPS 逆地理编码）
('image', 'location_country', 13, FALSE),
('image', 'location_province', 14, FALSE),
('image', 'location_city', 15, FALSE),
('image', 'location_district', 16, FALSE),
('image', 'location_poi', 17, FALSE),
('image', 'location_formatted', 18, FALSE),
('image', 'width', 19, FALSE),
('image', 'height', 20, FALSE),
('image', 'aspect_ratio', 21, FALSE);


-- ==========================================
-- Video 模板标签配置（14个）
-- ==========================================
INSERT INTO asset_template_tags (template_type, tag_key, sort_order, is_required) VALUES
-- 设备信息
('video', 'device_model', 2, FALSE),

-- GPS（视频也可能有GPS）
('video', 'gps_latitude', 3, FALSE),
('video', 'gps_longitude', 4, FALSE),
('video', 'gps_altitude', 5, FALSE),

-- 地点信息（基于 GPS 逆地理编码）
('video', 'location_country', 6, FALSE),
('video', 'location_province', 7, FALSE),
('video', 'location_city', 8, FALSE),
('video', 'location_district', 9, FALSE),
('video', 'location_poi', 10, FALSE),
('video', 'location_formatted', 11, FALSE),

-- 媒体属性
('video', 'width', 12, FALSE),
('video', 'height', 13, FALSE),
('video', 'duration', 14, FALSE),
('video', 'aspect_ratio', 15, FALSE);

-- ==========================================
-- 异步任务日志表（通用）
-- ==========================================
CREATE TABLE IF NOT EXISTS task_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '任务日志ID',

    -- 任务标识
    task_type VARCHAR(50) NOT NULL COMMENT '任务类型: phash, geocoding, face_detection 等',
    task_status VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '任务状态: pending, running, success, failed',

    -- 关联资源
    asset_id BIGINT NOT NULL COMMENT '关联的资源ID',

    -- 任务参数（JSON 格式，适配不同任务类型）
    task_params JSON COMMENT '任务参数，如: {"latitude": 39.9042, "longitude": 116.4074}',

    -- 重试机制
    retry_count INT DEFAULT 0 COMMENT '当前重试次数',
    max_retries INT DEFAULT 3 COMMENT '最大重试次数',

    -- 执行结果
    error_message TEXT COMMENT '错误信息（仅失败时记录）',
    executed_at DATETIME COMMENT '最后执行时间',

    -- 时间戳
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

    -- 索引
    INDEX idx_asset_id (asset_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='异步任务日志表';

-- ==========================================
-- 用户收藏表（多对多关系）
-- ==========================================
CREATE TABLE IF NOT EXISTS user_favorites (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '收藏记录ID',
    user_id BIGINT NOT NULL COMMENT '用户ID（关联 users 表）',
    asset_id BIGINT NOT NULL COMMENT '素材ID（关联 assets 表）',
    favorited_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '收藏时间',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE COMMENT '软删除标记',

    -- 唯一约束：同一用户不能重复收藏同一素材
    UNIQUE KEY uk_user_asset (user_id, asset_id),

    -- 性能索引：查询某用户的收藏列表（按时间排序）
    INDEX idx_user_favorited (user_id, favorited_at DESC),

    -- 性能索引：查询某素材被多少人收藏
    INDEX idx_asset_id (asset_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户收藏表';
