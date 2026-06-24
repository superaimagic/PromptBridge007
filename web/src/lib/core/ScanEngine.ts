import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createHash } from 'crypto';
import { execSync } from 'child_process';
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { files, fileVersions, tags, scanHistory, scanSources } from '@/lib/db/schema';
import { toolRegistry, getToolById, resolveProjectDir, type ToolDefinition } from './ToolRegistry';
import { formatMatrix } from './FormatMatrix';

export interface ScanResult {
  toolId: string;
  toolName: string;
  detected: boolean;
  filesFound: number;
  filesImported: number;
  filesUpdated: number;
  filesSkipped: number;
  errors: string[];
}

export interface EnvironmentScanResult {
  scanId: string;
  totalTools: number;
  detectedTools: number;
  results: ScanResult[];
  startedAt: string;
  completedAt: string;
  status: 'running' | 'completed' | 'failed';
}

/**
 * ScanEngine - 环境扫描引擎
 *
 * 两级优先扫描策略：
 * - Level 1: 检查 Tool Registry 中的已知路径（命中率高、速度快）
 * - Level 2: 广度搜索常见安装目录（兜底方案）
 *
 * 扫描后自动将文件导入数据库，使用 FormatMatrix 反向转换器解析内容
 */
export class ScanEngine {
  /**
   * 扫描整个环境，检测所有已安装工具
   */
  async scanEnvironment(toolIds?: string[], projectId?: string): Promise<EnvironmentScanResult> {
    const scanId = generateId();
    const startedAt = new Date().toISOString();
    const targets = toolIds
      ? toolRegistry.filter((t) => toolIds.includes(t.id))
      : toolRegistry;

    const results: ScanResult[] = [];

    for (const tool of targets) {
      const result = await this.scanTool(tool, projectId);
      results.push(result);
    }

    const completedAt = new Date().toISOString();
    const detectedTools = results.filter((r) => r.detected).length;

    // 记录扫描历史
    await db.insert(scanHistory).values({
      id: scanId,
      toolId: null,
      scanType: 'full',
      filesFound: results.reduce((sum, r) => sum + r.filesFound, 0),
      filesImported: results.reduce((sum, r) => sum + r.filesImported, 0),
      filesUpdated: results.reduce((sum, r) => sum + r.filesUpdated, 0),
      filesSkipped: results.reduce((sum, r) => sum + r.filesSkipped, 0),
      startedAt,
      completedAt,
      status: 'completed',
      errorMessage: null,
    });

    return {
      scanId,
      totalTools: targets.length,
      detectedTools,
      results,
      startedAt,
      completedAt,
      status: 'completed',
    };
  }

