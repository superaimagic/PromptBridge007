import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { setD1Binding, getDb, ensureInitialized } from '@/lib/db';
import { nanoid } from 'nanoid';
import { eq, and, like, desc, asc, sql, inArray, isNull, or, SQL } from 'drizzle-orm';
import {
  tools,
  projects,
  files,
  tags,
  fileVersions,
  deployments,
  scanHistory,
  publicSources,
} from '@/lib/db/schema';
import { success, error, now, sanitizeInput, validateInput, generateSlug, computeContentHash } from '@/lib/api/types';
import { scanEngine } from '@/lib/core/ScanEngine';
import { deployEngine } from '@/lib/core/DeployEngine';
import { syncEngine } from '@/lib/core/SyncEngine';
import { watchEngine } from '@/lib/core/WatchEngine';
import { publicSyncEngine } from '@/lib/core/PublicSyncEngine';
import { searchEngine } from '@/lib/core/SearchEngine';
import { formatMatrix, type PIFEntity } from '@/lib/core/FormatMatrix';
import { toolRegistry } from '@/lib/core/ToolRegistry';

// Extend CloudflareEnv to include D1 binding
declare global {
  interface CloudflareEnv {
    DB: D1Database;
  }
}

/**
 * Set D1 binding from Cloudflare Workers context.
 * Must be called before any DB operations.
 */
