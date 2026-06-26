/**
 * Import system_prompts_leaks into PromptBridge007 D1 database
 * Generates SQL migration files (split by category) for offline import.
 *
 * Usage:  node scripts/import-system-prompts-leaks.js
 * Output: web/migrations/0004_spl_*.sql
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ── Configuration ──────────────────────────────────────────────────────────
const SOURCE_REPO = 'G:\\WWW\\system_prompts_leaks';
const OUTPUT_DIR  = path.join(__dirname, '..', 'migrations');
const PROJECT_ID  = 'default-project';
const GITHUB_BASE = 'https://github.com/asgeirtj/system_prompts_leaks/blob/main';

const MIN_FILE_SIZE = 200;       // bytes – skip smaller files
const MAX_FILE_SIZE = 400 * 1024; // 400 KB – skip larger files
const MAX_CONTENT_CHARS = 380000; // chars – truncate content to stay under D1 2 MB row limit

// Category → (tool tag, domain tag)
const CATEGORY_MAP = {
  Anthropic:  { tool: 'claude',      domain: 'ai-assistant' },
  Google:     { tool: 'gemini',      domain: 'ai-assistant' },
  OpenAI:     { tool: 'chatgpt',     domain: 'ai-assistant' },
  Microsoft:  { tool: 'copilot',     domain: 'ai-assistant' },
  Meta:       { tool: 'meta-ai',     domain: 'ai-assistant' },
  xAI:        { tool: 'grok',        domain: 'ai-assistant' },
  Mistral:    { tool: 'mistral',     domain: 'ai-assistant' },
  Perplexity: { tool: 'perplexity',  domain: 'ai-assistant' },
  Notion:     { tool: 'notion-ai',   domain: 'ai-assistant' },
  Qwen:       { tool: 'qwen',       domain: 'ai-assistant' },
  Cursor:     { tool: 'cursor',     domain: 'ai-assistant' },
  Misc:       { tool: 'other',      domain: 'ai-assistant' },
};

// Sub-category folder → role tag
const ROLE_MAP = {
  'Claude Code': 'coding-agent',
  'Codex':       'coding-agent',
  'Official':    'system-prompt',
  'API':         'api-system-prompt',
};

// Files / dirs to skip
const SKIP_FILES = new Set(['README.md', 'CONTRIBUTING.md', 'FUNDING.yml', 'all.md', 'template.md']);
const SKIP_DIRS  = new Set(['.github', 'raw', 'old', 'examples']);

// ── Helpers ────────────────────────────────────────────────────────────────

function generateId() {
  return 'spl-' + crypto.randomBytes(4).toString('hex');
}

function escapeSql(str) {
  return str.replace(/'/g, "''");
}

function truncateContent(content) {
  if (content.length <= MAX_CONTENT_CHARS) return content;
  return content.substring(0, MAX_CONTENT_CHARS) + '\n\n[... truncated due to size limit ...]';
}

function assessQuality(content) {
  const len = content.length;
  if (len < 200)   return 'draft';
  if (len < 2000)  return 'basic';
  if (len < 10000) return 'standard';
  if (len < 50000) return 'detailed';
  return 'comprehensive';
}

function detectLanguage(content) {
  const chineseChars = (content.match(/[\u4e00-\u9fff]/g) || []).length;
  if (content.length === 0) return 'en';
  return (chineseChars / content.length > 0.1) ? 'zh' : 'en';
}

function generateSlug(relPath) {
  return relPath
    .replace(/\\/g, '/')
    .replace(/\.md$/, '')
    .replace(/\.txt$/, '')
    .replace(/[^a-zA-Z0-9/]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

/**
 * Clean filename into a human-readable display name.
 *   claude-opus-4.8  →  Claude Opus 4.8
 *   2025-05-22-claude-opus-4  →  Claude Opus 4  (date removed, version kept)
 */
function cleanDisplayName(fileName) {
  let name = fileName
    .replace(/\.md$/, '')
    .replace(/\.txt$/, '');

  // Remove leading dates like 2025-05-22-
  name = name.replace(/^\d{4}-\d{2}-\d{2}-/, '');

  // Replace hyphens and underscores with spaces, then title-case
  name = name.replace(/[-_]/g, ' ');
  name = name.replace(/\b\w/g, l => l.toUpperCase());

  return name;
}

// ── File scanner ───────────────────────────────────────────────────────────

