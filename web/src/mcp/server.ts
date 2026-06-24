#!/usr/bin/env node

/**
 * PromptBridge007 MCP Server
 *
 * Provides 7 Tools and 4 Resources for interacting with the PromptBridge007
 * prompt library via the Model Context Protocol.
 *
 * Standalone:  npx tsx src/mcp/server.ts
 * Module:      import { server, startServer } from '@/lib/mcp/server';
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { db, ensureInitialized } from '../lib/db';
import { files, tags } from '../lib/db/schema';
import { toolRegistry } from '../lib/core/ToolRegistry';
import { formatMatrix, type PIFEntity } from '../lib/core/FormatMatrix';
import { scanEngine } from '../lib/core/ScanEngine';
import { deployEngine } from '../lib/core/DeployEngine';
import { syncEngine } from '../lib/core/SyncEngine';
import { searchEngine } from '../lib/core/SearchEngine';
import { eq, and, or, like, desc, inArray, isNull, sql } from 'drizzle-orm';

// ─── Server Instance ────────────────────────────────────────────────────────

const server = new McpServer({
  name: 'PromptBridge007',
  version: '0.1.0',
});

async function ensureDbReady() {
  await ensureInitialized();
}

// ─── Tool 1: search_prompts ─────────────────────────────────────────────────

server.tool(
  'search_prompts',
  'Search the prompt library by keyword, tags, or filters',
  {
    query: z.string().optional().describe('Search keyword for prompt name or content'),
    tool: z.string().optional().describe('Filter by tool ID (e.g., cursor, claude-code)'),
    domain: z.string().optional().describe('Filter by domain tag'),
    role: z.string().optional().describe('Filter by role tag'),
    language: z.string().optional().describe('Filter by language tag'),
    quality: z.string().optional().describe('Filter by quality tag'),
    limit: z.number().optional().describe('Maximum number of results (default: 10)'),
    include_content: z.boolean().optional().describe('Include full content in results (default: false)'),
    format: z.string().optional().describe('Convert content to this format before returning (e.g., to_cursor, to_claude_code)'),
  },
  async (params) => {
    await ensureDbReady();
    try {
      const conditions = [isNull(files.deletedAt)];

      if (params.query) {
        const escaped = params.query.replace(/%/g, '\\%').replace(/_/g, '\\_');
        const nameOrContent = or(
          like(files.name, `%${escaped}%`),
          like(files.content, `%${escaped}%`),
        );
        if (nameOrContent) conditions.push(nameOrContent);
      }

      // Tag-based filters
      const tagFilters: Array<{ dimension: string; value: string }> = [];
      if (params.tool) tagFilters.push({ dimension: 'tool', value: params.tool });
      if (params.domain) tagFilters.push({ dimension: 'domain', value: params.domain });
      if (params.role) tagFilters.push({ dimension: 'role', value: params.role });
      if (params.language) tagFilters.push({ dimension: 'language', value: params.language });
      if (params.quality) tagFilters.push({ dimension: 'quality', value: params.quality });

      let filteredFileIds: string[] | null = null;
      for (const tf of tagFilters) {
        const matchingTags = await db
          .select({ fileId: tags.fileId })
          .from(tags)
          .where(and(eq(tags.dimension, tf.dimension), eq(tags.value, tf.value)));
        const ids = matchingTags.map((t) => t.fileId);
        if (filteredFileIds === null) {
          filteredFileIds = ids;
        } else {
          filteredFileIds = filteredFileIds.filter((id) => ids.includes(id));
        }
      }

      if (filteredFileIds !== null) {
        if (filteredFileIds.length === 0) {
          return { content: [{ type: 'text' as const, text: JSON.stringify([]) }] };
        }
        conditions.push(inArray(files.id, filteredFileIds));
      }

      const limit = params.limit || 10;
      const includeContent = params.include_content ?? false;
      const targetFormat = params.format;

      // Always select content if format conversion is requested
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
        .where(and(...conditions))
        .limit(limit)
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
        return { content: [{ type: 'text' as const, text: JSON.stringify(convertedRows, null, 2) }] };
      }

      return { content: [{ type: 'text' as const, text: JSON.stringify(fileRows, null, 2) }] };
    } catch (err) {
      return {
        content: [
          { type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` },
        ],
        isError: true,
      };
    }
  },
);

// ─── Tool 2: get_prompt ─────────────────────────────────────────────────────

server.tool(
  'get_prompt',
  'Get full prompt content by ID',
  {
    id: z.string().describe('The prompt file ID'),
    format: z.string().optional().describe('Convert content to this format before returning (e.g., to_cursor, to_claude_code)'),
  },
  async (params) => {
    await ensureDbReady();
    try {
      const fileRows = await db
        .select()
        .from(files)
        .where(and(eq(files.id, params.id), isNull(files.deletedAt)))
        .limit(1);

      if (fileRows.length === 0) {
        return {
          content: [{ type: 'text' as const, text: `Prompt not found: ${params.id}` }],
          isError: true,
        };
      }

      const file = fileRows[0];
      const tagRows = await db.select().from(tags).where(eq(tags.fileId, params.id));

      let result: Record<string, unknown> = { ...file, tags: tagRows };

      // Apply format conversion if requested
      if (params.format) {
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
        try {
          const converted = formatMatrix.toFormat(pif, params.format);
          result = { ...result, content: converted, converted_format: params.format };
        } catch {
          // Return original content if conversion fails
        }
      }

      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      return {
        content: [
          { type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` },
        ],
        isError: true,
      };
    }
  },
);

// ─── Tool 3: deploy_prompt ──────────────────────────────────────────────────

server.tool(
  'deploy_prompt',
  'Deploy a prompt to a target AI tool',
  {
    file_id: z.string().describe('The prompt file ID to deploy'),
    tool_id: z.string().describe('The target tool ID (e.g., cursor, claude-code)'),
    mode: z.enum(['original', 'customized', 'incremental']).describe('Deploy mode'),
    custom_content: z
      .string()
      .optional()
      .describe('Custom content for customized/incremental mode'),
  },
  async (params) => {
    await ensureDbReady();
    try {
      const result = await deployEngine.deploy({
        fileId: params.file_id,
        toolId: params.tool_id,
        mode: params.mode,
        customContent: params.custom_content,
      });
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      return {
        content: [
          { type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` },
        ],
        isError: true,
      };
    }
  },
);

// ─── Tool 4: convert_format ─────────────────────────────────────────────────

server.tool(
  'convert_format',
  'Convert a prompt to a target format',
  {
    file_id: z.string().describe('The prompt file ID to convert'),
    target_format: z
      .string()
      .describe('Target format key (e.g., to_cursor, to_claude_code, to_kimi_code)'),
  },
  async (params) => {
    await ensureDbReady();
    try {
      const fileRows = await db
        .select()
        .from(files)
        .where(and(eq(files.id, params.file_id), isNull(files.deletedAt)))
        .limit(1);

      if (fileRows.length === 0) {
        return {
          content: [{ type: 'text' as const, text: `Prompt not found: ${params.file_id}` }],
          isError: true,
        };
      }

      const file = fileRows[0];
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

      const converted = formatMatrix.toFormat(pif, params.target_format);
      const result = {
        original_format: 'markdown',
        target_format: params.target_format,
        converted_content: converted,
      };
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      return {
        content: [
          { type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` },
        ],
        isError: true,
      };
    }
  },
);

// ─── Tool 5: scan_environment ───────────────────────────────────────────────

server.tool(
  'scan_environment',
  'Scan for installed AI tools on the current system',
  {
    tool_ids: z
      .array(z.string())
      .optional()
      .describe('Specific tool IDs to scan (default: all tools)'),
  },
  async (params) => {
    await ensureDbReady();
    try {
      const result = await scanEngine.scanEnvironment(params.tool_ids);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      return {
        content: [
          { type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` },
        ],
        isError: true,
      };
    }
  },
);

// ─── Tool 6: sync_tool ──────────────────────────────────────────────────────

server.tool(
  'sync_tool',
  'Sync prompts with a tool directory',
  {
    tool_id: z.string().describe('The tool ID to sync'),
    direction: z.enum(['to_tool', 'from_tool']).describe('Sync direction'),
  },
  async (params) => {
    await ensureDbReady();
    try {
      const result = await syncEngine.sync(params.tool_id, params.direction);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      return {
        content: [
          { type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` },
        ],
        isError: true,
      };
    }
  },
);

// ─── Tool 7: list_tools ─────────────────────────────────────────────────────

server.tool(
  'list_tools',
  'List all supported AI tools',
  {},
  async () => {
    try {
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(toolRegistry, null, 2) }],
      };
    } catch (err) {
      return {
        content: [
          { type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` },
        ],
        isError: true,
      };
    }
  },
);

// ─── Tool 8: suggest_similar ─────────────────────────────────────────────────

server.tool(
  'suggest_similar',
  'Suggest similar prompts based on shared tags',
  {
    id: z.string().describe('The prompt file ID to find similar prompts for'),
    limit: z.number().optional().describe('Maximum number of suggestions (default: 5)'),
  },
  async (params) => {
    await ensureDbReady();
    try {
      const results = await searchEngine.suggestSimilar(params.id, params.limit || 5);
      return { content: [{ type: 'text' as const, text: JSON.stringify(results, null, 2) }] };
    } catch (err) {
      return {
        content: [
          { type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` },
        ],
        isError: true,
      };
    }
  },
);

// ─── Resource 1: prompt-library://catalog ────────────────────────────────────

server.resource(
  'prompt-catalog',
  'prompt-library://catalog',
  async (uri) => {
    await ensureDbReady();
    const fileRows = await db
      .select({
        id: files.id,
        name: files.name,
        slug: files.slug,
        license: files.license,
        sourceType: files.sourceType,
        rating: files.rating,
      })
      .from(files)
      .where(isNull(files.deletedAt))
      .orderBy(desc(files.createdAt))
      .limit(100);
    return {
      contents: [{ uri: uri.href, text: JSON.stringify(fileRows, null, 2) }],
    };
  },
);

// ─── Resource 2: prompt-library://tools ──────────────────────────────────────

server.resource(
  'supported-tools',
  'prompt-library://tools',
  async (uri) => {
    return {
      contents: [{ uri: uri.href, text: JSON.stringify(toolRegistry, null, 2) }],
    };
  },
);

// ─── Resource 3: prompt-library://formats ────────────────────────────────────

server.resource(
  'format-matrix',
  'prompt-library://formats',
  async (uri) => {
    const formats = formatMatrix.getSupportedFormats();
    const sourceFormats = formatMatrix.getSupportedSourceFormats();
    return {
      contents: [
        {
          uri: uri.href,
          text: JSON.stringify({ targetFormats: formats, sourceFormats }, null, 2),
        },
      ],
    };
  },
);

// ─── Resource 4: prompt-library://stats ──────────────────────────────────────

server.resource(
  'library-stats',
  'prompt-library://stats',
  async (uri) => {
    await ensureDbReady();
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(files)
      .where(isNull(files.deletedAt));
    const totalPrompts = countResult[0]?.count ?? 0;
    const stats = {
      totalPrompts,
      totalTools: toolRegistry.length,
      internationalTools: toolRegistry.filter((t) => t.category === 'international').length,
      domesticTools: toolRegistry.filter((t) => t.category === 'domestic').length,
      supportedFormats: formatMatrix.getSupportedFormats().length,
    };
    return {
      contents: [{ uri: uri.href, text: JSON.stringify(stats, null, 2) }],
    };
  },
);

// ─── Export & Standalone ────────────────────────────────────────────────────

export { server };

export async function startServer(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('PromptBridge007 MCP Server running on stdio');
}

// Auto-start when run directly via `npx tsx src/mcp/server.ts`
const isDirectRun = process.argv[1]?.replace(/\\/g, '/').includes('mcp/server');
if (isDirectRun) {
  startServer().catch(console.error);
}
