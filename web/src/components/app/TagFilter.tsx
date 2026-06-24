'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DIMENSION_COLORS, DIMENSION_LABELS } from './TagBadges';

interface TagDimension {
  key: string;
  label: string;
  values: string[];
}

interface TagFilterProps {
  dimensions: TagDimension[];
  selectedTags: Record<string, string[]>;
  onToggleTag: (dimension: string, value: string) => void;
  onClearAll?: () => void;
}

export function TagFilter({ dimensions, selectedTags, onToggleTag, onClearAll }: TagFilterProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const totalSelected = Object.values(selectedTags).reduce((sum, arr) => sum + arr.length, 0);

  const toggleCollapse = (key: string) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-zinc-300">标签筛选</span>
        {totalSelected > 0 && (
          <Button variant="ghost" size="xs" onClick={onClearAll} className="text-zinc-500">
            清除 ({totalSelected})
          </Button>
        )}
      </div>

      {dimensions.map((dim) => {
        const isCollapsed = collapsed[dim.key];
        const selected = selectedTags[dim.key] || [];
        const colorClass = DIMENSION_COLORS[dim.key] || DIMENSION_COLORS.custom;

        return (
          <div key={dim.key} className="border border-zinc-800 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => toggleCollapse(dim.key)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800/50 transition-colors"
            >
              {isCollapsed ? (
                <ChevronRight className="size-3.5 shrink-0" />
              ) : (
                <ChevronDown className="size-3.5 shrink-0" />
              )}
              <span className="font-medium">{dim.label || DIMENSION_LABELS[dim.key] || dim.key}</span>
              {selected.length > 0 && (
                <Badge variant="outline" className={`text-xs px-1 py-0 ml-auto ${colorClass}`}>
                  {selected.length}
                </Badge>
              )}
            </button>

            {!isCollapsed && dim.values.length > 0 && (
              <div className="px-3 pb-2 flex flex-wrap gap-1">
                {dim.values.map((val) => {
                  const isSelected = selected.includes(val);
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => onToggleTag(dim.key, val)}
                      className={`text-xs px-2 py-0.5 rounded-md border transition-colors ${
                        isSelected
                          ? colorClass
                          : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-600'
                      }`}
                    >
                      {val}
                      {isSelected && <X className="inline size-3 ml-0.5" />}
                    </button>
                  );
                })}
              </div>
            )}

            {!isCollapsed && dim.values.length === 0 && (
              <div className="px-3 pb-2 text-xs text-zinc-600">暂无数据</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
