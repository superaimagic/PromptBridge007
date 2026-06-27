/**
 * /api/v1/* 路由处理器
 * 所有端点需要 API Key 认证，自动按项目隔离数据
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq, and, like, desc, asc, sql, inArray, isNull, or, ne } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import {
  files,
  tags,
  fileVersions,
  deployments,
} from '@/lib/db/schema';
import { success, error, now, sanitizeInput, validateInput, generateSlug, computeContentHash } from '@/lib/api/types';
import {
  type AuthContext,
} from '@/lib/api/auth';
import { triggerWebhooks, logAudit } from '@/lib/api/webhook-audit';
import { formatMatrix, type PIFEntity } from '@/lib/core/FormatMatrix';
import { toolRegistry } from '@/lib/core/ToolRegistry';
import { nanoid } from 'nanoid';

// ─── Helper: format tags ─────────────────────────────────────────────────────

function formatTagsForFile(fileTags: { dimension: string; value: string; confidence: string | null }[]) {
  const result: Record<string, unknown> = {};
  for (const t of fileTags) {
    if (t.dimension === 'tool') {
      if (!result.tool) result.tool = [];
      (result.tool as Array<{ value: string; confidence: string | null }>).push({
        value: t.value,
        confidence: t.confidence,
      });
    } else {
      result[t.dimension] = t.value;
    }
  }
  return result;
}

function buildTagValues(
  inputTags: Record<string, unknown>,
  fileId: string,
  timestamp: string,
) {
  const tagValues: Array<{ id: string; fileId: string; dimension: string; value: string; confidence: string | null; createdAt: string }> = [];

  for (const [dimension, value] of Object.entries(inputTags)) {
    if (dimension === 'tool' && Array.isArray(value)) {
      for (const toolEntry of value) {
        if (typeof toolEntry === 'object' && toolEntry !== null && 'value' in toolEntry) {
          tagValues.push({
            id: nanoid(12), fileId, dimension: 'tool',
            value: String(toolEntry.value),
            confidence: toolEntry.confidence ? String(toolEntry.confidence) : null,
            createdAt: timestamp,
          });
        }
      }
    } else if (Array.isArray(value)) {
      for (const v of value) {
        tagValues.push({ id: nanoid(12), fileId, dimension, value: String(v), confidence: null, createdAt: timestamp });
      }
    } else if (value !== undefined && value !== null) {
      tagValues.push({ id: nanoid(12), fileId, dimension, value: String(value), confidence: null, createdAt: timestamp });
    }
  }
  return tagValues;
}

// ─── V1 Route Handlers ───────────────────────────────────────────────────────

/**
 * GET /api/v1/prompts — List prompts in current project
 */