  /**
   * 扫描单个工具
   */
  async scanTool(toolOrId: ToolDefinition | string, projectId?: string): Promise<ScanResult> {
    const tool = typeof toolOrId === 'string' ? getToolById(toolOrId) : toolOrId;
    if (!tool) {
      return {
        toolId: typeof toolOrId === 'string' ? toolOrId : toolOrId.id,
        toolName: 'Unknown',
        detected: false,
        filesFound: 0,
        filesImported: 0,
        filesUpdated: 0,
        filesSkipped: 0,
        errors: [`Tool not found: ${toolOrId}`],
      };
    }

    const errors: string[] = [];
    let detected = false;
    let filesFound = 0;
    let filesImported = 0;
    let filesUpdated = 0;
    let filesSkipped = 0;

    // Level 1: 检查已知路径
    for (const promptPath of tool.promptPaths) {
      const resolvedPath = resolvePromptPath(promptPath);
      if (isDirectory(resolvedPath)) {
        detected = true;
        const found = await scanDirectory(resolvedPath, tool.formatSpec.extension);
        filesFound += found.length;
        for (const filePath of found) {
          try {
            const result = await this.importFile(filePath, tool, projectId);
            if (result === 'imported') filesImported++;
            else if (result === 'updated') filesUpdated++;
            else filesSkipped++;
          } catch (err) {
            errors.push(`Failed to import ${filePath}: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
      } else if (isFile(resolvedPath)) {
        detected = true;
        filesFound += 1;
        try {
          const result = await this.importFile(resolvedPath, tool, projectId);
          if (result === 'imported') filesImported++;
          else if (result === 'updated') filesUpdated++;
          else filesSkipped++;
        } catch (err) {
          errors.push(`Failed to import ${resolvedPath}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }

    // Level 2: 广度搜索（仅当 Level 1 未发现时）
    if (!detected) {
      const commonDirs = getCommonInstallDirs();
      for (const dir of commonDirs) {
        const toolDir = path.join(dir, tool.name);
        if (isDirectory(toolDir)) {
          detected = true;
          const found = await scanDirectory(toolDir, tool.formatSpec.extension);
          filesFound += found.length;
          for (const filePath of found) {
            try {
              const result = await this.importFile(filePath, tool, projectId);
              if (result === 'imported') filesImported++;
              else if (result === 'updated') filesUpdated++;
              else filesSkipped++;
            } catch (err) {
              errors.push(`Failed to import ${filePath}: ${err instanceof Error ? err.message : String(err)}`);
            }
          }
          break;
        }
      }
    }

    // 尝试检测命令验证
    if (!detected) {
      for (const cmd of tool.detectCommands) {
        try {
          const cmdBase = cmd.split(' ')[0];
          const whichPath = findExecutable(cmdBase);
          if (whichPath) {
            detected = true;
            break;
          }
        } catch {
          // 忽略检测错误
        }
      }
    }

    // 记录扫描来源
    if (detected) {
      for (const promptPath of tool.promptPaths) {
        const expandedPath = resolvePromptPath(promptPath);
        try {
          await db.insert(scanSources).values({
            id: generateId(),
            toolId: tool.id,
            sourcePath: expandedPath,
            isRecursive: true,
            filePattern: `*${tool.formatSpec.extension}`,
            createdAt: new Date().toISOString(),
          });
        } catch {
          // 忽略重复插入
        }
      }
    }

    return {
      toolId: tool.id,
      toolName: tool.displayName,
      detected,
      filesFound,
      filesImported,
      filesUpdated,
      filesSkipped,
      errors,
    };
  }

  /**
   * 导入单个文件到数据库
   */
  private async importFile(filePath: string, tool: ToolDefinition, projectId?: string): Promise<'imported' | 'updated' | 'skipped'> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const fileName = path.basename(filePath, path.extname(filePath));
    const slug = slugify(fileName) + '-' + generateId(6);

    // 确定源格式
    let sourceFormat = 'from_markdown';
    if (tool.formatSpec.extension === '.mdc') sourceFormat = 'from_mdc';
    else if (tool.formatSpec.extension === '.yaml') sourceFormat = 'from_yaml';
    else if (tool.formatSpec.extension === '.toml') sourceFormat = 'from_toml';
    else if (tool.formatSpec.extension === '.json') sourceFormat = 'from_json';
    if (tool.id === 'coze') sourceFormat = 'from_coze_md';
    else if (tool.id === 'openclaw') sourceFormat = 'from_openclaw_md';

    // 解析内容
    let pif: ReturnType<typeof formatMatrix.fromFormat>;
    try {
      pif = formatMatrix.fromFormat(content, sourceFormat);
    } catch {
      // 解析失败时使用原始内容
      pif = { name: fileName, content };
    }

    const now = new Date().toISOString();
    const contentHash = createHash('sha256').update(pif.content ?? content).digest('hex');

    // 检查是否已存在同路径的文件
    const existing = await db.select().from(files)
      .where(and(eq(files.sourceType, 'environment_scan'), eq(files.filePath, filePath)))
      .limit(1);

    if (existing.length > 0) {
      const file = existing[0];
      if (file.contentHash === contentHash) return 'skipped';

      // 更新
      await db.update(files).set({
        content: pif.content ?? content,
        contentHash,
        version: (file.version ?? 0) + 1,
        updatedAt: now,
      }).where(eq(files.id, file.id));

      // 创建版本记录
      await db.insert(fileVersions).values({
        id: generateId(),
        fileId: file.id,
        version: (file.version ?? 0) + 1,
        content: pif.content ?? content,
        contentHash,
        changeSummary: 'Updated from environment scan',
        createdAt: now,
      });

      return 'updated';
    }

    // 插入新文件
    const fileId = generateId();
    await db.insert(files).values({
      id: fileId,
      name: pif.name ?? fileName,
      slug,
      content: pif.content ?? content,
      format: 'markdown',
      contentHash,
      projectId: projectId ?? null,
      license: pif.license ?? 'unknown',
      licenseUrl: pif.licenseUrl ?? null,
      sourceType: 'environment_scan',
      repoName: pif.repoName ?? null,
      repoUrl: pif.repoUrl ?? null,
      repoLicense: pif.repoLicense ?? null,
      author: pif.author ?? null,
      authorUrl: null,
      filePath: filePath,
      commitHash: null,
      fetchedAt: now,
      installCount: 0,
      rating: 0,
      version: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });

    // 添加工具标签
    await db.insert(tags).values({
      id: generateId(),
      fileId,
      dimension: 'tool',
      value: tool.id,
      confidence: 'full',
      createdAt: now,
    });

    // 添加来源类型标签
    await db.insert(tags).values({
      id: generateId(),
      fileId,
      dimension: 'source_type',
      value: 'environment_scan',
      confidence: 'full',
      createdAt: now,
    });

    // 创建初始版本
    await db.insert(fileVersions).values({
      id: generateId(),
      fileId,
      version: 1,
      content: pif.content ?? content,
      contentHash,
      changeSummary: 'Imported from environment scan',
      createdAt: now,
    });

    return 'imported';
  }

  /**
   * 获取扫描历史
   */
  async getScanHistory(limit = 20): Promise<typeof scanHistory.$inferSelect[]> {
    return db
      .select()
      .from(scanHistory)
      .orderBy(scanHistory.startedAt)
      .limit(limit);
  }
}

// ============================================================
// 辅助函数
// ============================================================

function generateId(length = 12): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * 解析提示词路径：处理 ~ 和 ./ 相对路径
 */
function resolvePromptPath(promptPath: string): string {
  const projectDir = resolveProjectDir();
  let resolved = promptPath.replace(/\/$/, '');

  if (resolved.startsWith('~/')) {
    resolved = path.join(os.homedir(), resolved.slice(2));
  } else if (resolved.startsWith('./')) {
    resolved = path.join(projectDir, resolved.slice(2));
  }

  // 处理通配符路径中的 * 
  resolved = resolved.replace(/\/\*\//, '/');
  return resolved;
}

function expandHomeDir(filePath: string): string {
  if (filePath.startsWith('~/')) {
    return path.join(os.homedir(), filePath.slice(2));
  }
  return filePath;
}

function isDirectory(dirPath: string): boolean {
  try {
    return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
  } catch {
    return false;
  }
}

function isFile(filePath: string): boolean {
  try {
    return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function findExecutable(name: string): string | null {
  // Only allow alphanumeric and hyphen characters to prevent command injection
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(name)) {
    return null;
  }
  try {
    const result = execSync(`where ${name} 2>nul`, {
      encoding: 'utf-8',
      timeout: 5000,
      windowsHide: true,
    });
    const trimmed = result.trim();
    return trimmed || null;
  } catch {
    return null;
  }
}

async function scanDirectory(dirPath: string, extension: string): Promise<string[]> {
  const results: string[] = [];
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        const subResults = await scanDirectory(fullPath, extension);
        results.push(...subResults);
      } else if (entry.name.endsWith(extension)) {
        results.push(fullPath);
      }
    }
  } catch {
    // 忽略权限错误
  }
  return results;
}

function getCommonInstallDirs(): string[] {
  const home = os.homedir();
  const platform = os.platform();
  const dirs: string[] = [];

  if (platform === 'darwin') {
    dirs.push(
      path.join(home, 'Applications'),
      path.join(home, '.local'),
      path.join(home, '.config'),
      '/Applications'
    );
  } else if (platform === 'linux') {
    dirs.push(
      path.join(home, '.local'),
      path.join(home, '.config'),
      '/opt',
      '/usr/local'
    );
  } else {
    // Windows
    dirs.push(
      path.join(home, 'AppData', 'Local'),
      path.join(home, 'AppData', 'Roaming'),
      'C:\\Program Files',
      'C:\\Program Files (x86)'
    );
  }

  return dirs.filter(isDirectory);
}

export const scanEngine = new ScanEngine();
