import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { eq, and, like, desc, asc, sql, inArray, isNull, SQL } from 'drizzle-orm';
import { db } from '@/lib/db';
import { files, tags, fileVersions, deployments } from '@/lib/db/schema';
import { success, error, now, sanitizeInput, validateInput, generateSlug, computeContentHash } from '../types';
import { searchEngine } from '@/lib/core/SearchEngine';

const router = new Hono();

// ─── File List ──────────────────────────────────────────────────────────────

router.get('/', async (c) => {
  try {
    const page = Math.max(1, Number(c.req.query('page') || 1));
    const pageSize = Math.min(100, Math.max(1, Number(c.req.query('page_size') || 20)));
    const library = c.req.query('library'); // 'private' | 'public'
    const search = c.req.query('search');
    const toolFilter = c.req.query('tool');
    const roleFilter = c.req.query('role');
    const domainFilter = c.req.query('domain');
    const languageFilter = c.req.query('language');
    const qualityFilter = c.req.query('quality');
    const sourceTypeFilter = c.req.query('source_type');
    const sort = c.req.query('sort') || 'created_at';
    const order = c.req.query('order') || 'desc';

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
          return c.json(success([], { page, page_size: pageSize, total: 0 }));
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

    function formatTagsForFile(fileTags: typeof allTags) {
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

    return c.json(success(data, { page, page_size: pageSize, total }));
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return c.json(error('FILE_LIST_ERROR', message, 500), 500);
  }
});

// ─── Similar Search ─────────────────────────────────────────────────────────

router.get('/search/similar/:id', async (c) => {
  try {
    const fileId = c.req.param('id');
    const limit = Math.min(20, Math.max(1, Number(c.req.query('limit') || 5)));

    const results = await searchEngine.suggestSimilar(fileId, limit);
    return c.json(success(results));
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return c.json(error('SIMILAR_SEARCH_ERROR', message, 500), 500);
  }
});

// ─── File Detail ────────────────────────────────────────────────────────────

router.get('/:file_id', async (c) => {
  try {
    const fileId = c.req.param('file_id');
    const records = await db.select().from(files).where(and(eq(files.id, fileId), isNull(files.deletedAt)));

    if (records.length === 0) {
      return c.json(error('NOT_FOUND', 'File not found', 404), 404);
    }

    const f = records[0];

    // Fetch tags
    const fileTags = await db.select().from(tags).where(eq(tags.fileId, fileId));
    const tagResult: Record<string, unknown> = {};
    for (const t of fileTags) {
      if (t.dimension === 'tool') {
        if (!tagResult.tool) tagResult.tool = [];
        (tagResult.tool as Array<{ value: string; confidence: string | null }>).push({
          value: t.value,
          confidence: t.confidence,
        });
      } else {
        tagResult[t.dimension] = t.value;
      }
    }

    // Fetch deployments
    const fileDeployments = await db.select({
      tool_id: deployments.toolId,
      status: deployments.status,
      deployed_at: deployments.createdAt,
    }).from(deployments).where(eq(deployments.fileId, fileId));

    return c.json(success({
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
    return c.json(error('FILE_GET_ERROR', message, 500), 500);
  }
});

// ─── Create File ────────────────────────────────────────────────────────────

router.post('/', async (c) => {
  try {
    const rawBody = await c.req.json();

    // Validate raw input BEFORE sanitizing (sanitize may introduce / chars like &lt;/script&gt;)
    const validationError = validateInput(rawBody);
    if (validationError) {
      return c.json(error('INVALID_INPUT', validationError, 400), 400);
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
      return c.json(error('INVALID_INPUT', 'name, content, format, and license are required', 400), 400);
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
      const tagValues: Array<{
        id: string;
        fileId: string;
        dimension: string;
        value: string;
        confidence: string | null;
        createdAt: string;
      }> = [];

      for (const [dimension, value] of Object.entries(inputTags)) {
        if (dimension === 'tool' && Array.isArray(value)) {
          for (const toolEntry of value) {
            if (typeof toolEntry === 'object' && toolEntry !== null && 'value' in toolEntry) {
              tagValues.push({
                id: nanoid(12),
                fileId: id,
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
              fileId: id,
              dimension,
              value: String(v),
              confidence: null,
              createdAt: timestamp,
            });
          }
        } else if (value !== undefined && value !== null) {
          tagValues.push({
            id: nanoid(12),
            fileId: id,
            dimension,
            value: String(value),
            confidence: null,
            createdAt: timestamp,
          });
        }
      }

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

    return c.json(success({
      id,
      slug,
      name,
      content_hash: contentHash,
      version: 1,
      created_at: timestamp,
    }), 201);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return c.json(error('FILE_CREATE_ERROR', message, 500), 500);
  }
});

// ─── Update File ────────────────────────────────────────────────────────────

router.put('/:file_id', async (c) => {
  try {
    const fileId = c.req.param('file_id');
    const rawBody = await c.req.json();

    // Validate raw input BEFORE sanitizing
    const preValidationError = validateInput(rawBody);
    if (preValidationError) {
      return c.json(error('INVALID_INPUT', preValidationError, 400), 400);
    }

    const body = sanitizeInput(rawBody) as {
      name?: string;
      content?: string;
      tags?: Record<string, unknown>;
    };
    const { name, content: newContent, tags: inputTags } = body;

    const records = await db.select().from(files).where(and(eq(files.id, fileId), isNull(files.deletedAt)));
    if (records.length === 0) {
      return c.json(error('NOT_FOUND', 'File not found', 404), 404);
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

      const tagValues: Array<{
        id: string;
        fileId: string;
        dimension: string;
        value: string;
        confidence: string | null;
        createdAt: string;
      }> = [];

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

      if (tagValues.length > 0) {
        await db.insert(tags).values(tagValues);
      }
    }

    return c.json(success({
      id: fileId,
      updated_at: timestamp,
      version: updateData.version ?? existing.version,
    }));
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return c.json(error('FILE_UPDATE_ERROR', message, 500), 500);
  }
});

// ─── Delete File ────────────────────────────────────────────────────────────

router.delete('/:file_id', async (c) => {
  try {
    const fileId = c.req.param('file_id');
    const records = await db.select().from(files).where(and(eq(files.id, fileId), isNull(files.deletedAt)));
    if (records.length === 0) {
      return c.json(error('NOT_FOUND', 'File not found', 404), 404);
    }

    await db.update(files).set({ deletedAt: now() }).where(eq(files.id, fileId));

    return c.json(success({ id: fileId, deleted: true }));
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return c.json(error('FILE_DELETE_ERROR', message, 500), 500);
  }
});

// ─── Tag Management ─────────────────────────────────────────────────────────

router.post('/:file_id/tags', async (c) => {
  try {
    const fileId = c.req.param('file_id');
    const body = await c.req.json();
    const { dimension, value, confidence } = body as {
      dimension: string;
      value: string;
      confidence?: string;
    };

    if (!dimension || !value) {
      return c.json(error('INVALID_INPUT', 'dimension and value are required', 400), 400);
    }

    const tagValidationError = validateInput({ value });
    if (tagValidationError) {
      return c.json(error('INVALID_INPUT', tagValidationError, 400), 400);
    }

    // Verify file exists
    const records = await db.select().from(files).where(and(eq(files.id, fileId), isNull(files.deletedAt)));
    if (records.length === 0) {
      return c.json(error('NOT_FOUND', 'File not found', 404), 404);
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
        return c.json(error('DUPLICATE_TAG', 'Tag already exists for this file', 409), 409);
      }
      throw insertErr;
    }

    return c.json(success({
      id,
      file_id: fileId,
      dimension,
      value,
      confidence: confidence ?? null,
    }), 201);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return c.json(error('TAG_CREATE_ERROR', message, 500), 500);
  }
});

router.delete('/:file_id/tags/:dimension/:value', async (c) => {
  try {
    const fileId = c.req.param('file_id');
    const dimension = c.req.param('dimension');
    const value = c.req.param('value');

    await db.delete(tags).where(
      and(eq(tags.fileId, fileId), eq(tags.dimension, dimension), eq(tags.value, value))
    );

    return c.json(success({ file_id: fileId, dimension, value, deleted: true }));
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return c.json(error('TAG_DELETE_ERROR', message, 500), 500);
  }
});

// ─── Search ─────────────────────────────────────────────────────────────────

router.post('/search', async (c) => {
  try {
    const body = await c.req.json();
    const {
      query,
      tags: searchTags,
      must_have_all_tags = false,
      page = 1,
      page_size = 20,
    } = body as {
      query?: string;
      tags?: Record<string, string | string[]>;
      must_have_all_tags?: boolean;
      page?: number;
      page_size?: number;
    };

    // Use SearchEngine for search
    const searchResult = await searchEngine.search({
      query,
      limit: page_size,
      offset: (page - 1) * page_size,
    });

    return c.json(success(searchResult.results, { page, page_size, total: searchResult.total }));
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return c.json(error('SEARCH_ERROR', message, 500), 500);
  }
});

export default router;
