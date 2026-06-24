import { Hono } from 'hono';
import { db } from '@/lib/db';
import { scanHistory, deployments } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { scanEngine } from '@/lib/core/ScanEngine';
import { success, error } from '../types';

const router = new Hono();

router.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const toolIds: string[] | undefined = body.tool_ids;
    const scanType: string = body.scan_type || 'full';
    const projectId: string | undefined = body.project_id;

    if (scanType !== 'full' && scanType !== 'incremental') {
      return c.json(error('INVALID_INPUT', 'scan_type must be "full" or "incremental"', 400), 400);
    }

    // For incremental scan, only scan tools that have been previously detected (have deployments)
    let effectiveToolIds = toolIds;
    if (scanType === 'incremental' && !toolIds) {
      const deploymentRows = await db.select({ toolId: deployments.toolId })
        .from(deployments)
        .groupBy(deployments.toolId);
      effectiveToolIds = deploymentRows.map(r => r.toolId);
      if (effectiveToolIds.length === 0) {
        return c.json(success({
          scan_id: null,
          status: 'completed',
          scan_type: scanType,
          total_tools: 0,
          detected_tools: 0,
          files_found: 0,
          files_imported: 0,
          files_updated: 0,
          files_skipped: 0,
          results: [],
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        }), 201);
      }
    }

    // 使用真实扫描引擎
    const envResult = await scanEngine.scanEnvironment(effectiveToolIds, projectId);

    // 如果指定了 tool_ids，返回每个工具的扫描结果
    if (toolIds && toolIds.length > 0) {
      const scanResults = envResult.results.map(r => ({
        scan_id: envResult.scanId,
        tool_id: r.toolId,
        tool_name: r.toolName,
        status: r.detected ? 'completed' : 'not_found',
        files_found: r.filesFound,
        files_imported: r.filesImported,
        files_updated: r.filesUpdated,
        files_skipped: r.filesSkipped,
        errors: r.errors,
        started_at: envResult.startedAt,
        completed_at: envResult.completedAt,
      }));
      return c.json(success({ scans: scanResults }), 201);
    }

    // 全量扫描
    return c.json(success({
      scan_id: envResult.scanId,
      status: envResult.status,
      scan_type: scanType,
      total_tools: envResult.totalTools,
      detected_tools: envResult.detectedTools,
      files_found: envResult.results.reduce((sum, r) => sum + r.filesFound, 0),
      files_imported: envResult.results.reduce((sum, r) => sum + r.filesImported, 0),
      files_updated: envResult.results.reduce((sum, r) => sum + r.filesUpdated, 0),
      files_skipped: envResult.results.reduce((sum, r) => sum + r.filesSkipped, 0),
      results: envResult.results.map(r => ({
        tool_id: r.toolId,
        tool_name: r.toolName,
        detected: r.detected,
        files_found: r.filesFound,
        files_imported: r.filesImported,
        files_updated: r.filesUpdated,
        files_skipped: r.filesSkipped,
        errors: r.errors,
      })),
      started_at: envResult.startedAt,
      completed_at: envResult.completedAt,
    }), 201);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return c.json(error('SCAN_ERROR', message, 500), 500);
  }
});

router.get('/:scan_id', async (c) => {
  try {
    const scanId = c.req.param('scan_id');
    const records = await db.select().from(scanHistory).where(eq(scanHistory.id, scanId));

    if (records.length === 0) {
      return c.json(error('NOT_FOUND', 'Scan not found', 404), 404);
    }

    const r = records[0];
    return c.json(success({
      scan_id: r.id,
      status: r.status,
      tool_id: r.toolId,
      scan_type: r.scanType,
      files_found: r.filesFound,
      files_imported: r.filesImported,
      files_updated: r.filesUpdated,
      files_skipped: r.filesSkipped,
      started_at: r.startedAt,
      completed_at: r.completedAt,
      error_message: r.errorMessage,
    }));
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return c.json(error('SCAN_ERROR', message, 500), 500);
  }
});

export default router;
