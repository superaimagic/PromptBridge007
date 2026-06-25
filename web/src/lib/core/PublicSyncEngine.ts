import * as path from 'path';
// Lazy-load Node.js modules to avoid Workers runtime crash
let _fs: typeof import('fs') | null = null;
function getFs(): typeof import('fs') {
  if (!_fs) { _fs = require('fs'); }
  return _fs!;
}
let _os: typeof import('os') | null = null;
function getOs(): typeof import('os') {
  if (!_os) { _os = require('os'); }
  return _os!;
}
let _childProcess: typeof import('child_process') | null = null;
function getChildProcess(): typeof import('child_process') {
  if (!_childProcess) { _childProcess = require('child_process'); }
  return _childProcess!;
}
import { createHash } from 'crypto';
import { nanoid } from 'nanoid';
import { eq, and } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { files, tags, publicSources } from '@/lib/db/schema';
import { formatMatrix } from './FormatMatrix';

export interface SyncSourceResult {
  sourceId: string;
  sourceName: string;
  status: 'success' | 'error' | 'no_changes';
  filesFound: number;
  filesImported: number;
  filesUpdated: number;
  filesSkipped: number;
  errors: string[];
}

export class PublicSyncEngine {
  private cacheDir: string;

  constructor() {
    this.cacheDir = path.join(getOs().homedir(), '.promptbridge007', 'cache');
    if (!getFs().existsSync(this.cacheDir)) {
      getFs().mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  /**
   * Sync a public source repository
   */
  async syncSource(sourceId: string): Promise<SyncSourceResult> {
    const sourceRows = await getDb().select().from(publicSources).where(eq(publicSources.id, sourceId)).limit(1);
    if (sourceRows.length === 0) {
      return {
        sourceId,
        sourceName: 'Unknown',
        status: 'error',
        filesFound: 0,
        filesImported: 0,
        filesUpdated: 0,
        filesSkipped: 0,
        errors: ['Source not found'],
      };
    }

    const source = sourceRows[0];
    const localPath = path.join(this.cacheDir, sourceId);
    const errors: string[] = [];
    let filesFound = 0;
    let filesImported = 0;
    let filesUpdated = 0;
    let filesSkipped = 0;

    // Validate repository URL to prevent command injection
    if (!/^https?:\/\/[^\s;|&$`'"\\]+$/.test(source.repoUrl)) {
      return {
        sourceId,
        sourceName: source.name,
        status: 'error',
        filesFound: 0,
        filesImported: 0,
        filesUpdated: 0,
        filesSkipped: 0,
        errors: ['Invalid repository URL'],
      };
    }

    try {
      // Clone or pull
      if (getFs().existsSync(path.join(localPath, '.git'))) {
        // Pull latest
        getChildProcess().execSync('git pull --ff-only', { cwd: localPath, timeout: 30000, windowsHide: true });
      } else {
        // Clean and clone
        if (getFs().existsSync(localPath)) {
          getFs().rmSync(localPath, { recursive: true, force: true });
        }
        getFs().mkdirSync(localPath, { recursive: true });
        getChildProcess().execSync(`git clone --depth 1 ${source.repoUrl} .`, { cwd: localPath, timeout: 60000, windowsHide: true });
      }

      // Get current commit hash
      const currentHash = getChildProcess().execSync('git rev-parse HEAD', { cwd: localPath, encoding: 'utf-8', windowsHide: true }).trim();

      // Check if already synced this commit
      if (currentHash === source.lastCommitHash) {
        return {
          sourceId,
          sourceName: source.name,
          status: 'no_changes',
          filesFound: 0,
          filesImported: 0,
          filesUpdated: 0,
          filesSkipped: 0,
          errors: [],
        };
      }

      // Scan for prompt files
      const promptFiles = this.scanForPrompts(localPath);
      filesFound = promptFiles.length;

      // Import each file
      for (const filePath of promptFiles) {
        try {
          const result = await this.importFile(filePath, source, localPath);
          if (result === 'imported') filesImported++;
          else if (result === 'updated') filesUpdated++;
          else filesSkipped++;
        } catch (err) {
          errors.push(`Failed to import ${filePath}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      // Update source record
      await getDb().update(publicSources).set({
        localPath,
        lastSyncAt: new Date().toISOString(),
        lastCommitHash: currentHash,
        updatedAt: new Date().toISOString(),
      }).where(eq(publicSources.id, sourceId));

    } catch (err) {
      errors.push(`Git operation failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    return {
      sourceId,
      sourceName: source.name,
      status: errors.length > 0 ? 'error' : 'success',
      filesFound,
      filesImported,
      filesUpdated,
      filesSkipped,
      errors,
    };
  }

  /**
   * Scan directory for prompt files
   */
  private scanForPrompts(dirPath: string): string[] {
    const results: string[] = [];
    const extensions = ['.md', '.mdc', '.yaml', '.yml', '.toml', '.json', '.txt'];

    try {
      const entries = getFs().readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        // Skip hidden dirs, node_modules, .git
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;

        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          results.push(...this.scanForPrompts(fullPath));
        } else if (extensions.some(ext => entry.name.endsWith(ext))) {
          // Skip very large files (>500KB)
          try {
            const stat = getFs().statSync(fullPath);
            if (stat.size <= 512 * 1024) {
              results.push(fullPath);
            }
          } catch { /* skip */ }
        }
      }
    } catch { /* skip permission errors */ }

    return results;
  }

  /**
   * Import a single file from a public source
   */
  private async importFile(
    filePath: string,
    source: typeof publicSources.$inferSelect,
    localPath: string,
  ): Promise<'imported' | 'updated' | 'skipped'> {
    const content = getFs().readFileSync(filePath, 'utf-8');
    const fileName = path.basename(filePath, path.extname(filePath));

    // Build a descriptive name from the file path (e.g., "ANTHROPIC/CLAUDE-FABLE-5")
    const dirName = path.basename(path.dirname(filePath));
    const descriptiveName = (dirName !== path.basename(localPath))
      ? `${dirName}/${fileName}`
      : fileName;

    // Determine format and parse
    const ext = path.extname(filePath);
    let sourceFormat = 'from_markdown';
    if (ext === '.mdc') sourceFormat = 'from_mdc';
    else if (ext === '.yaml' || ext === '.yml') sourceFormat = 'from_yaml';
    else if (ext === '.toml') sourceFormat = 'from_toml';
    else if (ext === '.json') sourceFormat = 'from_json';

    const pif = formatMatrix.fromFormat(content, sourceFormat);

    // Use PIF name if meaningful, otherwise use file name
    const genericNames = new Set(['untitled', 'system prompt', 'instructions', 'tools', 'input description', 'content', 'prompt', 'readme']);
    const pifNameLower = (pif.name ?? '').toLowerCase().trim();
    const isGenericName = !pif.name || pif.name.length === 0 || pifNameLower === 'untitled' || genericNames.has(pifNameLower);
    const baseName = isGenericName ? fileName : pif.name;

    // Always prefix with directory name for public repo imports (e.g., "ANTHROPIC/Claude Code System Prompt")
    const effectiveName = (dirName !== path.basename(localPath))
      ? `${dirName}/${baseName}`
      : baseName;

    const contentHash = createHash('sha256').update(pif.content ?? content).digest('hex');
    const now = new Date().toISOString();

    // Convert absolute filePath to relative path for storage
    const relativePath = path.relative(localPath, filePath);

    // Check existing by repoUrl + filePath
    const existing = await getDb().select().from(files)
      .where(and(eq(files.repoUrl, source.repoUrl), eq(files.filePath, relativePath)))
      .limit(1);

    if (existing.length > 0) {
      const file = existing[0];
      if (file.contentHash === contentHash) return 'skipped';

      await getDb().update(files).set({
        content: pif.content ?? content,
        contentHash,
        name: effectiveName ?? fileName,
        version: (file.version ?? 0) + 1,
        updatedAt: now,
      }).where(eq(files.id, file.id));

      return 'updated';
    }

    // Insert new
    const fileId = nanoid(12);
    const slug = (effectiveName ?? fileName).toLowerCase().replace(/[^\w\u4e00-\u9fff]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) + '-' + nanoid(6);

    await getDb().insert(files).values({
      id: fileId,
      name: effectiveName ?? fileName,
      slug,
      content: pif.content ?? content,
      format: 'markdown',
      contentHash,
      license: source.repoLicense ?? pif.license ?? 'unknown',
      licenseUrl: pif.licenseUrl ?? null,
      sourceType: 'public_repo',
      repoName: source.name,
      repoUrl: source.repoUrl,
      repoLicense: source.repoLicense,
      author: pif.author ?? null,
      authorUrl: null,
      filePath: relativePath,
      commitHash: null,
      fetchedAt: now,
      installCount: 0,
      rating: 0,
      version: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });

    // Add source_type tag
    await getDb().insert(tags).values({
      id: nanoid(12),
      fileId,
      dimension: 'source_type',
      value: 'public_repo',
      confidence: 'full',
      createdAt: now,
    });

    // Add tool tag based on directory name (e.g., ANTHROPIC → anthropic, CURSOR → cursor)
    const toolTagMap: Record<string, string> = {
      'ANTHROPIC': 'claude-code', 'OPENAI': 'codex', 'GOOGLE': 'gemini-cli',
      'CURSOR': 'cursor', 'WINDSURF': 'windsurf', 'REPLIT': 'replit',
      'DEVIN': 'devin', 'MANUS': 'manus', 'CLINE': 'cline',
      'BOLT': 'bolt', 'BRAVE': 'brave', 'MISTRAL': 'mistral',
      'XAI': 'grok', 'PERPLEXITY': 'perplexity', 'META': 'meta',
      'MINIMAX': 'minimax', 'MOONSHOT': 'kimi-code',
    };
    const toolTag = toolTagMap[dirName.toUpperCase()];
    if (toolTag) {
      await getDb().insert(tags).values({
        id: nanoid(12),
        fileId,
        dimension: 'tool',
        value: toolTag,
        confidence: 'high',
        createdAt: now,
      });
    }

    // Add domain tag
    await getDb().insert(tags).values({
      id: nanoid(12),
      fileId,
      dimension: 'domain',
      value: 'system-prompt',
      confidence: 'high',
      createdAt: now,
    });

    return 'imported';
  }
}

export const publicSyncEngine = new PublicSyncEngine();
