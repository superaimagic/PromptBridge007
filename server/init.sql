CREATE DATABASE IF NOT EXISTS promptms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE promptms;

-- Drop existing tables in correct order (respecting foreign keys)
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS monitor_data;
DROP TABLE IF EXISTS monitor_alerts;
DROP TABLE IF EXISTS ab_test_results;
DROP TABLE IF EXISTS ab_tests;
DROP TABLE IF EXISTS node_executions;
DROP TABLE IF EXISTS executions;
DROP TABLE IF EXISTS workflow_versions;
DROP TABLE IF EXISTS workflows;
DROP TABLE IF EXISTS prompt_versions;
DROP TABLE IF EXISTS prompts;
DROP TABLE IF EXISTS role_templates;
DROP TABLE IF EXISTS user_feedbacks;
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS ab_test_assignments;
DROP TABLE IF EXISTS ab_test_configs;
DROP TABLE IF EXISTS analysis_reports;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS metric_snapshots;
DROP TABLE IF EXISTS prompt_tags;
DROP TABLE IF EXISTS tags;
DROP TABLE IF EXISTS workflow_executions;
DROP TABLE IF EXISTS workflow_tags;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(100),
  avatar VARCHAR(500),
  role ENUM('ADMIN','PROMPT_EDITOR','VIEWER') DEFAULT 'PROMPT_EDITOR',
  status ENUM('active','inactive','banned') DEFAULT 'active',
  last_login_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE prompts (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  content TEXT,
  description TEXT,
  category VARCHAR(50),
  tags JSON,
  variables JSON,
  is_template TINYINT(1) DEFAULT 0,
  status ENUM('draft','published','archived') DEFAULT 'draft',
  version INT DEFAULT 1,
  current_version_id VARCHAR(36),
  creator_id VARCHAR(36),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE prompt_versions (
  id VARCHAR(36) PRIMARY KEY,
  prompt_id VARCHAR(36) NOT NULL,
  version INT NOT NULL,
  title VARCHAR(200),
  content TEXT,
  description TEXT,
  variables JSON,
  changelog TEXT,
  created_by VARCHAR(36),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (prompt_id) REFERENCES prompts(id) ON DELETE CASCADE
);

CREATE TABLE workflows (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  definition JSON,
  status ENUM('draft','published','archived') DEFAULT 'draft',
  version INT DEFAULT 1,
  current_version_id VARCHAR(36),
  creator_id VARCHAR(36),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE workflow_versions (
  id VARCHAR(36) PRIMARY KEY,
  workflow_id VARCHAR(36) NOT NULL,
  version INT NOT NULL,
  name VARCHAR(200),
  description TEXT,
  definition JSON,
  changelog TEXT,
  created_by VARCHAR(36),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
);

CREATE TABLE executions (
  id VARCHAR(36) PRIMARY KEY,
  workflow_id VARCHAR(36) NOT NULL,
  workflow_version INT,
  status ENUM('pending','running','completed','failed','cancelled') DEFAULT 'pending',
  input JSON,
  output JSON,
  error TEXT,
  triggered_by VARCHAR(36),
  started_at DATETIME,
  completed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE,
  FOREIGN KEY (triggered_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE node_executions (
  id VARCHAR(36) PRIMARY KEY,
  execution_id VARCHAR(36) NOT NULL,
  node_id VARCHAR(50) NOT NULL,
  node_type VARCHAR(50) NOT NULL,
  status ENUM('pending','running','completed','failed','skipped') DEFAULT 'pending',
  input JSON,
  output JSON,
  error TEXT,
  duration_ms INT,
  started_at DATETIME,
  completed_at DATETIME,
  FOREIGN KEY (execution_id) REFERENCES executions(id) ON DELETE CASCADE
);

CREATE TABLE ab_tests (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  prompt_id VARCHAR(36),
  status ENUM('draft','running','completed','stopped') DEFAULT 'draft',
  variants JSON,
  winner_variant_id VARCHAR(36),
  metrics JSON,
  creator_id VARCHAR(36),
  started_at DATETIME,
  ended_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (prompt_id) REFERENCES prompts(id) ON DELETE SET NULL,
  FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE ab_test_results (
  id VARCHAR(36) PRIMARY KEY,
  test_id VARCHAR(36) NOT NULL,
  variant_id VARCHAR(50) NOT NULL,
  score DOUBLE NOT NULL,
  feedback TEXT,
  user_id VARCHAR(36),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (test_id) REFERENCES ab_tests(id) ON DELETE CASCADE
);

CREATE TABLE role_templates (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  system_prompt TEXT NOT NULL,
  variables JSON,
  example_values JSON,
  tags JSON,
  is_public TINYINT(1) DEFAULT 1,
  creator_id VARCHAR(36),
  usage_count INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE monitor_data (
  id VARCHAR(36) PRIMARY KEY,
  execution_id VARCHAR(36),
  node_id VARCHAR(50),
  metric_type ENUM('token_usage','latency','error_rate','cost','custom') NOT NULL,
  metric_value DECIMAL(15,4) NOT NULL,
  metric_unit VARCHAR(20),
  labels JSON,
  recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (execution_id) REFERENCES executions(id) ON DELETE SET NULL
);

CREATE TABLE monitor_alerts (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  `condition` JSON,
  status ENUM('active','resolved','muted') DEFAULT 'active',
  severity ENUM('info','warning','critical') DEFAULT 'warning',
  last_triggered_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_prompts_creator ON prompts(creator_id);
CREATE INDEX idx_prompts_status ON prompts(status);
CREATE INDEX idx_prompts_category ON prompts(category);
CREATE INDEX idx_prompt_versions_prompt ON prompt_versions(prompt_id);
CREATE INDEX idx_workflows_creator ON workflows(creator_id);
CREATE INDEX idx_workflows_status ON workflows(status);
CREATE INDEX idx_workflow_versions_workflow ON workflow_versions(workflow_id);
CREATE INDEX idx_executions_workflow ON executions(workflow_id);
CREATE INDEX idx_executions_status ON executions(status);
CREATE INDEX idx_node_executions_execution ON node_executions(execution_id);
CREATE INDEX idx_ab_tests_prompt ON ab_tests(prompt_id);
CREATE INDEX idx_ab_tests_status ON ab_tests(status);
CREATE INDEX idx_ab_test_results_test ON ab_test_results(test_id);
CREATE INDEX idx_role_templates_category ON role_templates(category);
CREATE INDEX idx_role_templates_public ON role_templates(is_public);
CREATE INDEX idx_monitor_data_type ON monitor_data(metric_type);
CREATE INDEX idx_monitor_data_execution ON monitor_data(execution_id);
CREATE INDEX idx_monitor_data_recorded ON monitor_data(recorded_at);
CREATE INDEX idx_monitor_alerts_status ON monitor_alerts(status);
