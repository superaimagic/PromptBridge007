-- ============================================================
-- PromptMS Database Schema - MySQL 8.0
-- 普适性提示词管理系统 数据库建表脚本
-- ============================================================

CREATE DATABASE IF NOT EXISTS promptms
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE promptms;

-- -----------------------------------------------------------
-- 用户表
-- -----------------------------------------------------------
CREATE TABLE users (
    id              CHAR(36) PRIMARY KEY,
    username        VARCHAR(50) NOT NULL UNIQUE,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    nickname        VARCHAR(100),
    avatar          VARCHAR(500),
    status          TINYINT NOT NULL DEFAULT 1 COMMENT '1-active, 0-disabled',
    last_login_at   DATETIME DEFAULT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at      DATETIME DEFAULT NULL,
    INDEX idx_email (email),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- 角色表
-- -----------------------------------------------------------
CREATE TABLE roles (
    id              CHAR(36) PRIMARY KEY,
    name            VARCHAR(50) NOT NULL UNIQUE COMMENT 'SYSTEM_ADMIN, ORG_ADMIN, WORKFLOW_EDITOR, PROMPT_EDITOR, VIEWER',
    display_name    VARCHAR(100) NOT NULL,
    description     TEXT,
    permissions     JSON NOT NULL COMMENT 'Array of permission strings',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- 用户-角色关联表
-- -----------------------------------------------------------
CREATE TABLE user_roles (
    id              CHAR(36) PRIMARY KEY,
    user_id         CHAR(36) NOT NULL,
    role_id         CHAR(36) NOT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_role (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- 分类表（树形结构，用于Prompt分类）
-- -----------------------------------------------------------
CREATE TABLE categories (
    id              CHAR(36) PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    parent_id       CHAR(36) DEFAULT NULL,
    sort_order      INT NOT NULL DEFAULT 0,
    icon            VARCHAR(100),
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL,
    INDEX idx_parent (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- 标签表
-- -----------------------------------------------------------
CREATE TABLE tags (
    id              CHAR(36) PRIMARY KEY,
    name            VARCHAR(100) NOT NULL UNIQUE,
    color           VARCHAR(20) DEFAULT '#1890ff',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- 提示词表
-- -----------------------------------------------------------
CREATE TABLE prompts (
    id              CHAR(36) PRIMARY KEY,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    content         TEXT NOT NULL,
    variables       JSON DEFAULT NULL COMMENT '[{name, type, required, default, options}]',
    model_config    JSON DEFAULT NULL COMMENT '{model, provider, temperature, max_tokens, ...}',
    current_version INT NOT NULL DEFAULT 1,
    workspace_id    CHAR(36) DEFAULT NULL,
    created_by      CHAR(36) DEFAULT NULL,
    category_id     CHAR(36) DEFAULT NULL,
    visibility      VARCHAR(20) NOT NULL DEFAULT 'private' COMMENT 'private, workspace, public',
    metrics         JSON DEFAULT NULL COMMENT '{avg_score, usage_count, adopt_rate}',
    metadata        JSON DEFAULT NULL,
    deleted_at      DATETIME DEFAULT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    INDEX idx_created_by (created_by),
    INDEX idx_category (category_id),
    INDEX idx_visibility (visibility),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- Prompt-标签关联表
-- -----------------------------------------------------------
CREATE TABLE prompt_tags (
    prompt_id       CHAR(36) NOT NULL,
    tag_id          CHAR(36) NOT NULL,
    PRIMARY KEY (prompt_id, tag_id),
    FOREIGN KEY (prompt_id) REFERENCES prompts(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- 提示词版本表
-- -----------------------------------------------------------
CREATE TABLE prompt_versions (
    id              CHAR(36) PRIMARY KEY,
    prompt_id       CHAR(36) NOT NULL,
    version         INT NOT NULL,
    version_tag     VARCHAR(50) DEFAULT NULL COMMENT 'stable, beta, v1.0.0',
    content         TEXT NOT NULL,
    variables       JSON DEFAULT NULL,
    model_config    JSON DEFAULT NULL,
    change_type     VARCHAR(20) NOT NULL COMMENT 'create, update, restore',
    change_log      TEXT,
    execution_count INT NOT NULL DEFAULT 0,
    avg_score       DECIMAL(3,2) DEFAULT NULL,
    is_stable       TINYINT(1) NOT NULL DEFAULT 0,
    is_current      TINYINT(1) NOT NULL DEFAULT 1,
    created_by      CHAR(36) DEFAULT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_prompt_version (prompt_id, version),
    FOREIGN KEY (prompt_id) REFERENCES prompts(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_prompt_id (prompt_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- 工作流表
-- -----------------------------------------------------------
CREATE TABLE workflows (
    id              CHAR(36) PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    workspace_id    CHAR(36) DEFAULT NULL,
    created_by      CHAR(36) DEFAULT NULL,
    config          JSON DEFAULT NULL COMMENT 'Global workflow settings',
    input_schema    JSON DEFAULT NULL COMMENT 'Input parameter definitions',
    output_schema   JSON DEFAULT NULL COMMENT 'Output result definitions',
    current_version INT NOT NULL DEFAULT 1,
    is_published    TINYINT(1) NOT NULL DEFAULT 0,
    category        VARCHAR(100) DEFAULT NULL,
    role_id         CHAR(36) DEFAULT NULL COMMENT 'Associated role template',
    execution_count INT NOT NULL DEFAULT 0,
    avg_duration_ms INT DEFAULT NULL,
    deleted_at      DATETIME DEFAULT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_created_by (created_by),
    INDEX idx_published (is_published),
    INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- 工作流版本表
-- -----------------------------------------------------------
CREATE TABLE workflow_versions (
    id              CHAR(36) PRIMARY KEY,
    workflow_id     CHAR(36) NOT NULL,
    version         INT NOT NULL,
    definition      JSON NOT NULL COMMENT '{nodes: [], edges: []}',
    change_log      TEXT,
    created_by      CHAR(36) DEFAULT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_workflow_version (workflow_id, version),
    FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- 工作流-标签关联表
-- -----------------------------------------------------------
CREATE TABLE workflow_tags (
    workflow_id     CHAR(36) NOT NULL,
    tag_id          CHAR(36) NOT NULL,
    PRIMARY KEY (workflow_id, tag_id),
    FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- 工作流执行记录表
-- -----------------------------------------------------------
CREATE TABLE workflow_executions (
    id              CHAR(36) PRIMARY KEY,
    workflow_id     CHAR(36) NOT NULL,
    workflow_version INT NOT NULL DEFAULT 1,
    trigger_type    VARCHAR(30) NOT NULL COMMENT 'manual, scheduled, api, webhook',
    triggered_by    CHAR(36) DEFAULT NULL,
    trigger_context JSON DEFAULT NULL,
    status          VARCHAR(20) NOT NULL COMMENT 'pending, running, completed, failed, paused, cancelled',
    started_at      DATETIME NOT NULL,
    finished_at     DATETIME DEFAULT NULL,
    total_duration_ms INT DEFAULT NULL,
    input_data      JSON DEFAULT NULL,
    output_data     JSON DEFAULT NULL,
    error_message   TEXT,
    node_count      INT DEFAULT NULL,
    token_consumed  INT NOT NULL DEFAULT 0,
    cost_usd        DECIMAL(10,6) NOT NULL DEFAULT 0.000000,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workflow_id) REFERENCES workflows(id),
    FOREIGN KEY (triggered_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_workflow_id (workflow_id),
    INDEX idx_status (status),
    INDEX idx_triggered_by (triggered_by),
    INDEX idx_started_at (started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- 节点执行记录表
-- -----------------------------------------------------------
CREATE TABLE node_executions (
    id              CHAR(36) PRIMARY KEY,
    execution_id    CHAR(36) NOT NULL,
    node_id         VARCHAR(100) NOT NULL COMMENT 'Node ID from workflow definition',
    node_type       VARCHAR(50) NOT NULL,
    status          VARCHAR(20) NOT NULL COMMENT 'pending, running, completed, failed, skipped',
    started_at      DATETIME NOT NULL,
    finished_at     DATETIME DEFAULT NULL,
    duration_ms     INT DEFAULT NULL,
    input_data      JSON DEFAULT NULL,
    output_data     JSON DEFAULT NULL,
    model_id        VARCHAR(100) DEFAULT NULL,
    provider        VARCHAR(50) DEFAULT NULL,
    input_tokens    INT DEFAULT NULL,
    output_tokens   INT DEFAULT NULL,
    latency_ms      INT DEFAULT NULL,
    cost_usd        DECIMAL(10,6) DEFAULT NULL,
    error_type      VARCHAR(50) DEFAULT NULL,
    error_message   TEXT,
    retry_count     INT NOT NULL DEFAULT 0,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (execution_id) REFERENCES workflow_executions(id) ON DELETE CASCADE,
    INDEX idx_execution_id (execution_id),
    INDEX idx_node_type (node_type),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- 用户反馈表
-- -----------------------------------------------------------
CREATE TABLE user_feedbacks (
    id              CHAR(36) PRIMARY KEY,
    target_id       CHAR(36) NOT NULL,
    target_type     VARCHAR(20) NOT NULL COMMENT 'PROMPT, WORKFLOW, EXECUTION, NODE',
    feedback_type   VARCHAR(20) NOT NULL COMMENT 'adopt, modify, reject, rate, comment',
    rating          TINYINT DEFAULT NULL COMMENT '1-5',
    original_data   JSON DEFAULT NULL,
    modified_data   JSON DEFAULT NULL,
    rejection_reason TEXT DEFAULT NULL,
    comment         TEXT,
    commented_by    CHAR(36) DEFAULT NULL,
    context         JSON DEFAULT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (commented_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_target (target_id, target_type),
    INDEX idx_feedback_type (feedback_type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- 指标快照表
-- -----------------------------------------------------------
CREATE TABLE metric_snapshots (
    id              CHAR(36) PRIMARY KEY,
    entity_type     VARCHAR(30) NOT NULL COMMENT 'PROMPT, WORKFLOW, NODE, USER',
    entity_id       CHAR(36) NOT NULL,
    metric_name     VARCHAR(100) NOT NULL,
    value           DECIMAL(20,6) NOT NULL,
    value_type      VARCHAR(20) NOT NULL COMMENT 'count, sum, avg, max, min, ratio',
    dimensions      JSON DEFAULT NULL COMMENT '{role: "PM", model: "gpt-4"}',
    period_start    DATETIME NOT NULL,
    period_end      DATETIME NOT NULL,
    period_type     VARCHAR(20) NOT NULL COMMENT 'minute, hour, day, week, month',
    metadata        JSON DEFAULT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_metric_name (metric_name),
    INDEX idx_period (period_start, period_end)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- A/B测试配置表
-- -----------------------------------------------------------
CREATE TABLE ab_test_configs (
    id              CHAR(36) PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    target_id       CHAR(36) NOT NULL COMMENT 'prompt_id',
    target_type     VARCHAR(20) NOT NULL DEFAULT 'PROMPT',
    variants        JSON NOT NULL COMMENT '[{id: "A", prompt_version: x}, {id: "B", prompt_version: y}]',
    traffic_split   JSON NOT NULL COMMENT '{A: 0.5, B: 0.5}',
    split_strategy  VARCHAR(20) NOT NULL DEFAULT 'random' COMMENT 'random, user_hash, input_hash',
    primary_metric  VARCHAR(100) NOT NULL COMMENT 'adoption_rate, avg_score, latency',
    secondary_metrics JSON DEFAULT NULL,
    min_sample_size INT NOT NULL DEFAULT 30,
    max_duration_days INT DEFAULT NULL,
    significance_level DECIMAL(3,2) NOT NULL DEFAULT 0.05,
    status          VARCHAR(20) NOT NULL DEFAULT 'draft' COMMENT 'draft, running, completed, stopped',
    started_at      DATETIME DEFAULT NULL,
    ended_at        DATETIME DEFAULT NULL,
    winner          VARCHAR(10) DEFAULT NULL COMMENT 'A, B, null',
    created_by      CHAR(36) DEFAULT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (target_id) REFERENCES prompts(id),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_target (target_id, target_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- A/B测试结果表
-- -----------------------------------------------------------
CREATE TABLE ab_test_results (
    id              CHAR(36) PRIMARY KEY,
    test_id         CHAR(36) NOT NULL,
    variant_id      VARCHAR(10) NOT NULL,
    sample_size     INT NOT NULL,
    metric_results  JSON NOT NULL COMMENT '{adoption_rate: {value, ci_lower, ci_upper}}',
    p_value         DECIMAL(6,4) DEFAULT NULL,
    is_significant  TINYINT(1) DEFAULT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (test_id) REFERENCES ab_test_configs(id) ON DELETE CASCADE,
    INDEX idx_test_id (test_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- A/B测试分配记录表
-- -----------------------------------------------------------
CREATE TABLE ab_test_assignments (
    id              CHAR(36) PRIMARY KEY,
    test_id         CHAR(36) NOT NULL,
    variant_id      VARCHAR(10) NOT NULL,
    user_id         CHAR(36) DEFAULT NULL,
    execution_id    CHAR(36) DEFAULT NULL,
    assigned_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (test_id) REFERENCES ab_test_configs(id) ON DELETE CASCADE,
    INDEX idx_test_variant (test_id, variant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- 岗位模板表
-- -----------------------------------------------------------
CREATE TABLE role_templates (
    id              CHAR(36) PRIMARY KEY,
    name            VARCHAR(100) NOT NULL COMMENT 'PM, Operations, Customer Service, HR, Developer, Designer',
    display_name    VARCHAR(100) NOT NULL,
    description     TEXT,
    icon            VARCHAR(100),
    workflow_ids    JSON DEFAULT NULL COMMENT 'Array of workflow IDs',
    prompt_ids      JSON DEFAULT NULL COMMENT 'Array of prompt IDs',
    metrics_config  JSON DEFAULT NULL COMMENT 'Metrics tracked for this role',
    is_builtin      TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1=system preset, 0=user created',
    sort_order      INT NOT NULL DEFAULT 0,
    created_by      CHAR(36) DEFAULT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_is_builtin (is_builtin)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- 分析报告表
-- -----------------------------------------------------------
CREATE TABLE analysis_reports (
    id              CHAR(36) PRIMARY KEY,
    report_type     VARCHAR(50) NOT NULL COMMENT 'effect_analysis, ab_test, optimization, trend',
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    entity_type     VARCHAR(30) DEFAULT NULL,
    entity_id       CHAR(36) DEFAULT NULL,
    period_start    DATETIME NOT NULL,
    period_end      DATETIME NOT NULL,
    summary         JSON NOT NULL,
    details         JSON DEFAULT NULL,
    recommendations JSON DEFAULT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'draft' COMMENT 'draft, published, archived',
    created_by      CHAR(36) DEFAULT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_report_type (report_type),
    INDEX idx_entity (entity_type, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
