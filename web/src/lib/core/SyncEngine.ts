import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createHash } from 'crypto';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { files, deployments, tags } from '@/lib/db/schema';
import { getToolById, toolRegistry, type ToolDefinition } from './ToolRegistry';
import { formatMatrix } from './FormatMatrix';

export type SyncDirection = 'to_tool' | 'from_tool';
export type SyncStatus = 'synced' | 'pending' | 'conflict' | 'not_deployed';

export interface SyncResult {
  toolId: string;
  toolName: string;
  direction: SyncDirection;
  status: 'success' | 'conflict' | 'error';
  filesSynced: number;
  conflicts: Array<{ filePath: string; dbModified: string; fsModified: string }>;
  errors: string[];
}

export interface ToolSyncStatus {
  toolId: string;
  toolName: string;
  status: SyncStatus;
  lastSyncAt: string | null;
  deployedFiles: number;
  pendingChanges: number;
}

/**
 * SyncEngine - 双向同步引擎
 *
 * 同步数据库中的提示词与工具目录中的实际文件：
 * - to_tool: 将数据库内容推送到工具目录（覆盖文件系统）
 * - from_tool: 从工具目录读取文件更新到数据库（覆盖数据库）
 */
export class SyncEngine {
  /**
   * 同步指定工具的提示词
   */
  async sync(toolId: string, direction: SyncDirection): Promise<SyncResult> {
    const tool = getToolById(toolId);
    if (!tool) {
      return {
        toolId,
        toolName: 'Unknown',
        direction,
        status: 'error',
        filesSynced: 0,
        conflicts: [],
        errors: [`Tool not found: ${toolId}`],
      };
    }

    if (direction === 'to_tool') {
      return this.syncToTool(tool);
    } else {
      return this.syncFromTool(tool);
    }
  }

  /**
   * 同步所有已部署工具
   */
  async syncAll(direction: SyncDirection): Promise<SyncResult[]> {
    // 获取所有有部署记录的工具
    const deploymentRows = await db
      .select({ toolId: deployments.toolId })
      .from(deployments)
      .groupBy(deployments.toolId);

    const results: SyncResult[] = [];
    for (const row of deploymentRows) {
      const result = await this.sync(row.toolId, direction);
      results.push(result);
    }
    return results;
  }

