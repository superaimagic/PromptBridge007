-- Migration: 0004_spl_source
-- PromptBridge007: public_sources entry for system_prompts_leaks
-- Generated: 2026-06-26T01:55:25.539Z

INSERT OR IGNORE INTO public_sources (id, name, repo_url, repo_license, description, local_path, last_sync_at, last_commit_hash, is_active, created_at, updated_at) VALUES ('spl-source', 'system_prompts_leaks', 'https://github.com/asgeirtj/system_prompts_leaks', 'MIT', 'AI系统提示词泄露集合 - 逆向提取的主流AI工具系统提示词', 'data/public-sources/system_prompts_leaks', datetime('now'), 'latest', 1, datetime('now'), datetime('now'));
