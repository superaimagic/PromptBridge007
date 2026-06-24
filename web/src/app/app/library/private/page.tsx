'use client';

import { useState, useEffect, useCallback } from 'react';
import { FolderOpen, Search, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api/client';
import { FileCard } from '@/components/app/FileCard';
import { TagFilter } from '@/components/app/TagFilter';
import type { FileItem } from '@/lib/api/client';

const TAG_DIMENSIONS = [
  { key: 'tool', label: '工具', values: ['claude-code', 'cursor', 'github-copilot', 'windsurf', 'aider', 'gemini-cli', 'codex', 'opencode', 'openclaw', 'trae', 'amp', 'kiro', 'replit', 'warp', 'kimi-code', 'coze', 'glm', 'doubao', 'tongyi-lingma', 'tiangong', 'qwen-code', 'deepseek-coder', 'spark-code', 'yuanbao'] },
  { key: 'role', label: '角色', values: ['agent', 'system-prompt', 'skill', 'rule', 'template', 'tool-def', 'workflow', 'persona', 'knowledge'] },
  { key: 'domain', label: '领域', values: ['engineering', 'frontend', 'backend', 'product', 'marketing', 'design', 'data', 'security', 'devops', 'general'] },
  { key: 'language', label: '语言', values: ['zh', 'en', 'ja', 'ko'] },
  { key: 'quality', label: '质量', values: ['official', 'verified', 'community', 'experimental'] },
  { key: 'source_type', label: '来源', values: ['public_repo', 'official_doc', 'community_submit', 'environment_scan', 'user_created', 'reverse_engineered'] },
];

export default function PrivateLibraryPage() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<Record<string, string[]>>({});
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newLicense, setNewLicense] = useState('MIT');
  const [creating, setCreating] = useState(false);

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
        library: 'private',
        search: search || undefined,
        ...tagParams,
      });
      if (res.success && res.data) {
        setFiles(res.data);
        setTotal(res.meta?.total ?? 0);
      }
    } catch {
      setError('加载文件列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, search, selectedTags]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

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

  const handleCreate = async () => {
    if (!newName.trim() || !newContent.trim()) return;
    try {
      setCreating(true);
      const res = await api.createFile({
        name: newName,
        content: newContent,
        format: 'markdown',
        license: newLicense,
      });
      if (res.success) {
        setCreateOpen(false);
        setNewName('');
        setNewContent('');
        loadFiles();
      }
    } catch {
      // ignore
    } finally {
      setCreating(false);
    }
  };

  const dimensions = TAG_DIMENSIONS;

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FolderOpen className="size-6 text-purple-400" />
          <h1 className="text-2xl font-bold">私有库</h1>
          <Badge variant="outline" className="bg-zinc-800 text-zinc-400 border-zinc-700">
            {total} 项
          </Badge>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/80 px-2.5 h-8 text-sm font-medium"
          >
            <Plus className="size-4" />
            新建提示词
          </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-zinc-800">
            <DialogHeader>
              <DialogTitle className="text-zinc-100">新建提示词</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-zinc-300">名称</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="输入提示词名称"
                  className="bg-zinc-800 border-zinc-700 text-zinc-100 mt-1"
                />
              </div>
              <div>
                <Label className="text-zinc-300">内容</Label>
                <Textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="输入提示词内容（Markdown格式）"
                  rows={10}
                  className="bg-zinc-800 border-zinc-700 text-zinc-100 mt-1 font-mono text-sm"
                />
              </div>
              <div>
                <Label className="text-zinc-300">许可证</Label>
                <Input
                  value={newLicense}
                  onChange={(e) => setNewLicense(e.target.value)}
                  placeholder="MIT"
                  className="bg-zinc-800 border-zinc-700 text-zinc-100 mt-1"
                />
              </div>
              <Button onClick={handleCreate} disabled={creating || !newName.trim() || !newContent.trim()} className="w-full">
                {creating ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                创建
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
        <Input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="搜索提示词..."
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
          ) : error ? (
            <div className="text-center py-16 text-red-400">{error}</div>
          ) : files.length === 0 ? (
            <div className="text-center py-16 text-zinc-500">暂无数据</div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {files.map((file) => (
                  <FileCard key={file.id} file={file} />
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