export async function handleV1PromptsList(request: NextRequest, auth: AuthContext): Promise<NextResponse> {
  const db = getDb();
  const url = request.nextUrl;
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('page_size') || '20')));
  const offset = (page - 1) * pageSize;

  const conditions = [eq(files.projectId, auth.projectId), isNull(files.deletedAt)];

  // Filters
  const library = url.searchParams.get('library');
  const search = url.searchParams.get('search');
  const toolFilter = url.searchParams.get('tool');
  const roleFilter = url.searchParams.get('role');
  const domainFilter = url.searchParams.get('domain');
  const languageFilter = url.searchParams.get('language');
  const qualityFilter = url.searchParams.get('quality');
  const sourceTypeFilter = url.searchParams.get('source_type');
  const sortField = url.searchParams.get('sort') || 'created_at';
  const sortOrder = url.searchParams.get('order') || 'desc';

  if (library === 'public') conditions.push(eq(files.sourceType, 'public'));
  if (library === 'private') conditions.push(ne(files.sourceType, 'public'));
  if (search) conditions.push(like(files.name, `%${search}%`));
  if (sourceTypeFilter) conditions.push(eq(files.sourceType, sourceTypeFilter));

  // Build query
  const sortColumn = sortField === 'updated_at' ? files.updatedAt
    : sortField === 'install_count' ? files.installCount
    : sortField === 'rating' ? files.rating
    : files.createdAt;
  const orderFunc = sortOrder === 'asc' ? asc : desc;

  const rows = await db.select({
    id: files.id,
    slug: files.slug,
    name: files.name,
    format: files.format,
    license: files.license,
    version: files.version,
    installCount: files.installCount,
    rating: files.rating,
    createdAt: files.createdAt,
    updatedAt: files.updatedAt,
    sourceType: files.sourceType,
  }).from(files).where(and(...conditions))
    .orderBy(orderFunc(sortColumn))
    .limit(pageSize)
    .offset(offset);

  // Get total count
  const countResult = await db.select({ count: sql<number>`count(*)` }).from(files).where(and(...conditions));
  const total = countResult[0]?.count ?? 0;

  // Get tags for each file (filter by tool/role/domain/language/quality if specified)
  const fileIds = rows.map(r => r.id);
  const fileTagsMap: Record<string, { dimension: string; value: string; confidence: string | null }[]> = {};

  if (fileIds.length > 0) {
    const allTags = await db.select().from(tags).where(inArray(tags.fileId, fileIds));
    for (const t of allTags) {
      if (!fileTagsMap[t.fileId]) fileTagsMap[t.fileId] = [];
      fileTagsMap[t.fileId].push({ dimension: t.dimension, value: t.value, confidence: t.confidence });
    }
  }

  // Apply tag-based filters
  let filteredRows = rows;
  if (toolFilter || roleFilter || domainFilter || languageFilter || qualityFilter) {
    filteredRows = rows.filter(row => {
      const fileTags = fileTagsMap[row.id] || [];
      const tagMap: Record<string, string[]> = {};
      for (const t of fileTags) {
        if (!tagMap[t.dimension]) tagMap[t.dimension] = [];
        tagMap[t.dimension].push(t.value);
      }
      if (toolFilter && !(tagMap.tool || []).includes(toolFilter)) return false;
      if (roleFilter && !(tagMap.role || []).includes(roleFilter)) return false;
      if (domainFilter && !(tagMap.domain || []).includes(domainFilter)) return false;
      if (languageFilter && !(tagMap.language || []).includes(languageFilter)) return false;
      if (qualityFilter && !(tagMap.quality || []).includes(qualityFilter)) return false;
      return true;
    });
  }

  const data = filteredRows.map(row => ({
    ...row,
    tags: formatTagsForFile(fileTagsMap[row.id] || []),
  }));

  return NextResponse.json(success(data, { page, page_size: pageSize, total }));
}

/**
 * POST /api/v1/prompts — Create prompt in current project
 */
