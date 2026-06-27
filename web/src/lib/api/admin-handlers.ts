/**
 * /api/admin/* 管理端点处理器
 * 需要管理员 Token 认证
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq, and, desc } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { projects, files, apiKeys, webhooks, auditLogs } from '@/lib/db/schema';
import { success, error, now } from '@/lib/api/types';
import { generateApiKey } from '@/lib/api/auth';
import { nanoid } from 'nanoid';

// ─── Projects ────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/projects — List all projects
 */
export async function handleAdminProjectsList(): Promise<NextResponse> {
  const db = getDb();
  const rows = await db.select().from(projects);
  return NextResponse.json(success(rows));
}

/**
 * POST /api/admin/projects — Create project + auto-generate API Key
 */
export async function handleAdminProjectsCreate(request: NextRequest): Promise<NextResponse> {
  const db = getDb();
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  if (!body.name) {
    return NextResponse.json(error('VALIDATION_ERROR', 'name is required', 422), { status: 422 });
  }

  const projectId = `proj_${nanoid(10)}`;
  const timestamp = now();
  const projectPath = (body.path as string) || `/projects/${projectId}`;

  // Create project
  await db.insert(projects).values({
    id: projectId,
    name: body.name as string,
    path: projectPath,
    description: (body.description as string) || null,
    isDefault: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  // Auto-generate API Key for this project
  const { fullKey, keyHash, keyPrefix } = generateApiKey(projectId);
  const keyId = `key_${nanoid(10)}`;

  await db.insert(apiKeys).values({
    id: keyId,
    projectId,
    keyHash,
    keyPrefix,
    name: 'Default Key',
    status: 'active',
    rateLimit: 100,
    createdAt: timestamp,
  });

  // Audit log
  await db.insert(auditLogs).values({
    id: nanoid(12),
    projectId,
    action: 'admin.project.create',
    resourceType: 'project',
    resourceId: projectId,
    method: 'POST',
    path: '/api/admin/projects',
    statusCode: 201,
    createdAt: timestamp,
  });

  return NextResponse.json(success({
    id: projectId,
    name: body.name,
    path: projectPath,
    description: body.description || null,
    is_default: false,
    created_at: timestamp,
    api_key: fullKey, // Only shown once!
  }), { status: 201 });
}

/**
 * GET /api/admin/projects/:id — Get project detail
 */
export async function handleAdminProjectsGet(projectId: string): Promise<NextResponse> {
  const db = getDb();
  const rows = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (rows.length === 0) {
    return NextResponse.json(error('NOT_FOUND', 'Project not found', 404), { status: 404 });
  }
  return NextResponse.json(success(rows[0]));
}

/**
 * PUT /api/admin/projects/:id — Update project
 */
export async function handleAdminProjectsUpdate(request: NextRequest, projectId: string): Promise<NextResponse> {
  const db = getDb();
  const rows = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (rows.length === 0) {
    return NextResponse.json(error('NOT_FOUND', 'Project not found', 404), { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const updates: Record<string, unknown> = { updatedAt: now() };
  if (body.name !== undefined) updates.name = body.name;
  if (body.description !== undefined) updates.description = body.description;

  await db.update(projects).set(updates).where(eq(projects.id, projectId));

  return NextResponse.json(success({ id: projectId, updated_at: updates.updatedAt }));
}

/**
 * DELETE /api/admin/projects/:id — Delete project (with dependency check)
 */
export async function handleAdminProjectsDelete(projectId: string): Promise<NextResponse> {
  const db = getDb();

  // Check for dependencies
  const fileCount = await db.select({ count: files.id }).from(files).where(eq(files.projectId, projectId)).limit(1);
  if (fileCount.length > 0 && fileCount[0]) {
    return NextResponse.json(
      error('HAS_DEPENDENCIES', 'Cannot delete project with associated prompts. Delete prompts first.', 400),
      { status: 400 },
    );
  }

  await db.delete(projects).where(eq(projects.id, projectId));

  return NextResponse.json(success({ id: projectId, deleted: true }));
}

// ─── API Keys ────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/api-keys — List all API keys
 */
export async function handleAdminApiKeysList(): Promise<NextResponse> {
  const db = getDb();
  const rows = await db.select({
    id: apiKeys.id,
    project_id: apiKeys.projectId,
    key_prefix: apiKeys.keyPrefix,
    name: apiKeys.name,
    status: apiKeys.status,
    rate_limit: apiKeys.rateLimit,
    created_at: apiKeys.createdAt,
    last_used_at: apiKeys.lastUsedAt,
    revoked_at: apiKeys.revokedAt,
  }).from(apiKeys).orderBy(desc(apiKeys.createdAt));

  return NextResponse.json(success(rows));
}

/**
 * POST /api/admin/api-keys — Generate new API key for a project
 */
export async function handleAdminApiKeysCreate(request: NextRequest): Promise<NextResponse> {
  const db = getDb();
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  if (!body.project_id) {
    return NextResponse.json(error('VALIDATION_ERROR', 'project_id is required', 422), { status: 422 });
  }

  // Verify project exists
  const projectRows = await db.select().from(projects).where(eq(projects.id, body.project_id as string)).limit(1);
  if (projectRows.length === 0) {
    return NextResponse.json(error('NOT_FOUND', 'Project not found', 404), { status: 404 });
  }

  const { fullKey, keyHash, keyPrefix } = generateApiKey(body.project_id as string);
  const keyId = `key_${nanoid(10)}`;
  const timestamp = now();

  await db.insert(apiKeys).values({
    id: keyId,
    projectId: body.project_id as string,
    keyHash,
    keyPrefix,
    name: (body.name as string) || 'Additional Key',
    status: 'active',
    rateLimit: (body.rate_limit as number) || 100,
    createdAt: timestamp,
  });

  return NextResponse.json(success({
    id: keyId,
    project_id: body.project_id,
    key_prefix: keyPrefix,
    name: body.name || 'Additional Key',
    status: 'active',
    rate_limit: (body.rate_limit as number) || 100,
    created_at: timestamp,
    api_key: fullKey, // Only shown once!
  }), { status: 201 });
}

/**
 * DELETE /api/admin/api-keys/:id — Revoke API key
 */
export async function handleAdminApiKeysDelete(keyId: string): Promise<NextResponse> {
  const db = getDb();
  const timestamp = now();

  await db.update(apiKeys).set({
    status: 'revoked',
    revokedAt: timestamp,
  }).where(eq(apiKeys.id, keyId));

  return NextResponse.json(success({ id: keyId, status: 'revoked', revoked_at: timestamp }));
}

// ─── Webhooks ────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/webhooks — List all webhooks
 */
export async function handleAdminWebhooksList(): Promise<NextResponse> {
  const db = getDb();
  const rows = await db.select().from(webhooks).orderBy(desc(webhooks.createdAt));
  return NextResponse.json(success(rows));
}

/**
 * POST /api/admin/webhooks — Create webhook
 */
export async function handleAdminWebhooksCreate(request: NextRequest): Promise<NextResponse> {
  const db = getDb();
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  if (!body.project_id || !body.url || !body.events) {
    return NextResponse.json(error('VALIDATION_ERROR', 'project_id, url, and events are required', 422), { status: 422 });
  }

  const id = `wh_${nanoid(10)}`;
  const timestamp = now();

  await db.insert(webhooks).values({
    id,
    projectId: body.project_id as string,
    url: body.url as string,
    events: JSON.stringify(body.events),
    secret: (body.secret as string) || null,
    status: 'active',
    failureCount: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  return NextResponse.json(success({
    id,
    project_id: body.project_id,
    url: body.url,
    events: body.events,
    status: 'active',
    created_at: timestamp,
  }), { status: 201 });
}

// ─── Audit Logs ──────────────────────────────────────────────────────────────

/**
 * GET /api/admin/audit-logs — Query audit logs
 */
export async function handleAdminAuditLogsList(request: NextRequest): Promise<NextResponse> {
  const db = getDb();
  const url = request.nextUrl;
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('page_size') || '20')));
  const projectId = url.searchParams.get('project_id');
  const actionFilter = url.searchParams.get('action');

  const conditions = [];
  if (projectId) conditions.push(eq(auditLogs.projectId, projectId));
  if (actionFilter) conditions.push(eq(auditLogs.action, actionFilter));

  const baseQuery = conditions.length > 0
    ? db.select().from(auditLogs).where(and(...conditions))
    : db.select().from(auditLogs);

  const rows = await baseQuery
    .orderBy(desc(auditLogs.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return NextResponse.json(success(rows, { page, page_size: pageSize, total: rows.length }));
}
