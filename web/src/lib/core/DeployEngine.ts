import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { eq, and, desc } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { deployments, files } from '@/lib/db/schema';
import { getToolById, type ToolDefinition } from './ToolRegistry';
import { formatMatrix, type PIFEntity } from './FormatMatrix';

export type DeployMode = 'original' | 'customized' | 'incremental';
export type DeployStatus = 'pending' | 'success' | 'failed' | 'conflict';

export interface DeployRequest {
  fileId: string;
  toolId: string;
  mode: DeployMode;
  customContent?: string;
  projectId?: string;
}

export interface DeployResult {
  deployId: string;
  fileId: string;
  toolId: string;
  mode: DeployMode;
  status: DeployStatus;
  targetPath: string;
  deployedContent: string;
  errorMessage?: string;
  deployedAt: string;
}

/**
 * DeployEngine - 部署引擎
 *
 * 三种部署模式：
 * - original: 原版部署，直接使用 PIF 内容
 * - customized: 定制部署，使用自定义内容替换
 * - incremental: 增量部署，原版内容 + 追加自定义指令
 */
export class DeployEngine {
  /**
   * 执行部署
   */
  async deploy(request: DeployRequest, projectPath?: string): Promise<DeployResult> {
    const deployId = generateId();
    const now = new Date().toISOString();

    // 获取文件信息
    const fileRows = await getDb()
      .select()
      .from(files)
      .where(eq(files.id, request.fileId))
      .limit(1);

    if (fileRows.length === 0) {
      return {
        deployId,
        fileId: request.fileId,
        toolId: request.toolId,
        mode: request.mode,
        status: 'failed',
        targetPath: '',
        deployedContent: '',
        errorMessage: `File not found: ${request.fileId}`,
        deployedAt: now,
      };
    }

    const file = fileRows[0];
    const tool = getToolById(request.toolId);

    if (!tool) {
      return {
        deployId,
        fileId: request.fileId,
        toolId: request.toolId,
        mode: request.mode,
        status: 'failed',
        targetPath: '',
        deployedContent: '',
        errorMessage: `Tool not found: ${request.toolId}`,
        deployedAt: now,
      };
    }

    // 构建 PIF 实体
    const pif: PIFEntity = {
      name: file.name,
      content: file.content,
      slug: file.slug,
      license: file.license,
      licenseUrl: file.licenseUrl ?? undefined,
      sourceType: file.sourceType,
      repoName: file.repoName ?? undefined,
      repoUrl: file.repoUrl ?? undefined,
      repoLicense: file.repoLicense ?? undefined,
      author: file.author ?? undefined,
    };

    // 根据部署模式生成内容
    let deployedContent: string;
    switch (request.mode) {
      case 'original':
        deployedContent = this.deployOriginal(pif, tool);
        break;
      case 'customized':
        deployedContent = this.deployCustomized(pif, request.customContent ?? '', tool);
        break;
      case 'incremental':
        deployedContent = this.deployIncremental(pif, request.customContent ?? '', tool);
        break;
      default:
        return {
          deployId,
          fileId: request.fileId,
          toolId: request.toolId,
          mode: request.mode,
          status: 'failed',
          targetPath: '',
          deployedContent: '',
          errorMessage: `Unknown deploy mode: ${request.mode}`,
          deployedAt: now,
        };
    }

    // 计算目标路径
    const targetPath = this.resolveTargetPath(file.slug, tool, projectPath);

    // 路径遍历验证：确保目标路径在允许的基础目录下
    const resolvedTarget = path.resolve(expandHomeDir(targetPath));
    const resolvedBase = path.resolve(expandHomeDir(tool.deployConfig.targetDir.replace('{project}', 'default')));
    if (!resolvedTarget.toLowerCase().startsWith(resolvedBase.toLowerCase())) {
      const failedResult: DeployResult = {
        deployId,
        fileId: request.fileId,
        toolId: request.toolId,
        mode: request.mode,
        status: 'failed',
        targetPath: '',
        deployedContent: '',
        errorMessage: 'Invalid target path: path traversal detected',
        deployedAt: now,
      };
      await getDb().insert(deployments).values({
        id: deployId,
        fileId: request.fileId,
        toolId: request.toolId,
        projectId: request.projectId ?? null,
        mode: request.mode,
        targetPath,
        deployedContent: '',
        status: 'failed',
        errorMessage: 'Invalid target path: path traversal detected',
        createdAt: now,
        updatedAt: now,
      });
      return failedResult;
    }

    // 写入文件
    let status: DeployStatus = 'success';
    let errorMessage: string | undefined;

    try {
      const expandedTarget = expandHomeDir(targetPath);
      const dir = path.dirname(expandedTarget);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(expandedTarget, deployedContent, 'utf-8');
    } catch (err) {
      status = 'failed';
      errorMessage = err instanceof Error ? err.message : String(err);
    }

    // 记录部署
    await getDb().insert(deployments).values({
      id: deployId,
      fileId: request.fileId,
      toolId: request.toolId,
      projectId: request.projectId ?? null,
      mode: request.mode,
      targetPath,
      deployedContent,
      status,
      errorMessage: errorMessage || null,
      createdAt: now,
      updatedAt: now,
    });

    return {
      deployId,
      fileId: request.fileId,
      toolId: request.toolId,
      mode: request.mode,
      status,
      targetPath,
      deployedContent,
      errorMessage,
      deployedAt: now,
    };
  }