function scanFiles() {
  const results = [];

  function walk(dir) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        walk(fullPath);
        continue;
      }

      // Only .md and .txt files
      if (!entry.name.endsWith('.md') && !entry.name.endsWith('.txt')) continue;

      // Skip blacklisted filenames
      if (SKIP_FILES.has(entry.name)) continue;

      const relPath = path.relative(SOURCE_REPO, fullPath);
      const normalizedPath = '/' + relPath.replace(/\\/g, '/');

      // Skip if any skip dir appears in the path
      let skipPath = false;
      for (const d of SKIP_DIRS) {
        if (normalizedPath.includes('/' + d + '/')) { skipPath = true; break; }
      }
      if (skipPath) continue;

      const stat = fs.statSync(fullPath);
      if (stat.size < MIN_FILE_SIZE) continue;
      if (stat.size > MAX_FILE_SIZE) continue;

      results.push({ fullPath, relPath, size: stat.size });
    }
  }

  walk(SOURCE_REPO);
  return results;
}

// ── Metadata parser ────────────────────────────────────────────────────────

function parseMetadata(relPath) {
  const parts = relPath.replace(/\\/g, '/').split('/');
  const category    = parts[0];                              // e.g. "Anthropic"
  const subCategory = parts.length > 2 ? parts[1] : null;    // e.g. "Claude Code"
  const rawFileName = parts[parts.length - 1];
  const fileName    = rawFileName.replace(/\.(md|txt)$/, '');

  const catInfo = CATEGORY_MAP[category] || { tool: 'other', domain: 'ai-assistant' };
  const role    = ROLE_MAP[subCategory]   || 'system-prompt';

  const versionMatch = fileName.match(/(\d+\.\d+(?:\.\d+)?)/);
  const version      = versionMatch ? versionMatch[1] : null;

  const displayName = cleanDisplayName(rawFileName);

  return { category, subCategory, fileName, displayName, tool: catInfo.tool, domain: catInfo.domain, role, version };
}

// ── SQL generators ─────────────────────────────────────────────────────────

function buildFileInsert(id, meta, slug, content, contentHash, language, quality, relPath) {
  const name       = `[${meta.category}] ${meta.displayName}`;
  const sourceUrl  = `${GITHUB_BASE}/${relPath.replace(/\\/g, '/')}`;
  const filePath   = relPath.replace(/\\/g, '/');

  return (
    `INSERT OR IGNORE INTO files (id, slug, name, content, content_hash, format, project_id, source_type, repo_name, repo_url, repo_license, author, author_url, file_path, commit_hash, fetched_at, license, license_url, version, install_count, rating, created_at, updated_at, deleted_at) VALUES (` +
    `'${id}', ` +
    `'${escapeSql(slug)}', ` +
    `'${escapeSql(name)}', ` +
    `'${escapeSql(content)}', ` +
    `'${contentHash}', ` +
    `'markdown', ` +
    `'${PROJECT_ID}', ` +
    `'public', ` +
    `'system_prompts_leaks', ` +
    `'${escapeSql(sourceUrl)}', ` +
    `'MIT', ` +
    `NULL, ` +
    `NULL, ` +
    `'${escapeSql(filePath)}', ` +
    `'latest', ` +
    `datetime('now'), ` +
    `'MIT', ` +
    `'https://opensource.org/licenses/MIT', ` +
    `1, ` +
    `0, ` +
    `0, ` +
    `datetime('now'), ` +
    `datetime('now'), ` +
    `NULL);`
  );
}

function buildTagInserts(fileId, meta, language, quality) {
  const tags = [
    { dimension: 'tool',        value: meta.tool,              confidence: 0.95 },
    { dimension: 'role',        value: meta.role,              confidence: 0.90 },
    { dimension: 'domain',      value: meta.domain,            confidence: 0.85 },
    { dimension: 'language',    value: language,               confidence: 0.95 },
    { dimension: 'quality',     value: quality,                confidence: 0.80 },
    { dimension: 'source_type', value: 'leaked-system-prompt', confidence: 0.95 },
  ];

  if (meta.version) {
    tags.push({ dimension: 'version', value: meta.version, confidence: 0.90 });
  }
  if (meta.subCategory) {
    tags.push({ dimension: 'sub_category', value: meta.subCategory.toLowerCase(), confidence: 0.85 });
  }

  return tags.map(t => {
    const tagId = generateId();
    return `INSERT INTO tags (id, file_id, dimension, value, confidence, created_at) VALUES ('${tagId}', '${fileId}', '${t.dimension}', '${escapeSql(t.value)}', ${t.confidence}, datetime('now'));`;
  });
}

function buildVersionInsert(fileId, content, contentHash) {
  const versionId = generateId();
  return `INSERT INTO file_versions (id, file_id, version, content, content_hash, change_summary, created_at) VALUES ('${versionId}', '${fileId}', 1, '${escapeSql(content)}', '${contentHash}', 'Imported from system_prompts_leaks', datetime('now'));`;
}

