/**
 * Webhook 通知 + 审计日志工具
 * 在 Prompt 变更时触发 Webhook，并记录审计日志
 */

import { eq, and } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { webhooks, auditLogs } from '@/lib/db/schema';
import { nanoid } from 'nanoid';

type WebhookEvent = 'prompt.created' | 'prompt.updated' | 'prompt.deleted';

interface WebhookPayload {
  event: WebhookEvent;
  project_id: string;
  prompt_id: string;
  version?: number;
  timestamp: string;
}

/**
 * 触发项目的 Webhook 通知（fire-and-forget，不阻塞主请求）
 */
export async function triggerWebhooks(
  projectId: string,
  event: WebhookEvent,
  promptId: string,
  version?: number,
): Promise<void> {
  try {
    const db = getDb();
    const hooks = await db.select().from(webhooks)
      .where(and(eq(webhooks.projectId, projectId), eq(webhooks.status, 'active')));

    if (hooks.length === 0) return;

    const payload: WebhookPayload = {
      event,
      project_id: projectId,
      prompt_id: promptId,
      version,
      timestamp: new Date().toISOString(),
    };

    // Fire all webhooks in parallel (non-blocking)
    for (const hook of hooks) {
      const events: string[] = JSON.parse(hook.events);
      if (!events.includes(event)) continue;

      // Fire and forget — don't await in production
      fetch(hook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).then(async (res) => {
        // Update webhook status
        await db.update(webhooks).set({
          lastTriggeredAt: new Date().toISOString(),
          lastResponseStatus: res.status,
          failureCount: res.ok ? 0 : (hook.failureCount ?? 0) + 1,
          updatedAt: new Date().toISOString(),
        }).where(eq(webhooks.id, hook.id));
      }).catch(async () => {
        // Network error — increment failure count
        await db.update(webhooks).set({
          failureCount: (hook.failureCount ?? 0) + 1,
          updatedAt: new Date().toISOString(),
        }).where(eq(webhooks.id, hook.id));
      });
    }
  } catch {
    // Webhook failures should never break the main request
  }
}

/**
 * 记录审计日志
 */
export async function logAudit(
  projectId: string | null,
  apiKeyId: string | null,
  action: string,
  resourceType?: string,
  resourceId?: string,
  method?: string,
  path?: string,
  statusCode?: number,
): Promise<void> {
  try {
    const db = getDb();
    await db.insert(auditLogs).values({
      id: nanoid(12),
      projectId: projectId ?? null,
      apiKeyId: apiKeyId ?? null,
      action,
      resourceType: resourceType ?? null,
      resourceId: resourceId ?? null,
      method: method ?? null,
      path: path ?? null,
      statusCode: statusCode ?? null,
      createdAt: new Date().toISOString(),
    });
  } catch {
    // Audit log failures should never break the main request
  }
}
