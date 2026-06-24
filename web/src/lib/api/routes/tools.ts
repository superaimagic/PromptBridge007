import { Hono } from 'hono';
import { db } from '@/lib/db';
import { tools } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { success, error } from '../types';

const router = new Hono();

router.get('/', async (c) => {
  try {
    const records = await db.select().from(tools).where(eq(tools.isActive, true));

    const data = records.map(t => ({
      id: t.id,
      name: t.name,
      display_name: t.displayName,
      category: t.category,
      detect_commands: t.detectCommands ? JSON.parse(t.detectCommands) : [],
      prompt_paths: t.promptPaths ? JSON.parse(t.promptPaths) : [],
      format_spec: t.formatSpec ? JSON.parse(t.formatSpec) : null,
      deploy_config: t.deployConfig ? JSON.parse(t.deployConfig) : null,
      is_active: t.isActive,
      created_at: t.createdAt,
      updated_at: t.updatedAt,
    }));

    return c.json(success(data));
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return c.json(error('TOOLS_ERROR', message, 500), 500);
  }
});

export default router;
