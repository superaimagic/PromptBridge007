// Export local SQLite data to D1-compatible SQL
// Run: npx tsx scripts/export-to-d1.ts

import { db } from '../src/lib/db';
import { tools, projects, files, tags, fileVersions, deployments, scanSources, scanHistory, publicSources } from '../src/lib/db/schema';
import { sql } from 'drizzle-orm';

async function exportToD1() {
  const statements: string[] = [];

  // Export tools
  const allTools = await db.select().from(tools);
  for (const t of allTools) {
    statements.push(`INSERT OR IGNORE INTO tools (id, name, display_name, category, detect_commands, prompt_paths, format_spec, deploy_config, is_active, created_at, updated_at) VALUES (${esc(t.id)}, ${esc(t.name)}, ${esc(t.displayName)}, ${esc(t.category)}, ${esc(t.detectCommands)}, ${esc(t.promptPaths)}, ${esc(t.formatSpec)}, ${esc(t.deployConfig)}, ${t.isActive ? 1 : 0}, ${esc(t.createdAt)}, ${esc(t.updatedAt)});`);
  }

  // Export projects
  const allProjects = await db.select().from(projects);
  for (const p of allProjects) {
    statements.push(`INSERT OR IGNORE INTO projects (id, name, path, description, is_default, created_at, updated_at) VALUES (${esc(p.id)}, ${esc(p.name)}, ${esc(p.path)}, ${esc(p.description)}, ${p.isDefault ? 1 : 0}, ${esc(p.createdAt)}, ${esc(p.updatedAt)});`);
  }

  // Export files (skip deleted)
  const allFiles = await db.select().from(files).where(sql`deleted_at IS NULL`);
  for (const f of allFiles) {
    statements.push(`INSERT OR IGNORE INTO files (id, slug, name, content, content_hash, format, project_id, source_type, repo_name, repo_url, repo_license, author, author_url, file_path, commit_hash, fetched_at, license, license_url, version, install_count, rating, created_at, updated_at, deleted_at) VALUES (${esc(f.id)}, ${esc(f.slug)}, ${esc(f.name)}, ${esc(f.content)}, ${esc(f.contentHash)}, ${esc(f.format)}, ${esc(f.projectId)}, ${esc(f.sourceType)}, ${esc(f.repoName)}, ${esc(f.repoUrl)}, ${esc(f.repoLicense)}, ${esc(f.author)}, ${esc(f.authorUrl)}, ${esc(f.filePath)}, ${esc(f.commitHash)}, ${esc(f.fetchedAt)}, ${esc(f.license)}, ${esc(f.licenseUrl)}, ${f.version}, ${f.installCount}, ${f.rating}, ${esc(f.createdAt)}, ${esc(f.updatedAt)}, ${esc(f.deletedAt)});`);
  }

  // Export tags
  const allTags = await db.select().from(tags);
  for (const t of allTags) {
    statements.push(`INSERT OR IGNORE INTO tags (id, file_id, dimension, value, confidence, created_at) VALUES (${esc(t.id)}, ${esc(t.fileId)}, ${esc(t.dimension)}, ${esc(t.value)}, ${esc(t.confidence)}, ${esc(t.createdAt)});`);
  }

  // Export file_versions
  const allVersions = await db.select().from(fileVersions);
  for (const v of allVersions) {
    statements.push(`INSERT OR IGNORE INTO file_versions (id, file_id, version, content, content_hash, change_summary, created_at) VALUES (${esc(v.id)}, ${esc(v.fileId)}, ${v.version}, ${esc(v.content)}, ${esc(v.contentHash)}, ${esc(v.changeSummary)}, ${esc(v.createdAt)});`);
  }

  // Export deployments
  const allDeployments = await db.select().from(deployments);
  for (const d of allDeployments) {
    statements.push(`INSERT OR IGNORE INTO deployments (id, file_id, tool_id, project_id, mode, target_path, deployed_content, status, error_message, created_at, updated_at) VALUES (${esc(d.id)}, ${esc(d.fileId)}, ${esc(d.toolId)}, ${esc(d.projectId)}, ${esc(d.mode)}, ${esc(d.targetPath)}, ${esc(d.deployedContent)}, ${esc(d.status)}, ${esc(d.errorMessage)}, ${esc(d.createdAt)}, ${esc(d.updatedAt)});`);
  }

  // Export scan_sources
  const allScanSources = await db.select().from(scanSources);
  for (const s of allScanSources) {
    statements.push(`INSERT OR IGNORE INTO scan_sources (id, tool_id, source_path, is_recursive, file_pattern, created_at) VALUES (${esc(s.id)}, ${esc(s.toolId)}, ${esc(s.sourcePath)}, ${s.isRecursive ? 1 : 0}, ${esc(s.filePattern)}, ${esc(s.createdAt)});`);
  }

  // Export scan_history
  const allScanHistory = await db.select().from(scanHistory);
  for (const h of allScanHistory) {
    statements.push(`INSERT OR IGNORE INTO scan_history (id, tool_id, scan_type, files_found, files_imported, files_updated, files_skipped, started_at, completed_at, status, error_message) VALUES (${esc(h.id)}, ${esc(h.toolId)}, ${esc(h.scanType)}, ${h.filesFound}, ${h.filesImported}, ${h.filesUpdated}, ${h.filesSkipped}, ${esc(h.startedAt)}, ${esc(h.completedAt)}, ${esc(h.status)}, ${esc(h.errorMessage)});`);
  }

  // Export public_sources
  const allPublicSources = await db.select().from(publicSources);
  for (const p of allPublicSources) {
    statements.push(`INSERT OR IGNORE INTO public_sources (id, name, repo_url, repo_license, description, local_path, last_sync_at, last_commit_hash, is_active, created_at, updated_at) VALUES (${esc(p.id)}, ${esc(p.name)}, ${esc(p.repoUrl)}, ${esc(p.repoLicense)}, ${esc(p.description)}, ${esc(p.localPath)}, ${esc(p.lastSyncAt)}, ${esc(p.lastCommitHash)}, ${p.isActive ? 1 : 0}, ${esc(p.createdAt)}, ${esc(p.updatedAt)});`);
  }

  console.log(`-- PromptBridge007 Data Export`);
  console.log(`-- Generated: ${new Date().toISOString()}`);
  console.log(`-- Records: tools=${allTools.length} projects=${allProjects.length} files=${allFiles.length} tags=${allTags.length} versions=${allVersions.length} deployments=${allDeployments.length} scan_sources=${allScanSources.length} scan_history=${allScanHistory.length} public_sources=${allPublicSources.length}`);
  console.log('');
  console.log(statements.join('\n'));
}

function esc(val: any): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? '1' : '0';
  const str = String(val);
  return "'" + str.replace(/'/g, "''").replace(/\0/g, '') + "'";
}

exportToD1().catch(console.error);
