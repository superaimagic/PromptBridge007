// Export data via API to D1-compatible SQL
// Run: npx tsx scripts/api-export-to-d1.ts

const BASE = 'http://localhost:3000/api';

async function apiGet(path: string) {
  const res = await fetch(`${BASE}${path}`);
  const json = await res.json() as any;
  return json.data;
}

function esc(val: any): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? '1' : '0';
  const str = String(val);
  return "'" + str.replace(/'/g, "''").replace(/\0/g, '') + "'";
}

async function main() {
  const statements: string[] = [];

  // Get all files (with full content from detail API)
  let page = 1;
  let allFiles: any[] = [];
  do {
    const data = await apiGet(`/files?page=${page}&page_size=100`);
    if (!data || data.length === 0) break;
    // Fetch full details for each file
    for (const f of data) {
      try {
        const detail = await apiGet(`/files/${f.id}`);
        if (detail) allFiles.push(detail);
      } catch {
        allFiles.push(f); // fallback to list data
      }
    }
    page++;
  } while (true);

  console.error(`Files: ${allFiles.length}`);

  for (const f of allFiles) {
    statements.push(`INSERT OR IGNORE INTO files (id, slug, name, content, content_hash, format, project_id, source_type, repo_name, repo_url, repo_license, author, author_url, file_path, commit_hash, fetched_at, license, license_url, version, install_count, rating, created_at, updated_at, deleted_at) VALUES (${esc(f.id)}, ${esc(f.slug)}, ${esc(f.name)}, ${esc(f.content)}, ${esc(f.content_hash)}, ${esc(f.format)}, ${esc(f.project_id)}, ${esc(f.source_type || 'user')}, ${esc(f.repo_name)}, ${esc(f.repo_url)}, ${esc(f.repo_license)}, ${esc(f.author)}, ${esc(f.author_url)}, ${esc(f.file_path)}, ${esc(f.commit_hash)}, ${esc(f.fetched_at)}, ${esc(f.license || 'MIT')}, ${esc(f.license_url)}, ${f.version || 1}, ${f.install_count || 0}, ${f.rating || 0}, ${esc(f.created_at)}, ${esc(f.updated_at)}, NULL);`);
  }

  // Get tools
  const toolsData = await apiGet('/tools');
  console.error(`Tools: ${toolsData?.length || 0}`);

  if (toolsData) {
    for (const t of toolsData) {
      statements.push(`INSERT OR IGNORE INTO tools (id, name, display_name, category, detect_commands, prompt_paths, format_spec, deploy_config, is_active, created_at, updated_at) VALUES (${esc(t.id)}, ${esc(t.name)}, ${esc(t.display_name)}, ${esc(t.category)}, ${esc(t.detect_commands)}, ${esc(t.prompt_paths)}, ${esc(t.format_spec)}, ${esc(t.deploy_config)}, 1, ${esc(t.created_at || new Date().toISOString())}, ${esc(t.updated_at || new Date().toISOString())});`);
    }
  }

  // Get public sources
  const sourcesData = await apiGet('/public-sources');
  console.error(`Sources: ${sourcesData?.length || 0}`);

  if (sourcesData) {
    for (const s of sourcesData) {
      statements.push(`INSERT OR IGNORE INTO public_sources (id, name, repo_url, repo_license, description, local_path, last_sync_at, last_commit_hash, is_active, created_at, updated_at) VALUES (${esc(s.id)}, ${esc(s.name)}, ${esc(s.repo_url)}, ${esc(s.repo_license)}, ${esc(s.description)}, ${esc(s.local_path)}, ${esc(s.last_sync_at)}, ${esc(s.last_commit_hash)}, 1, ${esc(s.created_at)}, ${esc(s.updated_at)});`);
    }
  }

  // Get projects
  const projectsData = await apiGet('/projects');
  console.error(`Projects: ${projectsData?.length || 0}`);

  if (projectsData) {
    for (const p of projectsData) {
      statements.push(`INSERT OR IGNORE INTO projects (id, name, path, description, is_default, created_at, updated_at) VALUES (${esc(p.id)}, ${esc(p.name)}, ${esc(p.path)}, ${esc(p.description)}, ${p.is_default ? 1 : 0}, ${esc(p.created_at)}, ${esc(p.updated_at)});`);
    }
  }

  // Output
  console.log(`-- PromptBridge007 Data Export`);
  console.log(`-- Generated: ${new Date().toISOString()}`);
  console.log(`-- Files: ${allFiles.length}, Tools: ${toolsData?.length || 0}, Sources: ${sourcesData?.length || 0}`);
  console.log('');
  console.log(statements.join('\n'));
}

main().catch(console.error);