export async function handleV1PromptsCreate(request: NextRequest, auth: AuthContext): Promise<NextResponse> {
  const db = getDb();
  const body = sanitizeInput((await request.json().catch(() => ({}))) as Record<string, unknown>);
  const validation = validateInput(body);
  if (validation) return NextResponse.json(error('VALIDATION_ERROR', validation, 422), { status: 422 });

  if (!body.name || !body.content || !body.format) {
    return NextResponse.json(error('VALIDATION_ERROR', 'name, content, and format are required', 422), { status: 422 });
  }

  const id = nanoid(12);
  const slug = generateSlug(body.name as string);
  const contentHash = computeContentHash(body.content as string);
  const timestamp = now();

  await db.insert(files).values({
    id,
    slug,
    name: body.name as string,
    content: body.content as string,
    contentHash,
    format: body.format as string,
    projectId: auth.projectId, // 🔒 Bind to current project
    sourceType: 'private',
    license: (body.license as string) || 'MIT',
    version: 1,
    installCount: 0,
    rating: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  // Insert tags if provided
  if (body.tags && typeof body.tags === 'object') {
    const tagValues = buildTagValues(body.tags as Record<string, unknown>, id, timestamp);
    if (tagValues.length > 0) {
      await db.insert(tags).values(tagValues);
    }
  }

  // Save initial version
  await db.insert(fileVersions).values({
    id: nanoid(12),
    fileId: id,
    version: 1,
    content: body.content as string,
    contentHash,
    createdAt: timestamp,
  });

  // Trigger webhook + audit log
  triggerWebhooks(auth.projectId, 'prompt.created', id, 1);
  logAudit(auth.projectId, auth.apiKeyId, 'prompt.create', 'file', id, 'POST', '/api/v1/prompts', 201);

  return NextResponse.json(success({
    id, slug, name: body.name, content_hash: contentHash, version: 1, created_at: timestamp,
  }), { status: 201 });
}

/**
 * GET /api/v1/prompts/:id — Get prompt detail (with project ownership check)
 */
export async function handleV1PromptsDetail(request: NextRequest, auth: AuthContext, fileId: string): Promise<NextResponse> {
  const db = getDb();

  // 🔒 Project isolation: only return files belonging to current project
  const fileRows = await db.select().from(files).where(and(eq(files.id, fileId), eq(files.projectId, auth.projectId))).limit(1);

  if (fileRows.length === 0) {
    return NextResponse.json(error('NOT_FOUND', 'Prompt not found', 404), { status: 404 });
  }

  const file = fileRows[0];
  const fileTags = await db.select().from(tags).where(eq(tags.fileId, fileId));
  const fileDeployments = await db.select().from(deployments).where(eq(deployments.fileId, fileId));

  const tagMap = formatTagsForFile(fileTags.map(t => ({ dimension: t.dimension, value: t.value, confidence: t.confidence })));

  return NextResponse.json(success({
    id: file.id,
    slug: file.slug,
    name: file.name,
    content: file.content,
    content_hash: file.contentHash,
    format: file.format,
    project_id: file.projectId,
    source_type: file.sourceType,
    repo_name: file.repoName,
    repo_url: file.repoUrl,
    repo_license: file.repoLicense,
    license: file.license,
    license_url: file.licenseUrl,
    version: file.version,
    tags: tagMap,
    deployments: fileDeployments.map(d => ({
      tool_id: d.toolId,
      mode: d.mode,
      status: d.status,
      target_path: d.targetPath,
      deployed_at: d.createdAt,
    })),
    created_at: file.createdAt,
    updated_at: file.updatedAt,
  }));
}

/**
 * PUT /api/v1/prompts/:id — Update prompt (with project ownership check)
 */
export async function handleV1PromptsUpdate(request: NextRequest, auth: AuthContext, fileId: string): Promise<NextResponse> {
  const db = getDb();

  // 🔒 Project isolation
  const fileRows = await db.select().from(files).where(and(eq(files.id, fileId), eq(files.projectId, auth.projectId))).limit(1);
  if (fileRows.length === 0) {
    return NextResponse.json(error('NOT_FOUND', 'Prompt not found', 404), { status: 404 });
  }

  const file = fileRows[0];
  const body = sanitizeInput((await request.json().catch(() => ({}))) as Record<string, unknown>);
  const validation = validateInput(body);
  if (validation) return NextResponse.json(error('VALIDATION_ERROR', validation, 422), { status: 422 });

  const updates: Record<string, unknown> = {};
  let newVersion = file.version ?? 1;

  if (body.name !== undefined) updates.name = body.name;
  if (body.content !== undefined) {
    updates.content = body.content;
    updates.contentHash = computeContentHash(body.content as string);
    newVersion = (file.version ?? 1) + 1;
    updates.version = newVersion;

    // Save version history
    await db.insert(fileVersions).values({
      id: nanoid(12),
      fileId,
      version: newVersion,
      content: body.content as string,
      contentHash: updates.contentHash as string,
      createdAt: now(),
    });
  }

  updates.updatedAt = now();
  await db.update(files).set(updates).where(eq(files.id, fileId));

  // Update tags if provided
  if (body.tags && typeof body.tags === 'object') {
    await db.delete(tags).where(eq(tags.fileId, fileId));
    const tagValues = buildTagValues(body.tags as Record<string, unknown>, fileId, now());
    if (tagValues.length > 0) {
      await db.insert(tags).values(tagValues);
    }
  }

  // Trigger webhook + audit log
  triggerWebhooks(auth.projectId, 'prompt.updated', fileId, newVersion);
  logAudit(auth.projectId, auth.apiKeyId, 'prompt.update', 'file', fileId, 'PUT', `/api/v1/prompts/${fileId}`, 200);

  return NextResponse.json(success({
    id: fileId, updated_at: updates.updatedAt, version: newVersion,
  }));
}

/**
 * DELETE /api/v1/prompts/:id — Soft delete (with project ownership check)
 */
export async function handleV1PromptsDelete(request: NextRequest, auth: AuthContext, fileId: string): Promise<NextResponse> {
  const db = getDb();

  // 🔒 Project isolation
  const fileRows = await db.select().from(files).where(and(eq(files.id, fileId), eq(files.projectId, auth.projectId))).limit(1);
  if (fileRows.length === 0) {
    return NextResponse.json(error('NOT_FOUND', 'Prompt not found', 404), { status: 404 });
  }

  await db.update(files).set({ deletedAt: now(), updatedAt: now() }).where(eq(files.id, fileId));

  // Trigger webhook + audit log
  triggerWebhooks(auth.projectId, 'prompt.deleted', fileId);
  logAudit(auth.projectId, auth.apiKeyId, 'prompt.delete', 'file', fileId, 'DELETE', `/api/v1/prompts/${fileId}`, 200);

  return NextResponse.json(success({ id: fileId, deleted: true }));
}

/**
 * POST /api/v1/prompts/search — Search within current project
 */
export async function handleV1PromptsSearch(request: NextRequest, auth: AuthContext): Promise<NextResponse> {
  const db = getDb();
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const query = (body.query as string) || '';
  const tagFilters = (body.tags as Record<string, string>) || {};
  const page = Math.max(1, (body.page as number) || 1);
  const pageSize = Math.min(100, Math.max(1, (body.page_size as number) || 20));

  const conditions = [eq(files.projectId, auth.projectId), isNull(files.deletedAt)];
  if (query) {
    conditions.push(or(like(files.name, `%${query}%`), like(files.content, `%${query}%`))!);
  }

  const dbQuery = db.select({
    id: files.id, slug: files.slug, name: files.name, format: files.format,
    license: files.license, version: files.version, createdAt: files.createdAt, updatedAt: files.updatedAt,
  }).from(files).where(and(...conditions));

  const rows = await dbQuery.limit(pageSize).offset((page - 1) * pageSize);

  // Get tags for filtering
  const fileIds = rows.map(r => r.id);
  const fileTagsMap: Record<string, { dimension: string; value: string }[]> = {};
  if (fileIds.length > 0) {
    const allTags = await db.select().from(tags).where(inArray(tags.fileId, fileIds));
    for (const t of allTags) {
      if (!fileTagsMap[t.fileId]) fileTagsMap[t.fileId] = [];
      fileTagsMap[t.fileId].push({ dimension: t.dimension, value: t.value });
    }
  }

  // Apply tag filters
  const tagEntries = Object.entries(tagFilters);
  let filteredRows = rows;
  if (tagEntries.length > 0) {
    const mustAll = body.must_have_all_tags === true;
    filteredRows = rows.filter(row => {
      const fileTags = fileTagsMap[row.id] || [];
      const matches = tagEntries.filter(([dim, val]) =>
        fileTags.some(t => t.dimension === dim && t.value === val)
      ).length;
      return mustAll ? matches === tagEntries.length : matches > 0;
    });
  }

  const data = filteredRows.map(row => ({
    ...row,
    tags: formatTagsForFile((fileTagsMap[row.id] || []).map(t => ({ ...t, confidence: null }))),
  }));

  return NextResponse.json(success(data, { page, page_size: pageSize, total: filteredRows.length }));
}

/**
 * GET /api/v1/prompts/:id/versions — Version history
 */
export async function handleV1PromptsVersions(request: NextRequest, auth: AuthContext, fileId: string): Promise<NextResponse> {
  const db = getDb();

  // 🔒 Project isolation
  const fileRows = await db.select({ id: files.id }).from(files)
    .where(and(eq(files.id, fileId), eq(files.projectId, auth.projectId))).limit(1);
  if (fileRows.length === 0) {
    return NextResponse.json(error('NOT_FOUND', 'Prompt not found', 404), { status: 404 });
  }

  const versions = await db.select({
    version: fileVersions.version,
    contentHash: fileVersions.contentHash,
    createdAt: fileVersions.createdAt,
    content: fileVersions.content,
  }).from(fileVersions).where(eq(fileVersions.fileId, fileId)).orderBy(desc(fileVersions.version));

  const data = versions.map(v => ({
    version: v.version,
    content_hash: v.contentHash,
    created_at: v.createdAt,
    content_preview: v.content.substring(0, 200) + (v.content.length > 200 ? '...' : ''),
  }));

  return NextResponse.json(success(data));
}

/**
 * POST /api/v1/prompts/:id/rollback/:version — Rollback to specified version
 */
export async function handleV1PromptsRollback(request: NextRequest, auth: AuthContext, fileId: string, versionNum: string): Promise<NextResponse> {
  const db = getDb();

  // 🔒 Project isolation
  const fileRows = await db.select().from(files)
    .where(and(eq(files.id, fileId), eq(files.projectId, auth.projectId))).limit(1);
  if (fileRows.length === 0) {
    return NextResponse.json(error('NOT_FOUND', 'Prompt not found', 404), { status: 404 });
  }

  const targetVersion = parseInt(versionNum);
  const versionRows = await db.select().from(fileVersions)
    .where(and(eq(fileVersions.fileId, fileId), eq(fileVersions.version, targetVersion))).limit(1);

  if (versionRows.length === 0) {
    return NextResponse.json(error('NOT_FOUND', `Version ${targetVersion} not found`, 404), { status: 404 });
  }

  const file = fileRows[0];
  const versionData = versionRows[0];
  const newVersion = (file.version ?? 1) + 1;
  const timestamp = now();

  // Create new version with old content (not overwriting history)
  await db.insert(fileVersions).values({
    id: nanoid(12),
    fileId,
    version: newVersion,
    content: versionData.content,
    contentHash: versionData.contentHash,
    createdAt: timestamp,
  });

  // Update file to point to rolled-back content
  await db.update(files).set({
    content: versionData.content,
    contentHash: versionData.contentHash,
    version: newVersion,
    updatedAt: timestamp,
  }).where(eq(files.id, fileId));

  return NextResponse.json(success({
    id: fileId,
    version: newVersion,
    rolled_back_from: file.version,
    rolled_back_to: targetVersion,
    updated_at: timestamp,
  }));
}

/**
 * GET /api/v1/prompts/similar/:id — Similar prompts within project
 */
export async function handleV1PromptsSimilar(request: NextRequest, auth: AuthContext, fileId: string): Promise<NextResponse> {
  const db = getDb();

  // 🔒 Project isolation
  const fileRows = await db.select({ id: files.id }).from(files)
    .where(and(eq(files.id, fileId), eq(files.projectId, auth.projectId))).limit(1);
  if (fileRows.length === 0) {
    return NextResponse.json(error('NOT_FOUND', 'Prompt not found', 404), { status: 404 });
  }

  const limit = Math.min(20, parseInt(request.nextUrl.searchParams.get('limit') || '5'));

  // Get tags of the source file
  const sourceTags = await db.select().from(tags).where(eq(tags.fileId, fileId));
  if (sourceTags.length === 0) {
    return NextResponse.json(success([]));
  }

  // Find files with matching tags in the same project
  const tagDimensions = sourceTags.map(t => ({ dimension: t.dimension, value: t.value }));
  const allProjectFiles = await db.select({ id: files.id, name: files.name, slug: files.slug })
    .from(files).where(and(eq(files.projectId, auth.projectId), isNull(files.deletedAt), ne(files.id, fileId)));

  const allTags = await db.select().from(tags).where(inArray(tags.fileId, allProjectFiles.map(f => f.id)));
  const tagMap: Record<string, { dimension: string; value: string }[]> = {};
  for (const t of allTags) {
    if (!tagMap[t.fileId]) tagMap[t.fileId] = [];
    tagMap[t.fileId].push({ dimension: t.dimension, value: t.value });
  }

  const results = allProjectFiles.map(f => {
    const fileTags = tagMap[f.id] || [];
    const matched = tagDimensions.filter(st => fileTags.some(ft => ft.dimension === st.dimension && ft.value === st.value));
    const score = matched.length / sourceTags.length;
    return {
      file: f,
      score: Math.round(score * 100) / 100,
      matched_tags: matched.map(m => `${m.dimension}:${m.value}`),
    };
  }).filter(r => r.score > 0).sort((a, b) => b.score - a.score).slice(0, limit);

  return NextResponse.json(success(results));
}

/**
 * POST /api/v1/prompts/:id/convert — Format conversion
 */
export async function handleV1PromptsConvert(request: NextRequest, auth: AuthContext, fileId: string): Promise<NextResponse> {
  const db = getDb();

  // 🔒 Project isolation
  const fileRows = await db.select().from(files)
    .where(and(eq(files.id, fileId), eq(files.projectId, auth.projectId))).limit(1);
  if (fileRows.length === 0) {
    return NextResponse.json(error('NOT_FOUND', 'Prompt not found', 404), { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const targetFormat = body.target_format as string;
  if (!targetFormat) {
    return NextResponse.json(error('VALIDATION_ERROR', 'target_format is required', 422), { status: 422 });
  }

  const file = fileRows[0];
  const pifEntity: PIFEntity = {
    name: file.name,
    content: file.content,
  };

  const converted = formatMatrix.toFormat(pifEntity, targetFormat);
  return NextResponse.json(success({
    converted_content: converted,
    format: targetFormat,
    preview: true,
  }));
}

/**
 * GET /api/v1/tools — List supported tools (public, no auth needed)
 */
export async function handleV1ToolsList(): Promise<NextResponse> {
  const allTools = toolRegistry.filter(t => t.id); // All registered tools are "active"
  return NextResponse.json(success(allTools.map(t => ({
    id: t.id,
    name: t.name,
    display_name: t.displayName,
    category: t.category,
    format: t.formatSpec?.extension || '.md',
    is_active: true,
  }))));
}

/**
 * GET /api/v1/health — Health check (public)
 */
export async function handleV1Health(): Promise<NextResponse> {
  return NextResponse.json(success({ status: 'ok', version: '1.0.0', timestamp: now() }));
}

/**
 * GET /api/v1/mcp/tools — MCP tools list (public)
 */
export async function handleV1McpToolsList(): Promise<NextResponse> {
  return NextResponse.json(success({
    tools: [
      { name: 'search_prompts', description: 'Search the prompt library (scoped to current project)', parameters: ['query', 'tool', 'domain', 'role', 'language', 'quality', 'limit', 'include_content', 'format', 'project_id'] },
      { name: 'get_prompt', description: 'Get full prompt content by ID (verifies project ownership)', parameters: ['id', 'format', 'project_id'] },
      { name: 'deploy_prompt', description: 'Deploy a prompt to a target tool (verifies project ownership)', parameters: ['file_id', 'tool_id', 'mode', 'custom_content', 'project_id'] },
      { name: 'convert_format', description: 'Convert a prompt to a target format (verifies project ownership)', parameters: ['file_id', 'target_format', 'project_id'] },
      { name: 'scan_environment', description: 'Scan for installed AI tools', parameters: ['tool_ids', 'project_id'] },
      { name: 'sync_tool', description: 'Sync prompts with a tool directory', parameters: ['tool_id', 'direction', 'project_id'] },
      { name: 'list_tools', description: 'List all supported AI tools', parameters: [] },
      { name: 'suggest_similar', description: 'Suggest similar prompts (scoped to current project)', parameters: ['id', 'limit', 'project_id'] },
    ],
    resources: [
      { name: 'prompt-catalog', uri: 'prompt-library://catalog', description: 'List prompts (scoped to current project)' },
      { name: 'supported-tools', uri: 'prompt-library://tools', description: 'List supported tools' },
      { name: 'format-matrix', uri: 'prompt-library://formats', description: 'List format conversions' },
      { name: 'library-stats', uri: 'prompt-library://stats', description: 'Library statistics' },
    ],
  }));
}

/**
 * POST /api/v1/mcp/execute — Execute MCP tool with project context
 * Automatically injects projectId from API Key into tool arguments
 */
export async function handleV1McpExecute(request: NextRequest, auth: AuthContext): Promise<NextResponse> {
  const db = getDb();
  const body = (await request.json().catch(() => ({}))) as { tool: string; arguments?: Record<string, unknown> };
  const { tool, arguments: rawArgs = {} } = body;

  // Auto-inject projectId from auth context
  const args: Record<string, unknown> = { ...rawArgs, project_id: auth.projectId };

  try {
    let result: unknown;

    switch (tool) {
      case 'search_prompts': {
        const conditions = [eq(files.projectId, auth.projectId), isNull(files.deletedAt)];
        if (args.query) {
          const nameOrContent = or(like(files.name, `%${args.query}%`), like(files.content, `%${args.query}%`));
          if (nameOrContent) conditions.push(nameOrContent);
        }
        const includeContent = args.include_content as boolean | undefined;
        const limit = (args.limit as number) || 10;
        const fileRows = await db.select({
          id: files.id, name: files.name, slug: files.slug, license: files.license,
          sourceType: files.sourceType, rating: files.rating, version: files.version,
          ...(includeContent ? { content: files.content } : {}),
        }).from(files).where(and(...conditions)).limit(limit).orderBy(desc(files.rating));
        result = fileRows;
        break;
      }
      case 'get_prompt': {
        const fileRows = await db.select().from(files)
          .where(and(eq(files.id, args.id as string), eq(files.projectId, auth.projectId), isNull(files.deletedAt))).limit(1);
        if (fileRows.length === 0) {
          return NextResponse.json(error('NOT_FOUND', 'Prompt not found', 404), { status: 404 });
        }
        result = fileRows[0];
        break;
      }
      case 'list_tools': {
        result = toolRegistry;
        break;
      }
      case 'suggest_similar': {
        // Delegate to the v1 similar handler logic
        const sourceFile = await db.select({ id: files.id }).from(files)
          .where(and(eq(files.id, args.id as string), eq(files.projectId, auth.projectId))).limit(1);
        if (sourceFile.length === 0) {
          return NextResponse.json(error('NOT_FOUND', 'Prompt not found', 404), { status: 404 });
        }
        // Use the same similar logic
        const limit = (args.limit as number) || 5;
        const sourceTags = await db.select().from(tags).where(eq(tags.fileId, args.id as string));
        if (sourceTags.length === 0) { result = []; break; }
        const tagDims = sourceTags.map(t => ({ dimension: t.dimension, value: t.value }));
        const allFiles = await db.select({ id: files.id, name: files.name, slug: files.slug })
          .from(files).where(and(eq(files.projectId, auth.projectId), isNull(files.deletedAt), ne(files.id, args.id as string)));
        const allTags = await db.select().from(tags).where(inArray(tags.fileId, allFiles.map(f => f.id)));
        const tagMap: Record<string, { dimension: string; value: string }[]> = {};
        for (const t of allTags) {
          if (!tagMap[t.fileId]) tagMap[t.fileId] = [];
          tagMap[t.fileId].push({ dimension: t.dimension, value: t.value });
        }
        result = allFiles.map(f => {
          const ft = tagMap[f.id] || [];
          const matched = tagDims.filter(st => ft.some(t => t.dimension === st.dimension && t.value === st.value));
          return { file: f, score: matched.length / sourceTags.length, matched_tags: matched.map(m => `${m.dimension}:${m.value}`) };
        }).filter(r => r.score > 0).sort((a, b) => b.score - a.score).slice(0, limit);
        break;
      }
      default:
        // For deploy, convert, scan, sync — these require local filesystem and may not work on Workers
        // Return a helpful message
        return NextResponse.json(error(
          'TOOL_NOT_AVAILABLE',
          `Tool '${tool}' requires local filesystem access. Use the CLI or Stdio MCP server for this tool.`,
          501,
        ), { status: 501 });
    }

    return NextResponse.json(success(result));
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json(error('MCP_ERROR', message, 500), { status: 500 });
  }
}
