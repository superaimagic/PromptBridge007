import { sqliteTable, text, integer, real, uniqueIndex, index } from 'drizzle-orm/sqlite-core';

// Table: tools (工具注册表)
export const tools = sqliteTable('tools', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  displayName: text('display_name').notNull(),
  category: text('category').notNull(), // 'international' | 'domestic'
  detectCommands: text('detect_commands').notNull(), // JSON array
  promptPaths: text('prompt_paths').notNull(), // JSON array
  formatSpec: text('format_spec'), // JSON object
  deployConfig: text('deploy_config'), // JSON object
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Table: projects (项目)
export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  path: text('path').notNull().unique(), // absolute project directory path
  description: text('description'),
  isDefault: integer('is_default', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Table: files (文件主体)
export const files = sqliteTable('files', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  content: text('content').notNull(),
  contentHash: text('content_hash').notNull(),
  format: text('format').notNull(), // markdown|yaml|toml|json|mdc|xml|txt|skill_md
  projectId: text('project_id').references(() => projects.id),

  // 来源信息
  sourceType: text('source_type').notNull(),
  repoName: text('repo_name'),
  repoUrl: text('repo_url'),
  repoLicense: text('repo_license'),
  author: text('author'),
  authorUrl: text('author_url'),
  filePath: text('file_path'),
  commitHash: text('commit_hash'),
  fetchedAt: text('fetched_at'),

  // 许可证
  license: text('license').notNull(),
  licenseUrl: text('license_url'),

  // 统计
  version: integer('version').default(1),
  installCount: integer('install_count').default(0),
  rating: real('rating').default(0),

  // 时间戳
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'),
}, (table) => [
  uniqueIndex('idx_files_slug').on(table.slug),
  uniqueIndex('idx_files_content_hash').on(table.contentHash),
  index('idx_files_license').on(table.license),
  index('idx_files_source_type').on(table.sourceType),
  index('idx_files_created_at').on(table.createdAt),
]);

// Table: tags (多维标签)
export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  fileId: text('file_id').notNull().references(() => files.id, { onDelete: 'cascade' }),
  dimension: text('dimension').notNull(), // tool|role|domain|language|quality|source_type|custom
  value: text('value').notNull(),
  confidence: text('confidence'), // full|partial|experimental|incompatible (only for dimension=tool)
  createdAt: text('created_at').notNull(),
}, (table) => [
  uniqueIndex('idx_tags_file_dimension_value').on(table.fileId, table.dimension, table.value),
  index('idx_tags_file_id').on(table.fileId),
  index('idx_tags_dimension').on(table.dimension),
  index('idx_tags_value').on(table.value),
  index('idx_tags_dimension_value').on(table.dimension, table.value),
]);

// Table: fileVersions (版本历史)
export const fileVersions = sqliteTable('file_versions', {
  id: text('id').primaryKey(),
  fileId: text('file_id').notNull().references(() => files.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  content: text('content').notNull(),
  contentHash: text('content_hash').notNull(),
  changeSummary: text('change_summary'),
  createdAt: text('created_at').notNull(),
}, (table) => [
  uniqueIndex('idx_file_versions_file_version').on(table.fileId, table.version),
  index('idx_file_versions_file_id').on(table.fileId),
]);

// Table: deployments (部署关系)
export const deployments = sqliteTable('deployments', {
  id: text('id').primaryKey(),
  fileId: text('file_id').notNull().references(() => files.id, { onDelete: 'cascade' }),
  toolId: text('tool_id').notNull().references(() => tools.id),
  projectId: text('project_id').references(() => projects.id),
  mode: text('mode').notNull(), // original|customized|incremental
  targetPath: text('target_path').notNull(),
  deployedContent: text('deployed_content'),
  status: text('status').notNull(), // pending|success|failed|conflict
  errorMessage: text('error_message'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [
  index('idx_deployments_file_id').on(table.fileId),
  index('idx_deployments_tool_id').on(table.toolId),
  index('idx_deployments_status').on(table.status),
]);

// Table: scanSources (环境扫描来源)
export const scanSources = sqliteTable('scan_sources', {
  id: text('id').primaryKey(),
  toolId: text('tool_id').notNull().references(() => tools.id),
  sourcePath: text('source_path').notNull(),
  isRecursive: integer('is_recursive', { mode: 'boolean' }).default(true),
  filePattern: text('file_pattern'),
  createdAt: text('created_at').notNull(),
});

// Table: scanHistory (扫描历史)
export const scanHistory = sqliteTable('scan_history', {
  id: text('id').primaryKey(),
  toolId: text('tool_id').references(() => tools.id),
  scanType: text('scan_type').notNull(), // full|incremental
  filesFound: integer('files_found').default(0),
  filesImported: integer('files_imported').default(0),
  filesUpdated: integer('files_updated').default(0),
  filesSkipped: integer('files_skipped').default(0),
  startedAt: text('started_at').notNull(),
  completedAt: text('completed_at'),
  status: text('status').notNull(), // running|completed|failed
  errorMessage: text('error_message'),
}, (table) => [
  index('idx_scan_history_tool_id').on(table.toolId),
  index('idx_scan_history_started_at').on(table.startedAt),
]);

// Table: publicSources (公共库同步源)
export const publicSources = sqliteTable('public_sources', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  repoUrl: text('repo_url').notNull(),
  repoLicense: text('repo_license'),
  description: text('description'),
  localPath: text('local_path'),
  lastSyncAt: text('last_sync_at'),
  lastCommitHash: text('last_commit_hash'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Table: api_keys (项目级 API Key 认证)
export const apiKeys = sqliteTable('api_keys', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  keyHash: text('key_hash').notNull().unique(),
  keyPrefix: text('key_prefix').notNull(),
  name: text('name'),
  status: text('status').notNull().default('active'), // active | revoked
  rateLimit: integer('rate_limit').default(100),
  lastUsedAt: text('last_used_at'),
  createdAt: text('created_at').notNull(),
  revokedAt: text('revoked_at'),
}, (table) => [
  index('idx_api_keys_project_id').on(table.projectId),
  index('idx_api_keys_key_hash').on(table.keyHash),
  index('idx_api_keys_status').on(table.status),
]);

// Table: webhooks (项目级事件通知)
export const webhooks = sqliteTable('webhooks', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  events: text('events').notNull(), // JSON array
  secret: text('secret'),
  status: text('status').notNull().default('active'), // active | disabled
  lastTriggeredAt: text('last_triggered_at'),
  lastResponseStatus: integer('last_response_status'),
  failureCount: integer('failure_count').default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [
  index('idx_webhooks_project_id').on(table.projectId),
  index('idx_webhooks_status').on(table.status),
]);

// Table: audit_logs (审计日志)
export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  projectId: text('project_id'),
  apiKeyId: text('api_key_id'),
  action: text('action').notNull(),
  resourceType: text('resource_type'),
  resourceId: text('resource_id'),
  method: text('method'),
  path: text('path'),
  statusCode: integer('status_code'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: text('created_at').notNull(),
}, (table) => [
  index('idx_audit_logs_project_id').on(table.projectId),
  index('idx_audit_logs_action').on(table.action),
  index('idx_audit_logs_created_at').on(table.createdAt),
]);
