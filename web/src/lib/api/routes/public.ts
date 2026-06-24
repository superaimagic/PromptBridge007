import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '@/lib/db';
import { publicSources } from '@/lib/db/schema';
import { publicSyncEngine } from '@/lib/core/PublicSyncEngine';
import { success, error, now, validateInput } from '../types';

const router = new Hono();

router.get('/', async (c) => {
  try {
    const records = await db.select().from(publicSources).where(eq(publicSources.isActive, true));

    const data = records.map(s => ({
      id: s.id,
      name: s.name,
      repo_url: s.repoUrl,
      repo_license: s.repoLicense,
      description: s.description,
      local_path: s.localPath,
      last_sync_at: s.lastSyncAt,
      last_commit_hash: s.lastCommitHash,
      is_active: s.isActive,
      created_at: s.createdAt,
      updated_at: s.updatedAt,
    }));

    return c.json(success(data));
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return c.json(error('PUBLIC_SOURCES_ERROR', message, 500), 500);
  }
});

// Create a new public source
router.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { name, repo_url, repo_license, description } = body;

    if (!name || !repo_url) {
      return c.json(error('INVALID_INPUT', 'name and repo_url are required', 400), 400);
    }

    const validationError = validateInput({ name });
    if (validationError) {
      return c.json(error('INVALID_INPUT', validationError, 400), 400);
    }

    const id = nanoid(12);
    const timestamp = now();

    await db.insert(publicSources).values({
      id,
      name,
      repoUrl: repo_url,
      repoLicense: repo_license || null,
      description: description || null,
      localPath: null,
      lastSyncAt: null,
      lastCommitHash: null,
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    return c.json(success({
      id,
      name,
      repo_url,
      repo_license: repo_license || null,
      description: description || null,
    }), 201);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return c.json(error('PUBLIC_SOURCE_CREATE_ERROR', message, 500), 500);
  }
});

router.post('/:source_id/sync', async (c) => {
  try {
    const sourceId = c.req.param('source_id');
    const records = await db.select().from(publicSources).where(eq(publicSources.id, sourceId));

    if (records.length === 0) {
      return c.json(error('NOT_FOUND', 'Public source not found', 404), 404);
    }

    // Use PublicSyncEngine for real sync
    const result = await publicSyncEngine.syncSource(sourceId);

    return c.json(success({
      source_id: result.sourceId,
      source_name: result.sourceName,
      status: result.status,
      files_found: result.filesFound,
      files_imported: result.filesImported,
      files_updated: result.filesUpdated,
      files_skipped: result.filesSkipped,
      errors: result.errors,
    }));
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return c.json(error('PUBLIC_SOURCE_SYNC_ERROR', message, 500), 500);
  }
});

export default router;