  /**
   * 原版部署：直接转换为工具原生格式
   */
  private deployOriginal(pif: PIFEntity, tool: ToolDefinition): string {
    const formatKey = `to_${tool.id.replace(/-/g, '_')}`;
    try {
      return formatMatrix.toFormat(pif, formatKey);
    } catch {
      // 回退到纯 markdown
      return pif.content;
    }
  }

  /**
   * 定制部署：使用自定义内容替换原版
   */
  private deployCustomized(pif: PIFEntity, customContent: string, tool: ToolDefinition): string {
    const customPif: PIFEntity = {
      ...pif,
      content: customContent || pif.content,
    };
    const formatKey = `to_${tool.id.replace(/-/g, '_')}`;
    try {
      return formatMatrix.toFormat(customPif, formatKey);
    } catch {
      return customPif.content;
    }
  }

  /**
   * 增量部署：原版内容 + 追加自定义指令
   */
  private deployIncremental(pif: PIFEntity, customContent: string, tool: ToolDefinition): string {
    const combined = customContent
      ? `${pif.content}\n\n---\n\n# Custom Instructions\n\n${customContent}`
      : pif.content;
    const combinedPif: PIFEntity = { ...pif, content: combined };
    const formatKey = `to_${tool.id.replace(/-/g, '_')}`;
    try {
      return formatMatrix.toFormat(combinedPif, formatKey);
    } catch {
      return combinedPif.content;
    }
  }

  /**
   * 解析目标部署路径
   */
  private resolveTargetPath(slug: string, tool: ToolDefinition, projectPath?: string): string {
    const targetDir = tool.deployConfig.targetDir
      .replace('{project}', 'default');

    // Resolve relative paths against project directory
    let resolvedDir = targetDir;
    if (targetDir.startsWith('./')) {
      const baseDir = projectPath || process.cwd();
      resolvedDir = path.resolve(baseDir, targetDir);
    } else if (targetDir.startsWith('~/')) {
      resolvedDir = expandHomeDir(targetDir);
    }

    const safeSlug = sanitizeSlug(slug);
    const fileName = safeSlug + tool.formatSpec.extension;
    return path.join(resolvedDir, fileName);
  }

  /**
   * 获取部署状态
   */
  async getDeploymentStatus(fileId: string, toolId: string): Promise<typeof deployments.$inferSelect | null> {
    const rows = await getDb()
      .select()
      .from(deployments)
      .where(and(eq(deployments.fileId, fileId), eq(deployments.toolId, toolId)))
      .orderBy(desc(deployments.createdAt))
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * 回滚部署
   */
  async rollback(deployId: string): Promise<void> {
    const rows = await getDb()
      .select()
      .from(deployments)
      .where(eq(deployments.id, deployId))
      .limit(1);

    if (rows.length === 0) {
      throw new Error(`Deployment not found: ${deployId}`);
    }

    const deployment = rows[0];

    // 尝试删除已部署的文件
    try {
      const expandedPath = expandHomeDir(deployment.targetPath);
      if (fs.existsSync(expandedPath)) {
        fs.unlinkSync(expandedPath);
      }
    } catch {
      // 忽略文件删除错误
    }

    // 更新部署状态
    await getDb()
      .update(deployments)
      .set({ status: 'failed', errorMessage: 'Rolled back', updatedAt: new Date().toISOString() })
      .where(eq(deployments.id, deployId));
  }

  /**
   * 获取部署历史
   */
  async getDeployHistory(fileId?: string, limit = 20): Promise<typeof deployments.$inferSelect[]> {
    if (fileId) {
      return getDb()
        .select()
        .from(deployments)
        .where(eq(deployments.fileId, fileId))
        .orderBy(desc(deployments.createdAt))
        .limit(limit);
    }
    return getDb()
      .select()
      .from(deployments)
      .orderBy(desc(deployments.createdAt))
      .limit(limit);
  }
}

// ============================================================
// 辅助函数
// ============================================================

function generateId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function sanitizeSlug(slug: string): string {
  return slug
    .replace(/\.\./g, '')
    .replace(/[\/\\]/g, '-')
    .replace(/[^\w\u4e00-\u9fff-]/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

function expandHomeDir(filePath: string): string {
  if (filePath.startsWith('~/')) {
    return path.join(os.homedir(), filePath.slice(2));
  }
  return filePath;
}

export const deployEngine = new DeployEngine();
