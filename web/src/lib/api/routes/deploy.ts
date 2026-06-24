import { Hono } from 'hono';
import { eq, and, desc, sql as drizzleSql, SQL } from 'drizzle-orm';
import { db } from '@/lib/db';
import { deployments, files, projects } from '@/lib/db/schema';
import { deployEngine } from '@/lib/core/DeployEngine';
import { success, error, validateInput } from '../types';

const router = new Hono();

router.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { file_id, tool_id, mode, custom_content, project_id } = body as {
      file_id: string;
      tool_id: string;
      mode: 'original' | 'customized' | 'incremental';
      custom_content?: string;
      project_id?: string;
    };

    if (!file_id || !tool_id || !mode) {
      return c.json(error('INVALID_INPUT', 'file_id, tool_id, and mode are required', 400), 400);
    }

    const deployValidationError = validateInput({ tool_id });
    if (deployValidationError) {
      return c.json(error('INVALID_INPUT', deployValidationError, 400), 400);
    }

    // Look up project path from project_id
    let projectPath: string | undefined;
    if (project_id) {
      const projectRows = await db.select({ path: projects.path }).from(projects).where(eq(projects.id, project_id)).limit(1);
      if (projectRows.length > 0) {
        projectPath = projectRows[0].path;
      }
    }

    // 使用真实部署引擎
    const result = await deployEngine.deploy({
      fileId: file_id,
      toolId: tool_id,
      mode,
      customContent: custom_content,
      projectId: project_id,
    }, projectPath);

    // 更新安装计数
    if (result.status === 'success') {
      await db.update(files)
        .set({ installCount: drizzleSql`${files.installCount} + 1` })
        .where(eq(files.id, file_id));
    }

    const statusCode = result.status === 'success' ? 201 : 500;
    return c.json(success({
      deploy_id: result.deployId,
      status: result.status,
      target_path: result.targetPath,
      error_message: result.errorMessage,
      deployed_at: result.deployedAt,
    }), statusCode);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return c.json(error('DEPLOY_ERROR', message, 500), 500);
  }
});

router.get('/:deploy_id', async (c) => {
  try {
    const deployId = c.req.param('deploy_id');
    const records = await db.select().from(deployments).where(eq(deployments.id, deployId));

    if (records.length === 0) {
      return c.json(error('NOT_FOUND', 'Deployment not found', 404), 404);
    }

    const d = records[0];
    return c.json(success({
      deploy_id: d.id,
      file_id: d.fileId,
      tool_id: d.toolId,
      mode: d.mode,
      target_path: d.targetPath,
      status: d.status,
      error_message: d.errorMessage,
      created_at: d.createdAt,
      updated_at: d.updatedAt,
    }));
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return c.json(error('DEPLOY_GET_ERROR', message, 500), 500);
  }
});

router.get('/', async (c) => {
  try {
    const fileId = c.req.query('file_id');
    const toolId = c.req.query('tool_id');
    const status = c.req.query('status');

    const conditions: SQL[] = [];

    if (fileId) conditions.push(eq(deployments.fileId, fileId));
    if (toolId) conditions.push(eq(deployments.toolId, toolId));
    if (status) conditions.push(eq(deployments.status, status));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const records = await db.select()
      .from(deployments)
      .where(whereClause)
      .orderBy(desc(deployments.createdAt));

    const data = records.map(d => ({
      deploy_id: d.id,
      file_id: d.fileId,
      tool_id: d.toolId,
      mode: d.mode,
      target_path: d.targetPath,
      status: d.status,
      error_message: d.errorMessage,
      created_at: d.createdAt,
      updated_at: d.updatedAt,
    }));

    return c.json(success(data));
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return c.json(error('DEPLOYMENT_LIST_ERROR', message, 500), 500);
  }
});

export default router;
