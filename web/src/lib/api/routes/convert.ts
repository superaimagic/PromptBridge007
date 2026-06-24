import { Hono } from 'hono';
import { eq, and, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { files } from '@/lib/db/schema';
import { success, error } from '../types';
import { formatMatrix, type PIFEntity } from '@/lib/core/FormatMatrix';

const router = new Hono();

router.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { file_id, target_format } = body as {
      file_id: string;
      target_format: string;
    };

    if (!file_id || !target_format) {
      return c.json(error('INVALID_INPUT', 'file_id and target_format are required', 400), 400);
    }

    const records = await db.select().from(files).where(and(eq(files.id, file_id), isNull(files.deletedAt)));
    if (records.length === 0) {
      return c.json(error('NOT_FOUND', 'File not found', 404), 404);
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

    return c.json(success({
      converted_content: convertedContent,
      format: outputFormat,
      preview: true,
    }));
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return c.json(error('CONVERT_ERROR', message, 500), 500);
  }
});

export default router;