function buildSourceInsert() {
  return (
    `INSERT OR IGNORE INTO public_sources (id, name, repo_url, repo_license, description, local_path, last_sync_at, last_commit_hash, is_active, created_at, updated_at) VALUES (` +
    `'spl-source', ` +
    `'system_prompts_leaks', ` +
    `'https://github.com/asgeirtj/system_prompts_leaks', ` +
    `'MIT', ` +
    `'AI系统提示词泄露集合 - 逆向提取的主流AI工具系统提示词', ` +
    `'data/public-sources/system_prompts_leaks', ` +
    `datetime('now'), ` +
    `'latest', ` +
    `1, ` +
    `datetime('now'), ` +
    `datetime('now'));`
  );
}

// ── Main ───────────────────────────────────────────────────────────────────

function main() {
  console.log('=== Generating SQL migration files from system_prompts_leaks ===\n');

  // 1. Scan files
  const files = scanFiles();
  console.log(`Found ${files.length} eligible files\n`);

  // 2. Group by category
  const byCategory = {};
  for (const file of files) {
    const meta = parseMetadata(file.relPath);
    const cat  = meta.category;
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push({ ...file, meta });
  }

  // 3. Generate SQL per category
  const categoryOrder = ['Anthropic', 'Google', 'OpenAI', 'Microsoft', 'Meta', 'xAI', 'Mistral', 'Perplexity', 'Notion', 'Qwen', 'Cursor', 'Misc'];
  const summary = {};
  let totalCount = 0;
  let totalSqlSize = 0;

  for (const cat of categoryOrder) {
    const items = byCategory[cat];
    if (!items || items.length === 0) {
      summary[cat] = 0;
      continue;
    }

    const lines = [];
    lines.push(`-- Migration: 0004_spl_${cat.toLowerCase()}`);
    lines.push(`-- PromptBridge007: system_prompts_leaks import – ${cat}`);
    lines.push(`-- Generated: ${new Date().toISOString()}`);
    lines.push(`-- File count: ${items.length}`);
    lines.push('');

    for (const item of items) {
      const { fullPath, relPath, meta } = item;

      let content = fs.readFileSync(fullPath, 'utf-8');
      if (!content.trim()) continue;

      const originalContent = content;
      content = truncateContent(content);

      const id          = generateId();
      const slug        = generateSlug(relPath);
      const contentHash = crypto.createHash('sha256').update(originalContent).digest('hex');
      const quality     = assessQuality(content);
      const language    = detectLanguage(content);

      // file INSERT
      lines.push(`-- ${meta.displayName}`);
      lines.push(buildFileInsert(id, meta, slug, content, contentHash, language, quality, relPath));

      // tag INSERTs
      for (const tagLine of buildTagInserts(id, meta, language, quality)) {
        lines.push(tagLine);
      }

      // file_version INSERT
      lines.push(buildVersionInsert(id, content, contentHash));
      lines.push('');

      totalCount++;
    }

    const sql = lines.join('\n') + '\n';
    const outPath = path.join(OUTPUT_DIR, `0004_spl_${cat.toLowerCase()}.sql`);
    fs.writeFileSync(outPath, sql, 'utf-8');

    const size = Buffer.byteLength(sql, 'utf-8');
    summary[cat] = items.length;
    totalSqlSize += size;
    console.log(`  ${cat}: ${items.length} files → ${outPath} (${(size / 1024).toFixed(1)} KB)`);
  }

  // 4. Generate public_sources SQL
  const sourceLines = [
    `-- Migration: 0004_spl_source`,
    `-- PromptBridge007: public_sources entry for system_prompts_leaks`,
    `-- Generated: ${new Date().toISOString()}`,
    ``,
    buildSourceInsert(),
    ``,
  ].join('\n');
  const sourcePath = path.join(OUTPUT_DIR, '0004_spl_source.sql');
  fs.writeFileSync(sourcePath, sourceLines, 'utf-8');
  const sourceSize = Buffer.byteLength(sourceLines, 'utf-8');
  totalSqlSize += sourceSize;
  console.log(`  source: 1 entry → ${sourcePath} (${(sourceSize / 1024).toFixed(1)} KB)`);

  // 5. Summary
  console.log('\n=== Summary ===');
  for (const cat of categoryOrder) {
    if (summary[cat]) console.log(`  ${cat}: ${summary[cat]} files`);
  }
  console.log(`  Total files: ${totalCount}`);
  console.log(`  Total SQL size: ${(totalSqlSize / 1024 / 1024).toFixed(2)} MB`);
  console.log('\nDone!');
}

main();