  /**
   * 推送：数据库 → 工具目录
   */
  private async syncToTool(tool: ToolDefinition): Promise<SyncResult> {
    const errors: string[] = [];
    let filesSynced = 0;
    const conflicts: SyncResult['conflicts'] = [];

    // 获取该工具的所有部署记录
    const deploymentRows = await db
      .select()
      .from(deployments)
      .where(eq(deployments.toolId, tool.id));

    for (const deployment of deploymentRows) {
      try {
        const targetPath = expandHomeDir(deployment.targetPath);

        // 检查文件是否在磁盘上被外部修改
        if (fs.existsSync(targetPath)) {
          const diskContent = fs.readFileSync(targetPath, 'utf-8');
          const diskHash = createContentHash(diskContent);

          // 如果磁盘内容与部署内容不同，说明被外部修改了
          const deployedHash = createContentHash(deployment.deployedContent ?? '');
          if (diskHash !== deployedHash) {
            conflicts.push({
              filePath: targetPath,
              dbModified: deployment.updatedAt,
              fsModified: fs.statSync(targetPath).mtime.toISOString(),
            });
            continue; // 跳过冲突文件
          }
        }

        // 将部署内容写入磁盘
        const dir = path.dirname(targetPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(targetPath, deployment.deployedContent ?? '', 'utf-8');
        filesSynced++;
      } catch (err) {
        errors.push(`Failed to sync ${deployment.targetPath}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return {
      toolId: tool.id,
      toolName: tool.displayName,
      direction: 'to_tool',
      status: conflicts.length > 0 ? 'conflict' : errors.length > 0 ? 'error' : 'success',
      filesSynced,
      conflicts,
      errors,
    };
  }

  /**
   * 拉取：工具目录 → 数据库
   */
  private async syncFromTool(tool: ToolDefinition): Promise<SyncResult> {
    const errors: string[] = [];
    let filesSynced = 0;
    const conflicts: SyncResult['conflicts'] = [];

    // 获取该工具的所有部署记录
    const deploymentRows = await db
      .select()
      .from(deployments)
      .where(eq(deployments.toolId, tool.id));

    for (const deployment of deploymentRows) {
      try {
        const targetPath = expandHomeDir(deployment.targetPath);

        if (!fs.existsSync(targetPath)) {
          errors.push(`File not found on disk: ${targetPath}`);
          continue;
        }

        const diskContent = fs.readFileSync(targetPath, 'utf-8');

        // 如果内容相同，跳过
        if (diskContent === deployment.deployedContent) continue;

        // 解析磁盘内容
        let sourceFormat = 'from_markdown';
        if (tool.formatSpec.extension === '.mdc') sourceFormat = 'from_mdc';
        else if (tool.formatSpec.extension === '.yaml') sourceFormat = 'from_yaml';
        else if (tool.formatSpec.extension === '.toml') sourceFormat = 'from_toml';
        else if (tool.formatSpec.extension === '.json') sourceFormat = 'from_json';
        if (tool.id === 'coze') sourceFormat = 'from_coze_md';
        else if (tool.id === 'openclaw') sourceFormat = 'from_openclaw_md';

        let pif: ReturnType<typeof formatMatrix.fromFormat>;
        try {
          pif = formatMatrix.fromFormat(diskContent, sourceFormat);
        } catch {
          pif = { content: diskContent };
        }

        // 检查数据库中的文件是否在部署后被修改过
        const fileRows = await db.select().from(files).where(eq(files.id, deployment.fileId)).limit(1);
        if (fileRows.length === 0) continue;

        const file = fileRows[0];
        const dbContentHash = file.contentHash;
        const deployContentHash = createContentHash(deployment.deployedContent ?? '');

        // 如果数据库在部署后被修改过，产生冲突
        if (dbContentHash !== deployContentHash) {
          conflicts.push({
            filePath: targetPath,
            dbModified: file.updatedAt,
            fsModified: fs.statSync(targetPath).mtime.toISOString(),
          });
          continue;
        }

        // 用磁盘内容更新数据库
        const contentHash = createContentHash(pif.content ?? diskContent);
        await db.update(files).set({
          content: pif.content ?? diskContent,
          contentHash,
          name: pif.name ?? file.name,
          version: (file.version ?? 0) + 1,
          updatedAt: new Date().toISOString(),
        }).where(eq(files.id, file.id));

        // 更新部署记录
        await db.update(deployments).set({
          deployedContent: diskContent,
          status: 'success',
          updatedAt: new Date().toISOString(),
        }).where(eq(deployments.id, deployment.id));

        filesSynced++;
      } catch (err) {
        errors.push(`Failed to sync from ${deployment.targetPath}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return {
      toolId: tool.id,
      toolName: tool.displayName,
      direction: 'from_tool',
      status: conflicts.length > 0 ? 'conflict' : errors.length > 0 ? 'error' : 'success',
      filesSynced,
      conflicts,
      errors,
    };
  }

  /**
   * 获取所有工具的同步状态
   */
  async getSyncStatuses(): Promise<ToolSyncStatus[]> {
    const results: ToolSyncStatus[] = [];

    for (const tool of toolRegistry) {
      const deploymentRows = await db
        .select()
        .from(deployments)
        .where(eq(deployments.toolId, tool.id))
        .orderBy(desc(deployments.createdAt));

      if (deploymentRows.length === 0) {
        results.push({
          toolId: tool.id,
          toolName: tool.displayName,
          status: 'not_deployed',
          lastSyncAt: null,
          deployedFiles: 0,
          pendingChanges: 0,
        });
        continue;
      }

      let pendingChanges = 0;
      let lastSyncAt: string | null = null;

      for (const deployment of deploymentRows) {
        const targetPath = expandHomeDir(deployment.targetPath);
        if (fs.existsSync(targetPath)) {
          try {
            const diskContent = fs.readFileSync(targetPath, 'utf-8');
            if (diskContent !== deployment.deployedContent) {
              pendingChanges++;
            }
          } catch {
            // 忽略读取错误
          }
        }
        if (!lastSyncAt || deployment.updatedAt > lastSyncAt) {
          lastSyncAt = deployment.updatedAt;
        }
      }

      results.push({
        toolId: tool.id,
        toolName: tool.displayName,
        status: pendingChanges > 0 ? 'pending' : 'synced',
        lastSyncAt,
        deployedFiles: deploymentRows.length,
        pendingChanges,
      });
    }

    return results;
  }
}

// ============================================================
// 辅助函数
// ============================================================

function expandHomeDir(filePath: string): string {
  if (filePath.startsWith('~/')) {
    return path.join(os.homedir(), filePath.slice(2));
  }
  return filePath;
}

function createContentHash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

export const syncEngine = new SyncEngine();
