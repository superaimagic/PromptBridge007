-- Migration: 0001_initial
-- PromptBridge007 initial schema for Cloudflare D1

CREATE TABLE IF NOT EXISTS tools (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  category TEXT NOT NULL,
  detect_commands TEXT NOT NULL,
  prompt_paths TEXT NOT NULL,
  format_spec TEXT,
  deploy_config TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  path TEXT NOT NULL UNIQUE,
  description TEXT,
  is_default INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  format TEXT NOT NULL,
  project_id TEXT REFERENCES projects(id),
  source_type TEXT NOT NULL,
  repo_name TEXT,
  repo_url TEXT,
  repo_license TEXT,
  author TEXT,
  author_url TEXT,
  file_path TEXT,
  commit_hash TEXT,
  fetched_at TEXT,
  license TEXT NOT NULL,
  license_url TEXT,
  version INTEGER DEFAULT 1,
  install_count INTEGER DEFAULT 0,
  rating REAL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_files_slug ON files(slug);
CREATE UNIQUE INDEX IF NOT EXISTS idx_files_content_hash ON files(content_hash);
CREATE INDEX IF NOT EXISTS idx_files_license ON files(license);
CREATE INDEX IF NOT EXISTS idx_files_source_type ON files(source_type);
CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at);

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  dimension TEXT NOT NULL,
  value TEXT NOT NULL,
  confidence TEXT,
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_file_dimension_value ON tags(file_id, dimension, value);
CREATE INDEX IF NOT EXISTS idx_tags_file_id ON tags(file_id);
CREATE INDEX IF NOT EXISTS idx_tags_dimension ON tags(dimension);
CREATE INDEX IF NOT EXISTS idx_tags_value ON tags(value);
CREATE INDEX IF NOT EXISTS idx_tags_dimension_value ON tags(dimension, value);

CREATE TABLE IF NOT EXISTS file_versions (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  content TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  change_summary TEXT,
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_file_versions_file_version ON file_versions(file_id, version);
CREATE INDEX IF NOT EXISTS idx_file_versions_file_id ON file_versions(file_id);

CREATE TABLE IF NOT EXISTS deployments (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  tool_id TEXT NOT NULL REFERENCES tools(id),
  project_id TEXT REFERENCES projects(id),
  mode TEXT NOT NULL,
  target_path TEXT NOT NULL,
  deployed_content TEXT,
  status TEXT NOT NULL,
  error_message TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_deployments_file_id ON deployments(file_id);
CREATE INDEX IF NOT EXISTS idx_deployments_tool_id ON deployments(tool_id);
CREATE INDEX IF NOT EXISTS idx_deployments_status ON deployments(status);

CREATE TABLE IF NOT EXISTS scan_sources (
  id TEXT PRIMARY KEY,
  tool_id TEXT NOT NULL REFERENCES tools(id),
  source_path TEXT NOT NULL,
  is_recursive INTEGER DEFAULT 1,
  file_pattern TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS scan_history (
  id TEXT PRIMARY KEY,
  tool_id TEXT REFERENCES tools(id),
  scan_type TEXT NOT NULL,
  files_found INTEGER DEFAULT 0,
  files_imported INTEGER DEFAULT 0,
  files_updated INTEGER DEFAULT 0,
  files_skipped INTEGER DEFAULT 0,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  status TEXT NOT NULL,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_scan_history_tool_id ON scan_history(tool_id);
CREATE INDEX IF NOT EXISTS idx_scan_history_started_at ON scan_history(started_at);

CREATE TABLE IF NOT EXISTS public_sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  repo_url TEXT NOT NULL,
  repo_license TEXT,
  description TEXT,
  local_path TEXT,
  last_sync_at TEXT,
  last_commit_hash TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
