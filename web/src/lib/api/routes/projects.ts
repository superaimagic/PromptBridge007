import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { getDb } from '@/lib/db';
import { projects, files, deployments } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { success, error, now, sanitizeInput, validateInput } from '../types';

const router = new Hono();

router.get('/', async (c) => {
  try {
    const rows = await getDb().select().from(projects);
    return c.json(success(rows));
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return c.json(error('PROJECT_LIST_ERROR', message, 500), 500);
  }
});

router.post('/', async (c) => {
  try {
    const body = sanitizeInput(await c.req.json());
    const validation = validateInput(body);
    if (validation) return c.json(error('INVALID_INPUT', validation, 400), 400);

    if (!body.name || !body.path) {
      return c.json(error('INVALID_INPUT', 'name and path are required', 400), 400);
    }

    const id = nanoid(12);
    const timestamp = now();

    await getDb().insert(projects).values({
      id,
      name: body.name,
      path: body.path,
      description: body.description || null,
      isDefault: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    return c.json(success({ id, name: body.name, path: body.path }), 201);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return c.json(error('PROJECT_CREATE_ERROR', message, 500), 500);
  }
});

router.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const rows = await getDb().select().from(projects).where(eq(projects.id, id)).limit(1);
    if (rows.length === 0) return c.json(error('NOT_FOUND', 'Project not found', 404), 404);
    return c.json(success(rows[0]));
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return c.json(error('PROJECT_GET_ERROR', message, 500), 500);
  }
});

router.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');

    // Check for associated files
    const relatedFiles = await getDb().select({ id: files.id }).from(files).where(eq(files.projectId, id)).limit(1);
    if (relatedFiles.length > 0) {
      return c.json(error('HAS_DEPENDENCIES', 'Cannot delete project with associated files. Remove files first.', 400), 400);
    }

    // Check for associated deployments
    const relatedDeployments = await getDb().select({ id: deployments.id }).from(deployments).where(eq(deployments.projectId, id)).limit(1);
    if (relatedDeployments.length > 0) {
      return c.json(error('HAS_DEPENDENCIES', 'Cannot delete project with associated deployments. Remove deployments first.', 400), 400);
    }

    await getDb().delete(projects).where(eq(projects.id, id));
    return c.json(success({ deleted: true }));
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return c.json(error('PROJECT_DELETE_ERROR', message, 500), 500);
  }
});

export default router;
