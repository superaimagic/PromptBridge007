import { sql } from 'drizzle-orm';
import { getDb } from './index';

/**
 * Initialize the database by creating all tables if they don't exist.
 * Uses raw SQL CREATE TABLE IF NOT EXISTS statements for libsql compatibility.
 */
export async function initDatabase(): Promise<void> {
  console.log('Initializing database...');

  // Create tools table
  await getDb().run(sql`
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
    )
  `);

  // Create projects table
  await getDb().run(sql`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      path TEXT NOT NULL UNIQUE,
      description TEXT,
      is_default INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // Create files table
  await getDb().run(sql`
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
    )
  `);

  // Create files indexes
  await getDb().run(sql`CREATE INDEX IF NOT EXISTS idx_files_slug ON files(slug)`);
  await getDb().run(sql`CREATE INDEX IF NOT EXISTS idx_files_content_hash ON files(content_hash)`);
  await getDb().run(sql`CREATE INDEX IF NOT EXISTS idx_files_license ON files(license)`);
  await getDb().run(sql`CREATE INDEX IF NOT EXISTS idx_files_source_type ON files(source_type)`);
  await getDb().run(sql`CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at)`);

  // Create tags table
  await getDb().run(sql`
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      file_id TEXT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
      dimension TEXT NOT NULL,
      value TEXT NOT NULL,
      confidence TEXT,
      created_at TEXT NOT NULL
    )
  `);

  // Create tags indexes
  await getDb().run(sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_file_dimension_value ON tags(file_id, dimension, value)`);
  await getDb().run(sql`CREATE INDEX IF NOT EXISTS idx_tags_file_id ON tags(file_id)`);
  await getDb().run(sql`CREATE INDEX IF NOT EXISTS idx_tags_dimension ON tags(dimension)`);
  await getDb().run(sql`CREATE INDEX IF NOT EXISTS idx_tags_value ON tags(value)`);
  await getDb().run(sql`CREATE INDEX IF NOT EXISTS idx_tags_dimension_value ON tags(dimension, value)`);

  // Create file_versions table
  await getDb().run(sql`
    CREATE TABLE IF NOT EXISTS file_versions (
      id TEXT PRIMARY KEY,
      file_id TEXT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
      version INTEGER NOT NULL,
      content TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      change_summary TEXT,
      created_at TEXT NOT NULL
    )
  `);

  // Create file_versions indexes
  await getDb().run(sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_file_versions_file_version ON file_versions(file_id, version)`);
  await getDb().run(sql`CREATE INDEX IF NOT EXISTS idx_file_versions_file_id ON file_versions(file_id)`);

  // Create deployments table
  await getDb().run(sql`
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
    )
  `);

  // Create deployments indexes
  await getDb().run(sql`CREATE INDEX IF NOT EXISTS idx_deployments_file_id ON deployments(file_id)`);
  await getDb().run(sql`CREATE INDEX IF NOT EXISTS idx_deployments_tool_id ON deployments(tool_id)`);
  await getDb().run(sql`CREATE INDEX IF NOT EXISTS idx_deployments_status ON deployments(status)`);

  // Create scan_sources table
  await getDb().run(sql`
    CREATE TABLE IF NOT EXISTS scan_sources (
      id TEXT PRIMARY KEY,
      tool_id TEXT NOT NULL REFERENCES tools(id),
      source_path TEXT NOT NULL,
      is_recursive INTEGER DEFAULT 1,
      file_pattern TEXT,
      created_at TEXT NOT NULL
    )
  `);

  // Create scan_history table
  await getDb().run(sql`
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
    )
  `);

  // Create scan_history indexes
  await getDb().run(sql`CREATE INDEX IF NOT EXISTS idx_scan_history_tool_id ON scan_history(tool_id)`);
  await getDb().run(sql`CREATE INDEX IF NOT EXISTS idx_scan_history_started_at ON scan_history(started_at)`);

  // Create public_sources table
  await getDb().run(sql`
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
    )
  `);

  console.log('Database tables created successfully.');

  // ─── Migrations: Add missing columns to existing tables ────────────────────
  const migrations: Array<{ table: string; column: string; def: string }> = [
    { table: 'deployments', column: 'deployed_content', def: 'TEXT' },
    { table: 'deployments', column: 'error_message', def: 'TEXT' },
    { table: 'files', column: 'deleted_at', def: 'TEXT' },
    { table: 'files', column: 'file_path', def: 'TEXT' },
    { table: 'files', column: 'commit_hash', def: 'TEXT' },
    { table: 'files', column: 'fetched_at', def: 'TEXT' },
    { table: 'files', column: 'project_id', def: 'TEXT REFERENCES projects(id)' },
    { table: 'deployments', column: 'project_id', def: 'TEXT REFERENCES projects(id)' },
  ];

  for (const mig of migrations) {
    try {
      await getDb().run(sql`ALTER TABLE ${sql.raw(mig.table)} ADD COLUMN ${sql.raw(mig.column)} ${sql.raw(mig.def)}`);
    } catch {
      // Column already exists — ignore
    }
  }

  console.log('Database migrations applied.');
}

/**
 * Drop all tables (for force reset).
 */
export async function dropAllTables(): Promise<void> {
  const tables = ['deployments', 'file_versions', 'tags', 'scan_history', 'scan_sources', 'public_sources', 'files', 'projects', 'tools'];
  for (const table of tables) {
    try {
      await getDb().run(sql`DROP TABLE IF EXISTS ${sql.raw(table)}`);
    } catch {
      // ignore
    }
  }
  console.log('All tables dropped.');
}

/**
 * Check if the database has been seeded (has tools data).
 */
export async function isDatabaseSeeded(): Promise<boolean> {
  const result = await getDb().run(sql`SELECT COUNT(*) as count FROM tools`);
  // libsql returns { rows: [...] }, D1 returns { results: [...] }
  const raw = result as unknown as Record<string, unknown>;
  const row = (raw.rows as Record<string, unknown>[])?.[0]
    ?? (raw.results as Record<string, unknown>[])?.[0];
  return Number(row?.count ?? 0) > 0;
}

/**
 * Initialize database and seed if empty.
 */
export async function initAndSeed(): Promise<{ initialized: boolean; seeded: boolean }> {
  await initDatabase();

  const seeded = await isDatabaseSeeded();
  if (!seeded) {
    console.log('Database is empty, running seed...');
    const { seed } = await import('./seed');
    await seed();
    return { initialized: true, seeded: true };
  }

  return { initialized: true, seeded: false };
}