async function initDbForRequest(): Promise<void> {
  try {
    const { env } = getCloudflareContext();
    if (env?.DB) {
      setD1Binding(env.DB as D1Database);
    } else {
      // Local mode - ensure DB is initialized
      await ensureInitialized();
    }
  } catch {
    // Not in Cloudflare Workers - local mode uses libsql
    await ensureInitialized();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Helper: format tags for file list/detail
// ═══════════════════════════════════════════════════════════════════════════════

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
): Array<{ id: string; fileId: string; dimension: string; value: string; confidence: string | null; createdAt: string }> {
  const tagValues: Array<{ id: string; fileId: string; dimension: string; value: string; confidence: string | null; createdAt: string }> = [];

  for (const [dimension, value] of Object.entries(inputTags)) {
    if (dimension === 'tool' && Array.isArray(value)) {
      for (const toolEntry of value) {
        if (typeof toolEntry === 'object' && toolEntry !== null && 'value' in toolEntry) {
          tagValues.push({
            id: nanoid(12),
            fileId,
            dimension: 'tool',
            value: String(toolEntry.value),
            confidence: toolEntry.confidence ? String(toolEntry.confidence) : null,
            createdAt: timestamp,
          });
        }
      }
    } else if (Array.isArray(value)) {
      for (const v of value) {
        tagValues.push({
          id: nanoid(12),
          fileId,
          dimension,
          value: String(v),
          confidence: null,
          createdAt: timestamp,
        });
      }
    } else if (value !== undefined && value !== null) {
      tagValues.push({
        id: nanoid(12),
        fileId,
        dimension,
        value: String(value),
        confidence: null,
        createdAt: timestamp,
      });
    }
  }

  return tagValues;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Route Handlers
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Init ────────────────────────────────────────────────────────────────────

async function handleInitPost(request: NextRequest): Promise<NextResponse> {
  await initDbForRequest();
  try {
    const body = (await request.json().catch(() => ({}))) as { force?: boolean };
    if (body.force) {
      const { dropAllTables, initAndSeed: reinit } = await import('@/lib/db/init');
      await dropAllTables();
      await reinit();
    } else {
      await ensureInitialized();
    }
    return NextResponse.json(success({
      initialized: true,
      message: 'Database initialized successfully',
    }));
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json(error('INIT_ERROR', message, 500), { status: 500 });
  }
}

// ─── Projects ────────────────────────────────────────────────────────────────

async function handleProjectsList(request: NextRequest): Promise<NextResponse> {
  await initDbForRequest();
  try {
    const db = getDb();
    const rows = await db.select().from(projects);
    return NextResponse.json(success(rows));
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json(error('PROJECT_LIST_ERROR', message, 500), { status: 500 });
  }
}

async function handleProjectsCreate(request: NextRequest): Promise<NextResponse> {
  await initDbForRequest();
  try {
    const db = getDb();
    const body = sanitizeInput(await request.json() as Record<string, unknown>);
    const validation = validateInput(body);
    if (validation) return NextResponse.json(error('INVALID_INPUT', validation, 400), { status: 400 });

    if (!body.name || !body.path) {
      return NextResponse.json(error('INVALID_INPUT', 'name and path are required', 400), { status: 400 });
    }

    const id = nanoid(12);
    const timestamp = now();

    await db.insert(projects).values({
      id,
      name: body.name,
      path: body.path,
      description: body.description || null,
      isDefault: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    return NextResponse.json(success({ id, name: body.name, path: body.path }), { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json(error('PROJECT_CREATE_ERROR', message, 500), { status: 500 });
  }
}

async function handleProjectsGet(request: NextRequest, id: string): Promise<NextResponse> {
  await initDbForRequest();
  try {
    const db = getDb();
    const rows = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
    if (rows.length === 0) return NextResponse.json(error('NOT_FOUND', 'Project not found', 404), { status: 404 });
    return NextResponse.json(success(rows[0]));
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json(error('PROJECT_GET_ERROR', message, 500), { status: 500 });
  }
}

async function handleProjectsDelete(request: NextRequest, id: string): Promise<NextResponse> {
  await initDbForRequest();
  try {
    const db = getDb();

    // Check for associated files
    const relatedFiles = await db.select({ id: files.id }).from(files).where(eq(files.projectId, id)).limit(1);
    if (relatedFiles.length > 0) {
      return NextResponse.json(error('HAS_DEPENDENCIES', 'Cannot delete project with associated files. Remove files first.', 400), { status: 400 });
    }

    // Check for associated deployments
    const relatedDeployments = await db.select({ id: deployments.id }).from(deployments).where(eq(deployments.projectId, id)).limit(1);
    if (relatedDeployments.length > 0) {
      return NextResponse.json(error('HAS_DEPENDENCIES', 'Cannot delete project with associated deployments. Remove deployments first.', 400), { status: 400 });
    }

    await db.delete(projects).where(eq(projects.id, id));
    return NextResponse.json(success({ deleted: true }));
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json(error('PROJECT_DELETE_ERROR', message, 500), { status: 500 });
  }
}

// ─── Files ───────────────────────────────────────────────────────────────────

async function handleFilesList(request: NextRequest): Promise<NextResponse> {
  await initDbForRequest();
  try {
    const db = getDb();
    const sp = request.nextUrl.searchParams;
    const page = Math.max(1, Number(sp.get('page') || 1));
    const pageSize = Math.min(100, Math.max(1, Number(sp.get('page_size') || 20)));
    const library = sp.get('library'); // 'private' | 'public'
    const search = sp.get('search');
    const toolFilter = sp.get('tool');
    const roleFilter = sp.get('role');
    const domainFilter = sp.get('domain');
    const languageFilter = sp.get('language');
    const qualityFilter = sp.get('quality');
    const sourceTypeFilter = sp.get('source_type');
    const sort = sp.get('sort') || 'created_at';
    const order = sp.get('order') || 'desc';

    const conditions: SQL[] = [isNull(files.deletedAt)];

    if (library === 'private') {
      conditions.push(eq(files.sourceType, 'user_created'));
    } else if (library === 'public') {
      conditions.push(eq(files.sourceType, 'public_repo'));
    }

    if (search) {
      const escaped = search.replace(/%/g, '\\%').replace(/_/g, '\\_');
      conditions.push(like(files.name, `%${escaped}%`));
    }

    if (sourceTypeFilter) {
      conditions.push(eq(files.sourceType, sourceTypeFilter));
    }

    // Build tag-based filters via subquery
    let tagFilteredFileIds: string[] | null = null;
    const tagConditions: { dimension: string; values: string[] }[] = [];

    if (toolFilter) tagConditions.push({ dimension: 'tool', values: toolFilter.split(',') });
    if (roleFilter) tagConditions.push({ dimension: 'role', values: roleFilter.split(',') });
    if (domainFilter) tagConditions.push({ dimension: 'domain', values: domainFilter.split(',') });
    if (languageFilter) tagConditions.push({ dimension: 'language', values: languageFilter.split(',') });
    if (qualityFilter) tagConditions.push({ dimension: 'quality', values: qualityFilter.split(',') });

    if (tagConditions.length > 0) {
      for (const tc of tagConditions) {
        const matchingTags = await db.select({ fileId: tags.fileId })
          .from(tags)
          .where(and(eq(tags.dimension, tc.dimension), inArray(tags.value, tc.values)));
        const ids = matchingTags.map(t => t.fileId);
        if (tagFilteredFileIds === null) {
          tagFilteredFileIds = ids;
        } else {
          tagFilteredFileIds = tagFilteredFileIds.filter(id => ids.includes(id));
        }
      }
      if (tagFilteredFileIds !== null) {
        if (tagFilteredFileIds.length === 0) {
          return NextResponse.json(success([], { page, page_size: pageSize, total: 0 }));
        }
        conditions.push(inArray(files.id, tagFilteredFileIds));
      }
    }

    const whereClause = and(...conditions);

    // Count total
    const countResult = await db.select({ count: sql<number>`count(*)` })
      .from(files)
      .where(whereClause);
    const total = countResult[0]?.count ?? 0;

    // Sort
    const sortColumn = sort === 'updated_at' ? files.updatedAt
      : sort === 'install_count' ? files.installCount
      : sort === 'rating' ? files.rating
      : files.createdAt;
    const orderFn = order === 'asc' ? asc : desc;

    // Fetch paginated
    const offset = (page - 1) * pageSize;
    const fileRecords = await db.select()
      .from(files)
      .where(whereClause)
      .orderBy(orderFn(sortColumn))
      .limit(pageSize)
      .offset(offset);

    // Fetch tags for each file
    const fileIds = fileRecords.map(f => f.id);
    const allTags = fileIds.length > 0
      ? await db.select().from(tags).where(inArray(tags.fileId, fileIds))
      : [];

    const tagMap = new Map<string, typeof allTags>();
    for (const t of allTags) {
      if (!tagMap.has(t.fileId)) tagMap.set(t.fileId, []);
      tagMap.get(t.fileId)!.push(t);
    }

    const data = fileRecords.map(f => ({
      id: f.id,
      slug: f.slug,
      name: f.name,
      license: f.license,
      tags: formatTagsForFile(tagMap.get(f.id) || []),
      install_count: f.installCount,
      rating: f.rating,
      created_at: f.createdAt,
      updated_at: f.updatedAt,
    }));

    return NextResponse.json(success(data, { page, page_size: pageSize, total }));
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json(error('FILE_LIST_ERROR', message, 500), { status: 500 });
  }
}

async function handleFilesSimilarSearch(request: NextRequest, id: string): Promise<NextResponse> {
  await initDbForRequest();
  try {
    const sp = request.nextUrl.searchParams;
    const limit = Math.min(20, Math.max(1, Number(sp.get('limit') || 5)));
    const results = await searchEngine.suggestSimilar(id, limit);
    return NextResponse.json(success(results));
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json(error('SIMILAR_SEARCH_ERROR', message, 500), { status: 500 });
  }
}

async function handleFilesDetail(request: NextRequest, fileId: string): Promise<NextResponse> {
  await initDbForRequest();
  try {
    const db = getDb();
    const records = await db.select().from(files).where(and(eq(files.id, fileId), isNull(files.deletedAt)));

    if (records.length === 0) {
      return NextResponse.json(error('NOT_FOUND', 'File not found', 404), { status: 404 });
    }

    const f = records[0];

    // Fetch tags
    const fileTags = await db.select().from(tags).where(eq(tags.fileId, fileId));
    const tagResult = formatTagsForFile(fileTags);

    // Fetch deployments
    const fileDeployments = await db.select({
      tool_id: deployments.toolId,
      status: deployments.status,
      deployed_at: deployments.createdAt,
    }).from(deployments).where(eq(deployments.fileId, fileId));

    return NextResponse.json(success({
      id: f.id,
      slug: f.slug,
      name: f.name,
      content: f.content,
      content_hash: f.contentHash,
      format: f.format,
      source: {
        type: f.sourceType,
        repo_name: f.repoName,
        repo_url: f.repoUrl,
        repo_license: f.repoLicense,
        author: f.author,
        author_url: f.authorUrl,
        file_path: f.filePath,
        commit_hash: f.commitHash,
        fetched_at: f.fetchedAt,
      },
      license: f.license,
      license_url: f.licenseUrl,
      tags: tagResult,
      version: f.version,
      install_count: f.installCount,
      rating: f.rating,
      created_at: f.createdAt,
      updated_at: f.updatedAt,
      deployments: fileDeployments,
    }));
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json(error('FILE_GET_ERROR', message, 500), { status: 500 });
  }
}

async function handleFilesCreate(request: NextRequest): Promise<NextResponse> {
  await initDbForRequest();
  try {
    const db = getDb();
    const rawBody = (await request.json()) as Record<string, unknown>;

    // Validate raw input BEFORE sanitizing
    const validationError = validateInput(rawBody);
    if (validationError) {
      return NextResponse.json(error('INVALID_INPUT', validationError, 400), { status: 400 });
    }

    const body = sanitizeInput(rawBody) as {
      name: string;
      content: string;
      format: string;
      license: string;
      tags?: Record<string, unknown>;
    };
    const { name, content: fileContent, format, license, tags: inputTags } = body;

    if (!name || !fileContent || !format || !license) {
      return NextResponse.json(error('INVALID_INPUT', 'name, content, format, and license are required', 400), { status: 400 });
    }

    const id = nanoid(12);
    const slug = generateSlug(name);
    const contentHash = computeContentHash(fileContent);
    const timestamp = now();

    await db.insert(files).values({
      id,
      slug,
      name,
      content: fileContent,
      contentHash,
      format,
      sourceType: 'user_created',
      license,
      version: 1,
      installCount: 0,
      rating: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    // Insert tags
    if (inputTags) {
      const tagValues = buildTagValues(inputTags, id, timestamp);
      if (tagValues.length > 0) {
        await db.insert(tags).values(tagValues);
      }
    }

    // Insert initial version
    await db.insert(fileVersions).values({
      id: nanoid(12),
      fileId: id,
      version: 1,
      content: fileContent,
      contentHash,
      changeSummary: 'Initial version',
      createdAt: timestamp,
    });

    return NextResponse.json(success({
      id,
      slug,
      name,
      content_hash: contentHash,
      version: 1,
      created_at: timestamp,
    }), { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json(error('FILE_CREATE_ERROR', message, 500), { status: 500 });
  }
}

async function handleFilesUpdate(request: NextRequest, fileId: string): Promise<NextResponse> {
  await initDbForRequest();
  try {
    const db = getDb();
    const rawBody = (await request.json()) as Record<string, unknown>;

    // Validate raw input BEFORE sanitizing
    const preValidationError = validateInput(rawBody);
    if (preValidationError) {
      return NextResponse.json(error('INVALID_INPUT', preValidationError, 400), { status: 400 });
    }

    const body = sanitizeInput(rawBody) as {
      name?: string;
      content?: string;
      tags?: Record<string, unknown>;
    };
    const { name, content: newContent, tags: inputTags } = body;

    const records = await db.select().from(files).where(and(eq(files.id, fileId), isNull(files.deletedAt)));
    if (records.length === 0) {
      return NextResponse.json(error('NOT_FOUND', 'File not found', 404), { status: 404 });
    }

    const existing = records[0];
    const timestamp = now();
    const updateData: Partial<typeof files.$inferInsert> = { updatedAt: timestamp };

    if (name) updateData.name = name;
    if (newContent) {
      updateData.content = newContent;
      updateData.contentHash = computeContentHash(newContent);
      updateData.version = (existing.version ?? 0) + 1;
    }

    await db.update(files).set(updateData).where(eq(files.id, fileId));

    // Create version record if content changed
    if (newContent) {
      await db.insert(fileVersions).values({
        id: nanoid(12),
        fileId,
        version: (existing.version ?? 0) + 1,
        content: newContent,
        contentHash: computeContentHash(newContent),
        changeSummary: name ? `Updated: ${name}` : 'Content updated',
        createdAt: timestamp,
      });
    }

    // Update tags if provided
    if (inputTags) {
      // Delete existing tags
      await db.delete(tags).where(eq(tags.fileId, fileId));

      const tagValues = buildTagValues(inputTags, fileId, timestamp);
      if (tagValues.length > 0) {
        await db.insert(tags).values(tagValues);
      }
    }

    return NextResponse.json(success({
      id: fileId,
      updated_at: timestamp,
      version: updateData.version ?? existing.version,
    }));
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json(error('FILE_UPDATE_ERROR', message, 500), { status: 500 });
  }
}

async function handleFilesDelete(request: NextRequest, fileId: string): Promise<NextResponse> {
  await initDbForRequest();
  try {
    const db = getDb();
    const records = await db.select().from(files).where(and(eq(files.id, fileId), isNull(files.deletedAt)));
    if (records.length === 0) {
      return NextResponse.json(error('NOT_FOUND', 'File not found', 404), { status: 404 });
    }

    await db.update(files).set({ deletedAt: now() }).where(eq(files.id, fileId));

    return NextResponse.json(success({ id: fileId, deleted: true }));
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json(error('FILE_DELETE_ERROR', message, 500), { status: 500 });
  }
}

async function handleFileTagCreate(request: NextRequest, fileId: string): Promise<NextResponse> {
  await initDbForRequest();
  try {
    const db = getDb();
    const body = (await request.json()) as Record<string, unknown>;
    const { dimension, value, confidence } = body as {
      dimension: string;
      value: string;
      confidence?: string;
    };

    if (!dimension || !value) {
      return NextResponse.json(error('INVALID_INPUT', 'dimension and value are required', 400), { status: 400 });
    }

    const tagValidationError = validateInput({ value });
    if (tagValidationError) {
      return NextResponse.json(error('INVALID_INPUT', tagValidationError, 400), { status: 400 });
    }

    // Verify file exists
    const records = await db.select().from(files).where(and(eq(files.id, fileId), isNull(files.deletedAt)));
    if (records.length === 0) {
      return NextResponse.json(error('NOT_FOUND', 'File not found', 404), { status: 404 });
    }

    const id = nanoid(12);
    const timestamp = now();

    try {
      await db.insert(tags).values({
        id,
        fileId,
        dimension,
        value,
        confidence: confidence ?? null,
        createdAt: timestamp,
      });
    } catch (insertErr) {
      // Handle unique constraint violation (tag already exists)
      if (insertErr instanceof Error && insertErr.message.includes('UNIQUE')) {
        return NextResponse.json(error('DUPLICATE_TAG', 'Tag already exists for this file', 409), { status: 409 });
      }
      throw insertErr;
    }

    return NextResponse.json(success({
      id,
      file_id: fileId,
      dimension,
      value,
      confidence: confidence ?? null,
    }), { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json(error('TAG_CREATE_ERROR', message, 500), { status: 500 });
  }
}

async function handleFileTagDelete(request: NextRequest, fileId: string, dimension: string, value: string): Promise<NextResponse> {
  await initDbForRequest();
  try {
    const db = getDb();
    await db.delete(tags).where(
      and(eq(tags.fileId, fileId), eq(tags.dimension, dimension), eq(tags.value, value))
    );

    return NextResponse.json(success({ file_id: fileId, dimension, value, deleted: true }));
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json(error('TAG_DELETE_ERROR', message, 500), { status: 500 });
  }
}

async function handleFilesSearch(request: NextRequest): Promise<NextResponse> {
  await initDbForRequest();
  try {
    const body = (await request.json()) as {
      query?: string;
      tags?: Record<string, string | string[]>;
      must_have_all_tags?: boolean;
      page?: number;
      page_size?: number;
    };
    const {
      query,
      tags: searchTags,
      must_have_all_tags = false,
      page = 1,
      page_size = 20,
    } = body;

    // Use SearchEngine for search
    const searchResult = await searchEngine.search({
      query,
      limit: page_size,
      offset: (page - 1) * page_size,
    });

    return NextResponse.json(success(searchResult.results, { page, page_size, total: searchResult.total }));
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json(error('SEARCH_ERROR', message, 500), { status: 500 });
  }
}

// ─── Tools ───────────────────────────────────────────────────────────────────

async function handleToolsList(request: NextRequest): Promise<NextResponse> {
  await initDbForRequest();
  try {
    const db = getDb();
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

    return NextResponse.json(success(data));
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json(error('TOOLS_ERROR', message, 500), { status: 500 });
  }
}

// ─── Scan ────────────────────────────────────────────────────────────────────

async function handleScanCreate(request: NextRequest): Promise<NextResponse> {
  await initDbForRequest();
  try {
    const db = getDb();
    const body = (await request.json()) as Record<string, unknown>;
    const toolIds: string[] | undefined = body.tool_ids as string[] | undefined;
    const scanType: string = (body.scan_type as string) || 'full';
    const projectId: string | undefined = body.project_id as string | undefined;

    if (scanType !== 'full' && scanType !== 'incremental') {
      return NextResponse.json(error('INVALID_INPUT', 'scan_type must be "full" or "incremental"', 400), { status: 400 });
    }

    // For incremental scan, only scan tools that have been previously detected (have deployments)
    let effectiveToolIds = toolIds;
    if (scanType === 'incremental' && !toolIds) {
      const deploymentRows = await db.select({ toolId: deployments.toolId })
        .from(deployments)
        .groupBy(deployments.toolId);
      effectiveToolIds = deploymentRows.map(r => r.toolId);
      if (effectiveToolIds.length === 0) {
        return NextResponse.json(success({
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
        }), { status: 201 });
      }
    }

    // Use real scan engine
    const envResult = await scanEngine.scanEnvironment(effectiveToolIds, projectId);

    // If tool_ids specified, return per-tool scan results
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
      return NextResponse.json(success({ scans: scanResults }), { status: 201 });
    }

    // Full scan
    return NextResponse.json(success({
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
    }), { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json(error('SCAN_ERROR', message, 500), { status: 500 });
  }
}

async function handleScanGet(request: NextRequest, scanId: string): Promise<NextResponse> {
  await initDbForRequest();
  try {
    const db = getDb();
    const records = await db.select().from(scanHistory).where(eq(scanHistory.id, scanId));

    if (records.length === 0) {
      return NextResponse.json(error('NOT_FOUND', 'Scan not found', 404), { status: 404 });
    }

    const r = records[0];
    return NextResponse.json(success({
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
    return NextResponse.json(error('SCAN_ERROR', message, 500), { status: 500 });
  }
}

// ─── Deploy ──────────────────────────────────────────────────────────────────

async function handleDeployCreate(request: NextRequest): Promise<NextResponse> {
  await initDbForRequest();
  try {
    const db = getDb();
    const body = (await request.json()) as {
      file_id: string;
      tool_id: string;
      mode: 'original' | 'customized' | 'incremental';
      custom_content?: string;
      project_id?: string;
    };
    const { file_id, tool_id, mode, custom_content, project_id } = body;

    if (!file_id || !tool_id || !mode) {
      return NextResponse.json(error('INVALID_INPUT', 'file_id, tool_id, and mode are required', 400), { status: 400 });
    }

    const deployValidationError = validateInput({ tool_id });
    if (deployValidationError) {
      return NextResponse.json(error('INVALID_INPUT', deployValidationError, 400), { status: 400 });
    }

    // Look up project path from project_id
    let projectPath: string | undefined;
    if (project_id) {
      const projectRows = await db.select({ path: projects.path }).from(projects).where(eq(projects.id, project_id)).limit(1);
      if (projectRows.length > 0) {
        projectPath = projectRows[0].path;
      }
    }

    // Use real deploy engine
    const result = await deployEngine.deploy({
      fileId: file_id,
      toolId: tool_id,
      mode,
      customContent: custom_content,
      projectId: project_id,
    }, projectPath);

    // Update install count
    if (result.status === 'success') {
      await db.update(files)
        .set({ installCount: sql`${files.installCount} + 1` })
        .where(eq(files.id, file_id));
    }

    const statusCode = result.status === 'success' ? 201 : 500;
    return NextResponse.json(success({
      deploy_id: result.deployId,
      status: result.status,
      target_path: result.targetPath,
      error_message: result.errorMessage,
      deployed_at: result.deployedAt,
    }), { status: statusCode });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json(error('DEPLOY_ERROR', message, 500), { status: 500 });
  }
}

async function handleDeployList(request: NextRequest): Promise<NextResponse> {
  await initDbForRequest();
  try {
    const db = getDb();
    const sp = request.nextUrl.searchParams;
    const fileId = sp.get('file_id');
    const toolId = sp.get('tool_id');
    const status = sp.get('status');

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

    return NextResponse.json(success(data));
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json(error('DEPLOYMENT_LIST_ERROR', message, 500), { status: 500 });
  }
}

async function handleDeployGet(request: NextRequest, deployId: string): Promise<NextResponse> {
  await initDbForRequest();
  try {
    const db = getDb();
    const records = await db.select().from(deployments).where(eq(deployments.id, deployId));

    if (records.length === 0) {
      return NextResponse.json(error('NOT_FOUND', 'Deployment not found', 404), { status: 404 });
    }

    const d = records[0];
    return NextResponse.json(success({
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
    return NextResponse.json(error('DEPLOY_GET_ERROR', message, 500), { status: 500 });
  }
}

// ─── Sync ────────────────────────────────────────────────────────────────────

async function handleSyncCreate(request: NextRequest): Promise<NextResponse> {
  await initDbForRequest();
  try {
    const body = (await request.json()) as {
      direction: 'to_tool' | 'from_tool';
      tool_id?: string;
      sync_all?: boolean;
    };
    const { direction, tool_id, sync_all } = body;

    if (!direction) {
      return NextResponse.json(error('INVALID_INPUT', 'direction is required', 400), { status: 400 });
    }

    if (direction !== 'to_tool' && direction !== 'from_tool') {
      return NextResponse.json(error('INVALID_INPUT', 'direction must be "to_tool" or "from_tool"', 400), { status: 400 });
    }

    // Use real sync engine
    if (sync_all) {
      const results = await syncEngine.syncAll(direction);
      return NextResponse.json(success({
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
      return NextResponse.json(error('INVALID_INPUT', 'tool_id is required when sync_all is not set', 400), { status: 400 });
    }

    const result = await syncEngine.sync(tool_id, direction);
    return NextResponse.json(success({
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
    return NextResponse.json(error('SYNC_ERROR', message, 500), { status: 500 });
  }
}

async function handleSyncStatuses(request: NextRequest): Promise<NextResponse> {
  await initDbForRequest();
  try {
    const statuses = await syncEngine.getSyncStatuses();
    return NextResponse.json(success(statuses.map(s => ({
      tool_id: s.toolId,
      tool_name: s.toolName,
      status: s.status,
      last_sync_at: s.lastSyncAt,
      deployed_files: s.deployedFiles,
      pending_changes: s.pendingChanges,
    }))));
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json(error('SYNC_STATUS_ERROR', message, 500), { status: 500 });
  }
}

async function handleWatchStart(request: NextRequest): Promise<NextResponse> {
  await initDbForRequest();
  try {
    await watchEngine.start();
    const status = watchEngine.getStatus();
    return NextResponse.json(success({
      running: status.running,
      watched_directories: status.watchedDirectories,
      tracked_files: status.trackedFiles,
    }));
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json(error('WATCH_START_ERROR', message, 500), { status: 500 });
  }
}

async function handleWatchStop(request: NextRequest): Promise<NextResponse> {
  await initDbForRequest();
  try {
    watchEngine.stop();
    return NextResponse.json(success({
      running: false,
      watched_directories: 0,
      tracked_files: 0,
    }));
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json(error('WATCH_STOP_ERROR', message, 500), { status: 500 });
  }
}

async function handleWatchStatus(request: NextRequest): Promise<NextResponse> {
  await initDbForRequest();
  try {
    const status = watchEngine.getStatus();
    return NextResponse.json(success(status));
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json(error('WATCH_STATUS_ERROR', message, 500), { status: 500 });
  }
}

// ─── Convert ─────────────────────────────────────────────────────────────────

async function handleConvertCreate(request: NextRequest): Promise<NextResponse> {
  await initDbForRequest();
  try {
    const db = getDb();
    const body = (await request.json()) as {
      file_id: string;
      target_format: string;
    };
    const { file_id, target_format } = body;

    if (!file_id || !target_format) {
      return NextResponse.json(error('INVALID_INPUT', 'file_id and target_format are required', 400), { status: 400 });
    }

    const records = await db.select().from(files).where(and(eq(files.id, file_id), isNull(files.deletedAt)));
    if (records.length === 0) {
      return NextResponse.json(error('NOT_FOUND', 'File not found', 404), { status: 404 });
    }

    const file = records[0];

    // Build PIF entity from file data
    const pif: PIFEntity = {
      name: file.name,
      content: file.content,
      slug: file.slug,
      license: file.license,
      licenseUrl: file.licenseUrl ?? undefined,
      sourceType: file.sourceType,
      repoName: file.repoName ?? undefined,
      repoUrl: file.repoUrl ?? undefined,
      repoLicense: file.repoLicense ?? undefined,
      author: file.author ?? undefined,
    };

    // Use FormatMatrix for conversion
    let convertedContent: string;
    let outputFormat: string;
    try {
      convertedContent = formatMatrix.toFormat(pif, target_format);
      // Determine output format name from the format key
      outputFormat = target_format.startsWith('to_') ? target_format.replace('to_', '') : target_format;
    } catch {
      // Fallback: return original content
      convertedContent = file.content;
      outputFormat = file.format;
    }

    return NextResponse.json(success({
      converted_content: convertedContent,
      format: outputFormat,
      preview: true,
    }));
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json(error('CONVERT_ERROR', message, 500), { status: 500 });
  }
}

// ─── Public Sources ──────────────────────────────────────────────────────────

async function handlePublicSourcesList(request: NextRequest): Promise<NextResponse> {
  await initDbForRequest();
  try {
    const db = getDb();
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

    return NextResponse.json(success(data));
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json(error('PUBLIC_SOURCES_ERROR', message, 500), { status: 500 });
  }
}

async function handlePublicSourcesCreate(request: NextRequest): Promise<NextResponse> {
  await initDbForRequest();
  try {
    const db = getDb();
    const body = (await request.json()) as {
      name: string;
      repo_url: string;
      repo_license?: string;
      description?: string;
    };
    const { name, repo_url, repo_license, description } = body;

    if (!name || !repo_url) {
      return NextResponse.json(error('INVALID_INPUT', 'name and repo_url are required', 400), { status: 400 });
    }

    const validationError = validateInput({ name });
    if (validationError) {
      return NextResponse.json(error('INVALID_INPUT', validationError, 400), { status: 400 });
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

    return NextResponse.json(success({
      id,
      name,
      repo_url,
      repo_license: repo_license || null,
      description: description || null,
    }), { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json(error('PUBLIC_SOURCE_CREATE_ERROR', message, 500), { status: 500 });
  }
}

async function handlePublicSourceSync(request: NextRequest, sourceId: string): Promise<NextResponse> {
  await initDbForRequest();
  try {
    const db = getDb();
    const records = await db.select().from(publicSources).where(eq(publicSources.id, sourceId));

    if (records.length === 0) {
      return NextResponse.json(error('NOT_FOUND', 'Public source not found', 404), { status: 404 });
    }

    // Use PublicSyncEngine for real sync
    const result = await publicSyncEngine.syncSource(sourceId);

    return NextResponse.json(success({
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
    return NextResponse.json(error('PUBLIC_SOURCE_SYNC_ERROR', message, 500), { status: 500 });
  }
}

// ─── MCP ─────────────────────────────────────────────────────────────────────

async function handleMcpToolsList(request: NextRequest): Promise<NextResponse> {
  await initDbForRequest();
  return NextResponse.json({
    success: true,
    data: {
      tools: [
        { name: 'search_prompts', description: 'Search the prompt library', parameters: ['query', 'tool', 'domain', 'role', 'language', 'quality', 'limit', 'include_content', 'format'] },
        { name: 'get_prompt', description: 'Get full prompt content by ID', parameters: ['id', 'format'] },
        { name: 'deploy_prompt', description: 'Deploy a prompt to a target tool', parameters: ['file_id', 'tool_id', 'mode', 'custom_content'] },
        { name: 'convert_format', description: 'Convert a prompt to a target format', parameters: ['file_id', 'target_format'] },
        { name: 'scan_environment', description: 'Scan for installed AI tools', parameters: ['tool_ids'] },
        { name: 'sync_tool', description: 'Sync prompts with a tool directory', parameters: ['tool_id', 'direction'] },
        { name: 'list_tools', description: 'List all supported AI tools', parameters: [] },
        { name: 'suggest_similar', description: 'Suggest similar prompts based on shared tags', parameters: ['id', 'limit'] },
      ],
      resources: [
        { name: 'prompt-catalog', uri: 'prompt-library://catalog', description: 'List all prompts' },
        { name: 'supported-tools', uri: 'prompt-library://tools', description: 'List supported tools' },
        { name: 'format-matrix', uri: 'prompt-library://formats', description: 'List format conversions' },
        { name: 'library-stats', uri: 'prompt-library://stats', description: 'Library statistics' },
      ],
    },
  });
}

async function handleMcpExecute(request: NextRequest): Promise<NextResponse> {
  await initDbForRequest();
  try {
    const db = getDb();
    const body = (await request.json()) as { tool: string; arguments?: Record<string, unknown> };
    const { tool, arguments: args = {} } = body;

    let result: unknown;

    switch (tool) {
      case 'search_prompts': {
        const conditions = [isNull(files.deletedAt)];
        if (args.query) {
          const nameOrContent = or(
            like(files.name, `%${args.query}%`),
            like(files.content, `%${args.query}%`),
          );
          if (nameOrContent) conditions.push(nameOrContent);
        }
        const includeContent = args.include_content as boolean | undefined;
        const targetFormat = args.format as string | undefined;
        const selectFields = {
          id: files.id,
          name: files.name,
          slug: files.slug,
          license: files.license,
          sourceType: files.sourceType,
          rating: files.rating,
          version: files.version,
          ...(includeContent || targetFormat ? { content: files.content } : {}),
        };
        const fileRows = await db
          .select(selectFields)
          .from(files)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .limit((args.limit as number) || 10)
          .orderBy(desc(files.rating));

        // Apply format conversion if requested
        if (targetFormat && fileRows.length > 0) {
          const convertedRows = fileRows.map((row) => {
            const pif: PIFEntity = {
              name: row.name,
              content: (row as typeof row & { content: string }).content,
              slug: row.slug,
              license: row.license,
              sourceType: row.sourceType,
            };
            try {
              const converted = formatMatrix.toFormat(pif, targetFormat);
              return { ...row, content: converted };
            } catch {
              return row;
            }
          });
          result = convertedRows;
        } else {
          result = fileRows;
        }
        break;
      }
      case 'get_prompt': {
        if (!args.id)
          return NextResponse.json(
            { success: false, error: { code: 'MISSING_PARAM', message: 'id is required' } },
            { status: 400 },
          );
        const fileRows = await db
          .select()
          .from(files)
          .where(and(eq(files.id, args.id as string), isNull(files.deletedAt)))
          .limit(1);
        if (fileRows.length === 0)
          return NextResponse.json(
            { success: false, error: { code: 'NOT_FOUND', message: `Prompt not found: ${args.id}` } },
            { status: 404 },
          );
        const tagRows = await db.select().from(tags).where(eq(tags.fileId, args.id as string));
        let promptResult: Record<string, unknown> = { ...fileRows[0], tags: tagRows };

        // Apply format conversion if requested
        const targetFormat = args.format as string | undefined;
        if (targetFormat) {
          const file = fileRows[0];
          const pif: PIFEntity = {
            name: file.name,
            content: file.content,
            slug: file.slug,
            license: file.license,
            sourceType: file.sourceType,
          };
          try {
            const converted = formatMatrix.toFormat(pif, targetFormat);
            promptResult = { ...promptResult, content: converted, converted_format: targetFormat };
          } catch {
            // Return original content if conversion fails
          }
        }

        result = promptResult;
        break;
      }
      case 'deploy_prompt': {
        if (!args.file_id || !args.tool_id)
          return NextResponse.json(
            {
              success: false,
              error: { code: 'MISSING_PARAM', message: 'file_id and tool_id are required' },
            },
            { status: 400 },
          );
        result = await deployEngine.deploy({
          fileId: args.file_id as string,
          toolId: args.tool_id as string,
          mode: (args.mode as 'original' | 'customized' | 'incremental') || 'original',
          customContent: args.custom_content as string | undefined,
        });
        break;
      }
      case 'convert_format': {
        if (!args.file_id || !args.target_format)
          return NextResponse.json(
            {
              success: false,
              error: { code: 'MISSING_PARAM', message: 'file_id and target_format are required' },
            },
            { status: 400 },
          );
        const fileRows = await db
          .select()
          .from(files)
          .where(and(eq(files.id, args.file_id as string), isNull(files.deletedAt)))
          .limit(1);
        if (fileRows.length === 0)
          return NextResponse.json(
            {
              success: false,
              error: { code: 'NOT_FOUND', message: `Prompt not found: ${args.file_id}` },
            },
            { status: 404 },
          );
        const file = fileRows[0];
        const pif: PIFEntity = {
          name: file.name,
          content: file.content,
          slug: file.slug,
          license: file.license,
          sourceType: file.sourceType,
        };
        const converted = formatMatrix.toFormat(pif, args.target_format as string);
        result = {
          original_format: 'markdown',
          target_format: args.target_format,
          converted_content: converted,
        };
        break;
      }
      case 'scan_environment': {
        result = await scanEngine.scanEnvironment(args.tool_ids as string[] | undefined);
        break;
      }
      case 'sync_tool': {
        if (!args.tool_id || !args.direction)
          return NextResponse.json(
            {
              success: false,
              error: { code: 'MISSING_PARAM', message: 'tool_id and direction are required' },
            },
            { status: 400 },
          );
        result = await syncEngine.sync(
          args.tool_id as string,
          args.direction as 'to_tool' | 'from_tool',
        );
        break;
      }
      case 'list_tools': {
        result = toolRegistry;
        break;
      }
      case 'suggest_similar': {
        if (!args.id)
          return NextResponse.json(
            { success: false, error: { code: 'MISSING_PARAM', message: 'id is required' } },
            { status: 400 },
          );
        result = await searchEngine.suggestSimilar(
          args.id as string,
          (args.limit as number) || 5,
        );
        break;
      }
      default:
        return NextResponse.json(
          { success: false, error: { code: 'UNKNOWN_TOOL', message: `Unknown MCP tool: ${tool}` } },
          { status: 400 },
        );
    }

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'MCP_ERROR',
          message: err instanceof Error ? err.message : String(err),
        },
      },
      { status: 500 },
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Router - URL path matching
// ═══════════════════════════════════════════════════════════════════════════════

async function handleRequest(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // Strip trailing slash for consistent matching
  const path = pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname;

  // Parse path segments after /api/
  const apiPrefix = '/api/';
  if (!path.startsWith(apiPrefix)) {
    return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } }, { status: 404 });
  }

  const routePath = path.slice(apiPrefix.length); // e.g. "files/search/similar/abc"
  const segments = routePath.split('/').filter(Boolean);

  try {
    // ─── POST /api/init ─────────────────────────────────────────────────
    if (routePath === 'init' && method === 'POST') {
      return await handleInitPost(request);
    }

    // ─── Projects ───────────────────────────────────────────────────────
    if (routePath === 'projects' && method === 'GET') {
      return await handleProjectsList(request);
    }
    if (routePath === 'projects' && method === 'POST') {
      return await handleProjectsCreate(request);
    }
    if (segments[0] === 'projects' && segments.length === 2 && method === 'GET') {
      return await handleProjectsGet(request, segments[1]);
    }
    if (segments[0] === 'projects' && segments.length === 2 && method === 'DELETE') {
      return await handleProjectsDelete(request, segments[1]);
    }

    // ─── Files ──────────────────────────────────────────────────────────
    // POST /api/files/search (must be before /api/files/:id)
    if (routePath === 'files/search' && method === 'POST') {
      return await handleFilesSearch(request);
    }
    // GET /api/files/search/similar/:id (must be before /api/files/:id)
    if (segments[0] === 'files' && segments[1] === 'search' && segments[2] === 'similar' && segments.length === 4 && method === 'GET') {
      return await handleFilesSimilarSearch(request, segments[3]);
    }
    // GET /api/files
    if (routePath === 'files' && method === 'GET') {
      return await handleFilesList(request);
    }
    // POST /api/files
    if (routePath === 'files' && method === 'POST') {
      return await handleFilesCreate(request);
    }
    // DELETE /api/files/:file_id/tags/:dimension/:value (must be before /api/files/:id)
    if (segments[0] === 'files' && segments[2] === 'tags' && segments.length === 5 && method === 'DELETE') {
      return await handleFileTagDelete(request, segments[1], segments[3], segments[4]);
    }
    // POST /api/files/:file_id/tags (must be before /api/files/:id)
    if (segments[0] === 'files' && segments[2] === 'tags' && segments.length === 3 && method === 'POST') {
      return await handleFileTagCreate(request, segments[1]);
    }
    // GET /api/files/:file_id
    if (segments[0] === 'files' && segments.length === 2 && method === 'GET') {
      return await handleFilesDetail(request, segments[1]);
    }
    // PUT /api/files/:file_id
    if (segments[0] === 'files' && segments.length === 2 && method === 'PUT') {
      return await handleFilesUpdate(request, segments[1]);
    }
    // DELETE /api/files/:file_id
    if (segments[0] === 'files' && segments.length === 2 && method === 'DELETE') {
      return await handleFilesDelete(request, segments[1]);
    }

    // ─── Tools ──────────────────────────────────────────────────────────
    if (routePath === 'tools' && method === 'GET') {
      return await handleToolsList(request);
    }

    // ─── Scan ───────────────────────────────────────────────────────────
    if (routePath === 'scan' && method === 'POST') {
      return await handleScanCreate(request);
    }
    if (segments[0] === 'scan' && segments.length === 2 && method === 'GET') {
      return await handleScanGet(request, segments[1]);
    }

    // ─── Deploy ─────────────────────────────────────────────────────────
    if (routePath === 'deploy' && method === 'POST') {
      return await handleDeployCreate(request);
    }
    if (routePath === 'deploy' && method === 'GET') {
      return await handleDeployList(request);
    }
    if (segments[0] === 'deploy' && segments.length === 2 && method === 'GET') {
      return await handleDeployGet(request, segments[1]);
    }

    // ─── Sync ───────────────────────────────────────────────────────────
    if (routePath === 'sync' && method === 'POST') {
      return await handleSyncCreate(request);
    }
    if (routePath === 'sync/statuses' && method === 'GET') {
      return await handleSyncStatuses(request);
    }
    if (routePath === 'sync/watch/start' && method === 'POST') {
      return await handleWatchStart(request);
    }
    if (routePath === 'sync/watch/stop' && method === 'POST') {
      return await handleWatchStop(request);
    }
    if (routePath === 'sync/watch/status' && method === 'GET') {
      return await handleWatchStatus(request);
    }

    // ─── Convert ────────────────────────────────────────────────────────
    if (routePath === 'convert' && method === 'POST') {
      return await handleConvertCreate(request);
    }

    // ─── Public Sources ─────────────────────────────────────────────────
    if (routePath === 'public-sources' && method === 'GET') {
      return await handlePublicSourcesList(request);
    }
    if (routePath === 'public-sources' && method === 'POST') {
      return await handlePublicSourcesCreate(request);
    }
    if (segments[0] === 'public-sources' && segments.length === 3 && segments[2] === 'sync' && method === 'POST') {
      return await handlePublicSourceSync(request, segments[1]);
    }

    // ─── MCP ────────────────────────────────────────────────────────────
    if (routePath === 'mcp/tools' && method === 'GET') {
      return await handleMcpToolsList(request);
    }
    if (routePath === 'mcp/execute' && method === 'POST') {
      return await handleMcpExecute(request);
    }

    // ─── 404 Fallback ───────────────────────────────────────────────────
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: `Route not found: ${method} ${pathname}` } },
      { status: 404 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message } },
      { status: 500 },
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Export HTTP method handlers
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  return handleRequest(request);
}

export async function POST(request: NextRequest) {
  return handleRequest(request);
}

export async function PUT(request: NextRequest) {
  return handleRequest(request);
}

export async function DELETE(request: NextRequest) {
  return handleRequest(request);
}

export async function PATCH(request: NextRequest) {
  return handleRequest(request);
}
