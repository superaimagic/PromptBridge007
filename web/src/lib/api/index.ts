import { Hono } from 'hono';
import { ensureInitialized } from '@/lib/db';
import { success, error } from './types';

// Route modules
import projectsRoutes from './routes/projects';
import filesRoutes from './routes/files';
import toolsRoutes from './routes/tools';
import scanRoutes from './routes/scan';
import deployRoutes from './routes/deploy';
import syncRoutes from './routes/sync';
import convertRoutes from './routes/convert';
import publicRoutes from './routes/public';
import mcpRoutes from './routes/mcp';

const app = new Hono().basePath('/api');

// ─── Middleware: Auto-initialize database on first request ──────────────────────

app.use('*', async (_c, next) => {
  await ensureInitialized();
  await next();
});

// ─── Database Init API ────────────────────────────────────────────────────────

app.post('/init', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    if (body.force) {
      const { dropAllTables, initAndSeed: reinit } = await import('@/lib/db/init');
      await dropAllTables();
      await reinit();
    } else {
      await ensureInitialized();
    }
    return c.json(success({
      initialized: true,
      message: 'Database initialized successfully',
    }));
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return c.json(error('INIT_ERROR', message, 500), 500);
  }
});

// ─── Mount Routes ─────────────────────────────────────────────────────────────

app.route('/projects', projectsRoutes);
app.route('/files', filesRoutes);
app.route('/tools', toolsRoutes);
app.route('/scan', scanRoutes);
app.route('/deploy', deployRoutes);
app.route('/sync', syncRoutes);
app.route('/convert', convertRoutes);
app.route('/public-sources', publicRoutes);
app.route('/mcp', mcpRoutes);

export default app;
