import { Hono } from 'hono';
import { eq, and, or, like, desc, isNull } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { files, tags } from '@/lib/db/schema';
import { scanEngine } from '@/lib/core/ScanEngine';
import { deployEngine } from '@/lib/core/DeployEngine';
import { syncEngine } from '@/lib/core/SyncEngine';
import { toolRegistry } from '@/lib/core/ToolRegistry';
import { formatMatrix, type PIFEntity } from '@/lib/core/FormatMatrix';
import { searchEngine } from '@/lib/core/SearchEngine';

const router = new Hono();

router.get('/tools', async (c) => {
  return c.json({
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
});

router.post('/execute', async (c) => {
  const body = await c.req.json();
  const { tool, arguments: args = {} } = body as { tool: string; arguments?: Record<string, unknown> };

  try {
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
        const fileRows = await getDb()
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
          return c.json(
            { success: false, error: { code: 'MISSING_PARAM', message: 'id is required' } },
            400,
          );
        const fileRows = await getDb()
          .select()
          .from(files)
          .where(and(eq(files.id, args.id as string), isNull(files.deletedAt)))
          .limit(1);
        if (fileRows.length === 0)
          return c.json(
            { success: false, error: { code: 'NOT_FOUND', message: `Prompt not found: ${args.id}` } },
            404,
          );
        const tagRows = await getDb().select().from(tags).where(eq(tags.fileId, args.id as string));
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
          return c.json(
            {
              success: false,
              error: { code: 'MISSING_PARAM', message: 'file_id and tool_id are required' },
            },
            400,
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
          return c.json(
            {
              success: false,
              error: { code: 'MISSING_PARAM', message: 'file_id and target_format are required' },
            },
            400,
          );
        const fileRows = await getDb()
          .select()
          .from(files)
          .where(and(eq(files.id, args.file_id as string), isNull(files.deletedAt)))
          .limit(1);
        if (fileRows.length === 0)
          return c.json(
            {
              success: false,
              error: { code: 'NOT_FOUND', message: `Prompt not found: ${args.file_id}` },
            },
            404,
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
          return c.json(
            {
              success: false,
              error: { code: 'MISSING_PARAM', message: 'tool_id and direction are required' },
            },
            400,
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
          return c.json(
            { success: false, error: { code: 'MISSING_PARAM', message: 'id is required' } },
            400,
          );
        result = await searchEngine.suggestSimilar(
          args.id as string,
          (args.limit as number) || 5,
        );
        break;
      }
      default:
        return c.json(
          { success: false, error: { code: 'UNKNOWN_TOOL', message: `Unknown MCP tool: ${tool}` } },
          400,
        );
    }

    return c.json({ success: true, data: result });
  } catch (err) {
    return c.json(
      {
        success: false,
        error: {
          code: 'MCP_ERROR',
          message: err instanceof Error ? err.message : String(err),
        },
      },
      500,
    );
  }
});

export default router;
