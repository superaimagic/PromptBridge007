'use client';

import { Badge } from '@/components/ui/badge';
import type { FileTags } from '@/lib/api/client';

const DIMENSION_COLORS: Record<string, string> = {
  tool: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  role: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  domain: 'bg-green-500/20 text-green-400 border-green-500/30',
  language: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  quality: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  source_type: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  custom: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
};

const DIMENSION_LABELS: Record<string, string> = {
  tool: '工具',
  role: '角色',
  domain: '领域',
  language: '语言',
  quality: '质量',
  source_type: '来源',
  custom: '自定义',
};

interface TagBadgesProps {
  tags: FileTags;
  maxDisplay?: number;
  onRemove?: (dimension: string, value: string) => void;
}

export function TagBadges({ tags, maxDisplay, onRemove }: TagBadgesProps) {
  const allTags: Array<{ dimension: string; value: string; confidence?: string | null }> = [];

  for (const [dimension, value] of Object.entries(tags)) {
    if (value === undefined || value === null) continue;
    if (dimension === 'tool' && Array.isArray(value)) {
      for (const entry of value) {
        if (typeof entry === 'object' && entry !== null && 'value' in entry) {
          allTags.push({ dimension, value: String(entry.value), confidence: entry.confidence });
        }
      }
    } else if (Array.isArray(value)) {
      for (const v of value) {
        allTags.push({ dimension, value: String(v) });
      }
    } else {
      allTags.push({ dimension, value: String(value) });
    }
  }

  const displayed = maxDisplay ? allTags.slice(0, maxDisplay) : allTags;
  const remaining = maxDisplay ? allTags.length - displayed.length : 0;

  return (
    <div className="flex flex-wrap gap-1">
      {displayed.map((tag, i) => (
        <Badge
          key={`${tag.dimension}-${tag.value}-${i}`}
          variant="outline"
          className={`text-xs px-1.5 py-0 ${DIMENSION_COLORS[tag.dimension] || DIMENSION_COLORS.custom}`}
        >
          {DIMENSION_LABELS[tag.dimension] && (
            <span className="opacity-60 mr-0.5">{DIMENSION_LABELS[tag.dimension]}:</span>
          )}
          {tag.value}
          {tag.confidence && tag.confidence !== 'full' && (
            <span className="opacity-50 ml-0.5">({tag.confidence})</span>
          )}
          {onRemove && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onRemove(tag.dimension, tag.value); }}
              className="ml-1 opacity-50 hover:opacity-100"
            >
              ×
            </button>
          )}
        </Badge>
      ))}
      {remaining > 0 && (
        <Badge variant="outline" className="text-xs px-1.5 py-0 bg-zinc-500/20 text-zinc-400 border-zinc-500/30">
          +{remaining}
        </Badge>
      )}
    </div>
  );
}

export { DIMENSION_COLORS, DIMENSION_LABELS };
