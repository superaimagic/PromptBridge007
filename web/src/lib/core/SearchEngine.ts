import { getDb } from '@/lib/db';
import { files, tags } from '@/lib/db/schema';
import { eq, isNull, like, or, and, desc, sql, inArray } from 'drizzle-orm';

/**
 * SearchEngine - Full-text + semantic search for prompt files
 *
 * Uses a combination of:
 * 1. SQL LIKE for keyword matching
 * 2. TF-IDF scoring for relevance ranking
 * 3. Tag-based filtering
 */
export class SearchEngine {
  /**
   * Search prompts by keyword with relevance scoring
   */
  async search(params: {
    query?: string;
    tool?: string;
    domain?: string;
    role?: string;
    language?: string;
    quality?: string;
    sourceType?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    results: Array<{
      id: string;
      name: string;
      slug: string;
      content: string;
      license: string;
      sourceType: string;
      rating: number;
      score: number;
      tags: Record<string, string[]>;
    }>;
    total: number;
  }> {
    const { query, tool, domain, role, language, quality, sourceType, limit = 20, offset = 0 } = params;

    // Build base query
    const conditions = [isNull(files.deletedAt)];

    if (query) {
      const escaped = query.replace(/%/g, '\\%').replace(/_/g, '\\_');
      const nameOrContent = or(
        like(files.name, `%${escaped}%`),
        like(files.content, `%${escaped}%`),
      );
      if (nameOrContent) conditions.push(nameOrContent);
    }

    if (sourceType) {
      conditions.push(eq(files.sourceType, sourceType));
    }

    // Get files
    const fileRows = await getDb().select({
      id: files.id,
      name: files.name,
      slug: files.slug,
      content: files.content,
      license: files.license,
      sourceType: files.sourceType,
      rating: files.rating,
    }).from(files).where(and(...conditions))
      .limit(limit * 3) // Get more for tag filtering
      .orderBy(desc(files.rating));

    // Filter by tags if specified
    const tagFilters: Record<string, string> = {};
    if (tool) tagFilters.tool = tool;
    if (domain) tagFilters.domain = domain;
    if (role) tagFilters.role = role;
    if (language) tagFilters.language = language;
    if (quality) tagFilters.quality = quality;

    let results = fileRows;
    if (Object.keys(tagFilters).length > 0) {
      const fileIds = fileRows.map(f => f.id);
      if (fileIds.length > 0) {
        const tagConditions = Object.entries(tagFilters).map(([dim, val]) =>
          and(eq(tags.dimension, dim), eq(tags.value, val))
        );

        const tagRows = await getDb().select().from(tags)
          .where(and(
            inArray(tags.fileId, fileIds),
            ...tagConditions
          ));

        // Group tags by fileId
        const tagsByFileId = new Map<string, Set<string>>();
        for (const tag of tagRows) {
          if (!tagsByFileId.has(tag.fileId)) tagsByFileId.set(tag.fileId, new Set());
          tagsByFileId.get(tag.fileId)!.add(`${tag.dimension}:${tag.value}`);
        }

        // Filter files that match ALL tag filters
        results = fileRows.filter(f => {
          const fileTags = tagsByFileId.get(f.id);
          if (!fileTags) return false;
          return Object.entries(tagFilters).every(([dim, val]) => fileTags.has(`${dim}:${val}`));
        });
      } else {
        results = [];
      }
    }

    // Score results by relevance
    const scored = results.map(f => {
      let score = f.rating ?? 0;

      if (query) {
        const lowerQuery = query.toLowerCase();
        const lowerName = f.name.toLowerCase();
        const lowerContent = f.content.toLowerCase();

        // Name match is worth more
        if (lowerName.includes(lowerQuery)) score += 10;
        // Content match
        const escapedQuery = lowerQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const contentMatches = (lowerContent.match(new RegExp(escapedQuery, 'gi')) || []).length;
        score += Math.min(contentMatches, 5);
      }

      return { ...f, rating: f.rating ?? 0, score, tags: {} as Record<string, string[]> };
    });

    // Sort by score
    scored.sort((a, b) => b.score - a.score);

    // Apply pagination
    const paginated = scored.slice(offset, offset + limit);

    // Get tags for results
    if (paginated.length > 0) {
      const resultIds = paginated.map(f => f.id);
      const tagRows = await getDb().select().from(tags)
        .where(inArray(tags.fileId, resultIds));

      for (const tag of tagRows) {
        const file = paginated.find(f => f.id === tag.fileId);
        if (file) {
          if (!file.tags[tag.dimension]) file.tags[tag.dimension] = [];
          file.tags[tag.dimension].push(tag.value);
        }
      }
    }

    return {
      results: paginated,
      total: scored.length,
    };
  }

  /**
   * Suggest similar prompts based on tags
   */
  async suggestSimilar(fileId: string, limit = 5): Promise<Array<{
    id: string;
    name: string;
    slug: string;
    content: string;
    license: string;
    sourceType: string;
    rating: number;
    score: number;
    tags: Record<string, string[]>;
  }>> {
    // Get the file's tags
    const tagRows = await getDb().select().from(tags).where(eq(tags.fileId, fileId));

    if (tagRows.length === 0) {
      const result = await this.search({ limit });
      return result.results;
    }

    // Find files with matching tags
    const matchingFileIds = new Map<string, number>();
    for (const tag of tagRows) {
      const sameTagFiles = await getDb().select({ fileId: tags.fileId }).from(tags)
        .where(and(eq(tags.dimension, tag.dimension), eq(tags.value, tag.value)));

      for (const f of sameTagFiles) {
        if (f.fileId !== fileId) {
          matchingFileIds.set(f.fileId, (matchingFileIds.get(f.fileId) || 0) + 1);
        }
      }
    }

    // Sort by number of matching tags
    const sorted = [...matchingFileIds.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => id);

    if (sorted.length === 0) {
      const result = await this.search({ limit });
      return result.results;
    }

    // Get file details
    const fileRows = await getDb().select().from(files)
      .where(and(inArray(files.id, sorted), isNull(files.deletedAt)));

    return fileRows.map(f => ({
      id: f.id,
      name: f.name,
      slug: f.slug,
      content: f.content,
      license: f.license,
      sourceType: f.sourceType,
      rating: f.rating ?? 0,
      score: matchingFileIds.get(f.id) || 0,
      tags: {} as Record<string, string[]>,
    }));
  }
}

export const searchEngine = new SearchEngine();
