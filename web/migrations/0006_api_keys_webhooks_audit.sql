-- Migration: 0006_api_keys_webhooks_audit
-- Adds API Key management, Webhook configuration, and Audit logging tables

-- API Keys table (project-level authentication)
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL UNIQUE,          -- SHA-256 hash of the full API key
  key_prefix TEXT NOT NULL,               -- First 20 chars for display (e.g. pb_proj_xxx_xxxx)
  name TEXT,                               -- Optional label for the key
  status TEXT NOT NULL DEFAULT 'active',   -- active | revoked
  rate_limit INTEGER DEFAULT 100,          -- requests per minute
  last_used_at TEXT,
  created_at TEXT NOT NULL,
  revoked_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_api_keys_project_id ON api_keys(project_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_status ON api_keys(status);

-- Webhooks table (per-project event notifications)
CREATE TABLE IF NOT EXISTS webhooks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  events TEXT NOT NULL,                    -- JSON array: ["prompt.created","prompt.updated","prompt.deleted"]
  secret TEXT,                             -- Optional HMAC signing secret
  status TEXT NOT NULL DEFAULT 'active',   -- active | disabled
  last_triggered_at TEXT,
  last_response_status INTEGER,
  failure_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_webhooks_project_id ON webhooks(project_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_status ON webhooks(status);

-- Audit logs table (track all API operations)
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  project_id TEXT,                         -- NULL for admin operations
  api_key_id TEXT,                         -- NULL for admin operations
  action TEXT NOT NULL,                    -- e.g. "prompt.create", "prompt.update", "prompt.delete", "admin.project.create"
  resource_type TEXT,                      -- "file" | "project" | "api_key" | "webhook"
  resource_id TEXT,
  method TEXT,                             -- HTTP method
  path TEXT,                               -- Request path
  status_code INTEGER,                     -- Response status code
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_project_id ON audit_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Add project_id index to files table for faster project-scoped queries
CREATE INDEX IF NOT EXISTS idx_files_project_id ON files(project_id);
