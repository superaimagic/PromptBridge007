import { Hono } from 'hono';
import { syncEngine } from '@/lib/core/SyncEngine';
import { watchEngine } from '@/lib/core/WatchEngine';
import { success, error } from '../types';

const router = new Hono();

router.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { direction, tool_id, sync_all } = body as {
      direction: 'to_tool' | 'from_tool';
      tool_id?: string;
      sync_all?: boolean;
    };

    if (!direction) {
      return c.json(error('INVALID_INPUT', 'direction is required', 400), 400);
    }

    if (direction !== 'to_tool' && direction !== 'from_tool') {
      return c.json(error('INVALID_INPUT', 'direction must be "to_tool" or "from_tool"', 400), 400);
    }

    // 使用真实同步引擎
    if (sync_all) {
      const results = await syncEngine.syncAll(direction);
      return c.json(success({
        direction,
        results: results.map(r => ({
          tool_id: r.toolId,
          tool_name: r.toolName,
          status: r.status,
          files_synced: r.filesSynced,
          conflicts: r.conflicts,
          errors: r.errors,
        })),
      }));
    }

    if (!tool_id) {
      return c.json(error('INVALID_INPUT', 'tool_id is required when sync_all is not set', 400), 400);
    }

    const result = await syncEngine.sync(tool_id, direction);
    return c.json(success({
      direction,
      tool_id: result.toolId,
      tool_name: result.toolName,
      status: result.status,
      files_synced: result.filesSynced,
      conflicts: result.conflicts,
      errors: result.errors,
    }));
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return c.json(error('SYNC_ERROR', message, 500), 500);
  }
});

router.get('/statuses', async (c) => {
  try {
    const statuses = await syncEngine.getSyncStatuses();
    return c.json(success(statuses.map(s => ({
      tool_id: s.toolId,
      tool_name: s.toolName,
      status: s.status,
      last_sync_at: s.lastSyncAt,
      deployed_files: s.deployedFiles,
      pending_changes: s.pendingChanges,
    }))));
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return c.json(error('SYNC_STATUS_ERROR', message, 500), 500);
  }
});

// ─── Watch Endpoints ─────────────────────────────────────────────────────────

router.post('/watch/start', async (c) => {
  try {
    await watchEngine.start();
    const status = watchEngine.getStatus();
    return c.json(success({
      running: status.running,
      watched_directories: status.watchedDirectories,
      tracked_files: status.trackedFiles,
    }));
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return c.json(error('WATCH_START_ERROR', message, 500), 500);
  }
});

router.post('/watch/stop', async (c) => {
  try {
    watchEngine.stop();
    return c.json(success({
      running: false,
      watched_directories: 0,
      tracked_files: 0,
    }));
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return c.json(error('WATCH_STOP_ERROR', message, 500), 500);
  }
});

router.get('/watch/status', async (c) => {
  try {
    const status = watchEngine.getStatus();
    return c.json(success(status));
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return c.json(error('WATCH_STATUS_ERROR', message, 500), 500);
  }
});

export default router;
