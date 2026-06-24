'use client';

import { useState, useEffect, useCallback } from 'react';
import { Globe, Search, RefreshCw, Star, Download, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api/client';
import { FileCard } from '@/components/app/FileCard';
import { TagFilter } from '@/components/app/TagFilter';
import type { FileItem, PublicSource } from '@/lib/api/client';

const TAG_DIMENSIONS = [
  { key: 'tool', label: '工具', values: ['claude-code', 'cursor', 'github-copilot', 'windsurf', 'aider', 'gemini-cli', 'codex', 'opencode', 'openclaw', 'trae', 'amp', 'kiro', 'replit', 'warp', 'kimi-code', 'coze', 'glm', 'doubao', 'tongyi-lingma', 'tiangong', 'qwen-code', 'deepseek-coder', 'spark-code', 'yuanbao'] },
  { key: 'role', label: '角色', values: ['agent', 'system-prompt', 'skill', 'rule', 'template', 'tool-def', 'workflow', 'persona', 'knowledge'] },
  { key: 'domain', label: '领域', values: ['engineering', 'frontend', 'backend', 'product', 'marketing', 'design', 'data', 'security', 'devops', 'general'] },
  { key: 'language', label: '语言', values: ['zh', 'en', 'ja', 'ko'] },
  { key: 'quality', label: '质量', values: ['official', 'verified', 'community', 'experimental'] },
  { key: 'source_type', label: '来源', values: ['public_repo', 'official_doc', 'community_submit', 'environment_scan', 'user_created', 'reverse_engineered'] },
];

export default function PublicLibraryPage() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [sources, setSources] = useState<PublicSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<Record<string, string[]>>({});
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [importingIds, setImportingIds] = useState<Set<string>>(new Set());

  const loadFiles = useCallback(async () => {
    try {
      setLoading(true);
      const tagParams: Record<string, string> = {};
      for (const [dim, vals] of Object.entries(selectedTags)) {
        if (vals.length > 0) tagParams[dim] = vals.join(',');
      }
      const res = await api.getFiles({
        page,
        page_size: pageSize,
        library: 'public',
        search: search || undefined,
        ...tagParams,
      });
      if (res.success && res.data) {
        setFiles(res.data);
        setTotal(res.meta?.total ?? 0);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, search, selectedTags]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  useEffect(() => {
    api.getPublicSources().then((res) => {
      if (res.success && res.data) setSources(res.data);
    });
  }, []);

  const syncSource = async (sourceId: string) => {
    setSyncingIds((prev) => new Set(prev).add(sourceId));
    try {
      await api.syncPublicSource(sourceId);
      // Refresh sources
      const res = await api.getPublicSources();
      if (res.success && res.data) setSources(res.data);
      loadFiles();
    } catch {
      // ignore
    } finally {
      setSyncingIds((prev) => {
        const next = new Set(prev);
        next.delete(sourceId);
        return next;
      });
    }
  };

  const toggleTag = (dimension: string, value: string) => {
    setSelectedTags((prev) => {
      const current = prev[dimension] || [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [dimension]: next };
    });
    setPage(1);
  };

  const clearTags = () => {
    setSelectedTags({});
    setPage(1);
  };

  const toggleFavorite = (fileId: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(fileId)) next.delete(fileId);
      else next.add(fileId);
      return next;
    });
  };

  const handleImport = async (file: FileItem) => {
    setImportingIds(prev => new Set(prev).add(file.id));
    try {
      // First fetch the full file detail to get content
      const detailRes = await api.getFile(file.id);
      const content = detailRes.success && detailRes.data ? detailRes.data.content : '';
      await api.createFile({
        name: file.name,
        content,
        format: 'markdown',
        license: file.license || 'MIT',
        tags: file.tags || {},
      });
      alert('导入成功！文件已添加到私有库');
    } catch (err) {
      alert('导入失败：' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setImportingIds(prev => {
        const next = new Set(prev);
        next.delete(file.id);
        return next;
      });
    }
  };

  const dimensions = TAG_DIMENSIONS;

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Globe className="size-6 text-green-400" />
        <h1 className="text-2xl font-bold">公共库</h1>
        <Badge variant="outline" className="bg-zinc-800 text-zinc-400 border-zinc-700">
          {total} 项
        </Badge>
      </div>

      {/* Public Sources */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg text-zinc-200">公共来源</CardTitle>
        </CardHeader>
        <CardContent>
          {sources.length === 0 ? (
            <div className="text-center py-6 text-zinc-500 text-sm">暂无公共来源</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {sources.map((source) => (
                <div
                  key={source.id}
                  className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-800 hover:border-zinc-600 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-medium text-zinc-200 truncate">{source.name}</h4>
                      <a
                        href={source.repo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="size-3" />
                        {source.repo_url}
                      </a>
                    </div>
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => syncSource(source.id)}
                      disabled={syncingIds.has(source.id)}
                      className="shrink-0"
                    >
                      {syncingIds.has(source.id) ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <RefreshCw className="size-3" />
                      )}
                      同步
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-xs text-zinc-500">
                    {source.repo_license && (
                      <Badge variant="outline" className="text-xs px-1 py-0 bg-zinc-800 text-zinc-400 border-zinc-700">
                        {source.repo_license}
                      </Badge>
                    )}
                    {source.last_sync_at && (
                      <span>同步于 {new Date(source.last_sync_at).toLocaleDateString('zh-CN')}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
        <Input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="搜索公共提示词..."
          className="pl-10 bg-zinc-900 border-zinc-800 text-zinc-100"
        />
      </div>

      <div className="flex gap-6">
        {/* Tag Filter Sidebar */}
        <div className="w-56 shrink-0">
          <TagFilter
            dimensions={dimensions}
            selectedTags={selectedTags}
            onToggleTag={toggleTag}
            onClearAll={clearTags}
          />
        </div>

        {/* File Grid */}
        <div className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-6 animate-spin text-zinc-500" />
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-16 text-zinc-500">暂无数据</div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {files.map((file) => (
                  <FileCard
                    key={file.id}
                    file={file}
                    extra={
                      <div className="flex gap-2 mt-2">
                        <Button
                          variant="outline"
                          size="xs"
                          className={`gap-1 ${favorites.has(file.id) ? 'text-yellow-400 border-yellow-500/30' : 'text-zinc-400'}`}
                          onClick={() => toggleFavorite(file.id)}
                        >
                          <Star className={`size-3 ${favorites.has(file.id) ? 'fill-yellow-400' : ''}`} /> 收藏
                        </Button>
                        <Button
                          variant="outline"
                          size="xs"
                          className="gap-1 text-zinc-400"
                          onClick={() => handleImport(file)}
                          disabled={importingIds.has(file.id)}
                        >
                          {importingIds.has(file.id) ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <Download className="size-3" />
                          )}
                          导入
                        </Button>
                      </div>
                    }
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    上一页
                  </Button>
                  <span className="text-sm text-zinc-400">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                  >
                    下一页
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
