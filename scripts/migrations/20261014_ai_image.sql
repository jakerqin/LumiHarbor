-- 已有库升级：AI 修图 / 生图（2026-10）
-- 在 lumiharbor 库执行；可重复执行前请确认 current_version_id 列尚未添加
ALTER TABLE assets ADD COLUMN current_version_id BIGINT DEFAULT NULL COMMENT '当前展示版本ID（asset_versions），空为原图';

CREATE TABLE IF NOT EXISTS asset_versions (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '版本ID',
    asset_id BIGINT NOT NULL COMMENT '素材ID（应用层关联，无 FK）',
    kind VARCHAR(20) NOT NULL COMMENT 'original | ai_edit',
    job_id BIGINT DEFAULT NULL COMMENT '生成它的 ai_image_jobs.id',
    file_path VARCHAR(255) DEFAULT NULL COMMENT '版本大图相对路径（original 为空，用素材原图）',
    thumbnail_path VARCHAR(255) DEFAULT NULL COMMENT '缩略图相对路径',
    preview_path VARCHAR(255) DEFAULT NULL COMMENT '预览图相对路径',
    width INT DEFAULT NULL,
    height INT DEFAULT NULL,
    created_by BIGINT NOT NULL COMMENT '创建者',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT 0 COMMENT '软删除',
    INDEX idx_asset_versions_asset_deleted (asset_id, is_deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='素材展示版本（原图永不改动）';

CREATE TABLE IF NOT EXISTS ai_image_jobs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '任务ID',
    job_type VARCHAR(20) NOT NULL COMMENT 'edit | generate',
    asset_id BIGINT DEFAULT NULL COMMENT '修图的源素材',
    reference_asset_ids JSON DEFAULT NULL COMMENT '生图参考素材ID列表',
    preset_code VARCHAR(50) DEFAULT NULL COMMENT '预设代码',
    prompt TEXT COMMENT '用户输入的描述',
    model VARCHAR(64) NOT NULL COMMENT '模型名',
    quality VARCHAR(20) NOT NULL COMMENT 'low | medium | high ...',
    size VARCHAR(20) DEFAULT NULL COMMENT 'WIDTHxHEIGHT 或 auto',
    status VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT 'pending | running | success | failed',
    error_message TEXT COMMENT '失败原因（面向用户）',
    result_version_id BIGINT DEFAULT NULL COMMENT '修图结果版本',
    result_asset_id BIGINT DEFAULT NULL COMMENT '生图结果素材',
    created_by BIGINT NOT NULL COMMENT '创建者',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_ai_image_jobs_user_created (created_by, created_at),
    INDEX idx_ai_image_jobs_asset (asset_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI 修图 / 生图任务';

INSERT IGNORE INTO task_definitions (task_code, name, description, run_mode, is_enabled, extra_info) VALUES
('ai_image', 'AI 修图与生图', '调用 OpenAI 图像模型修图、生图（会上传图片并产生费用）', 'async', TRUE, NULL);

INSERT IGNORE INTO tag_definitions (tag_key, tag_name, input_type, extra_info, description, source) VALUES
('ai_generated', 'AI 生成', 1, JSON_OBJECT('placeholder', '1'), '由 AI 生图产生的素材', 'system');
