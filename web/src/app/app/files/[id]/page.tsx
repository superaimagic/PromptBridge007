'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Edit, Rocket, ExternalLink, Loader2, Trash2, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { api } from '@/lib/api/client';
import { DIMENSION_LABELS, DIMENSION_COLORS } from '@/components/app/TagBadges';
import type { FileDetail, ToolInfo } from '@/lib/api/client';

export default function FileDetailPage() {
  const params = useParams();
  const router = useRouter();
  const fileId = params.id as string;

  const [file, setFile] = useState<FileDetail | null>(null);
  const [tools, setTools] = useState<ToolInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Deploy dialog
  const [deployOpen, setDeployOpen] = useState(false);
  const [selectedTool, setSelectedTool] = useState<string>('');
  const [deployMode, setDeployMode] = useState<'original' | 'customized' | 'incremental'>('original');
  const [deploying, setDeploying] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [fileRes, toolsRes] = await Promise.all([
        api.getFile(fileId),
        api.getTools(),
      ]);
      if (fileRes.success && fileRes.data) {
        setFile(fileRes.data);
      } else {
        setError(fileRes.error?.message || '文件不存在');
      }
      if (toolsRes.success && toolsRes.data) {
        setTools(toolsRes.data);
      }
    } catch {
      setError('加载文件详情失败');
    } finally {
      setLoading(false);
    }
  }, [fileId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDeploy = async () => {
    if (!selectedTool) return;
    try {
      setDeploying(true);
      const res = await api.deploy({
        file_id: fileId,
        tool_id: selectedTool,
        mode: deployMode,
      });
      if (res.success) {
        setDeployOpen(false);
        loadData();
      }
    } catch {
      // ignore
    } finally {
      setDeploying(false);
    }
  };

  const handleRemoveTag = async (dimension: string, value: string) => {
    try {
      await api.removeTag(fileId, dimension, value);
      loadData();
    } catch {
      // ignore
    }
  };

  const handleDelete = async () => {
    if (!confirm('确定要删除此文件吗？删除后可从回收站恢复。')) return;
    try {
      await api.deleteFile(fileId);
      router.push('/app/library/private');
    } catch (err) {
      alert('删除失败：' + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Add tag state
  const [addingTagDimension, setAddingTagDimension] = useState<string | null>(null);
  const [newTagValue, setNewTagValue] = useState('');
  const [newTagConfidence, setNewTagConfidence] = useState('full');

  const handleAddTag = async () => {
    if (!newTagValue || !addingTagDimension) return;
    try {
      await api.addTag(fileId, addingTagDimension, newTagValue, addingTagDimension === 'tool' ? newTagConfidence : undefined);
      loadData();
      setAddingTagDimension(null);
      setNewTagValue('');
      setNewTagConfidence('full');
    } catch (err) {
      alert('添加标签失败：' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const cancelAddTag = () => {
    setAddingTagDimension(null);
    setNewTagValue('');
    setNewTagConfidence('full');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="size-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (error || !file) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-red-400">{error || '文件不存在'}</p>
        <Button variant="outline" onClick={() => router.back()}>
          返回
        </Button>
      </div>
    );
  }

  const tagDimensions = ['tool', 'role', 'domain', 'language', 'quality', 'source_type', 'custom'];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Back button & Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-zinc-400">
          <ArrowLeft className="size-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold truncate">{file.name}</h1>
          <p className="text-sm text-zinc-500 font-mono">{file.slug}</p>
        </div>
        <Badge variant="outline" className="bg-zinc-800 text-zinc-400 border-zinc-700">
          {file.license}
        </Badge>
        {file.source.type === 'public_repo' && (
          <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">
            公共库
          </Badge>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => router.push(`/app/files/${fileId}/edit`)} className="gap-2">
          <Edit className="size-4" /> 编辑
        </Button>
        <Button variant="outline" onClick={handleDelete} className="gap-2 text-red-400 border-red-500/30 hover:bg-red-500/10 hover:text-red-300">
          <Trash2 className="size-4" /> 删除
        </Button>
        <Dialog open={deployOpen} onOpenChange={setDeployOpen}>
          <DialogTrigger
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/80 px-2.5 h-8 text-sm font-medium"
          >
            <Rocket className="size-4" /> 部署
          </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-zinc-800">
            <DialogHeader>
              <DialogTitle className="text-zinc-100">部署到工具</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-zinc-300 mb-2 block">选择目标工具</label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {tools.map((tool) => (
                    <button
                      key={tool.id}
                      type="button"
                      onClick={() => setSelectedTool(tool.id)}
                      className={`p-2 rounded-lg border text-sm text-left transition-colors ${
                        selectedTool === tool.id
                          ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                          : 'border-zinc-800 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600'
                      }`}
                    >
                      {tool.display_name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm text-zinc-300 mb-2 block">部署模式</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['original', 'customized', 'incremental'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setDeployMode(mode)}
                      className={`p-2 rounded-lg border text-sm transition-colors ${
                        deployMode === mode
                          ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                          : 'border-zinc-800 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600'
                      }`}
                    >
                      {mode === 'original' ? '原样部署' : mode === 'customized' ? '自定义' : '增量'}
                    </button>
                  ))}
                </div>
              </div>
              <Button onClick={handleDeploy} disabled={!selectedTool || deploying} className="w-full">
                {deploying ? <Loader2 className="size-4 animate-spin mr-2" /> : <Rocket className="size-4 mr-2" />}
                确认部署
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Tags Panel */}
        <div className="space-y-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-lg text-zinc-200">标签</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {tagDimensions.map((dim) => {
                const dimTags = file.tags[dim];
                const colorClass = DIMENSION_COLORS[dim] || DIMENSION_COLORS.custom;
                const label = DIMENSION_LABELS[dim] || dim;
                const values = dimTags
                  ? Array.isArray(dimTags)
                    ? dimTags.map((t: { value: string; confidence?: string | null }) => t.value)
                    : [String(dimTags)]
                  : [];

                return (
                  <div key={dim}>
                    <div className="flex items-center gap-1 mb-1">
                      <span className="text-xs text-zinc-500">{label}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setAddingTagDimension(addingTagDimension === dim ? null : dim);
                          setNewTagValue('');
                          setNewTagConfidence('full');
                        }}
                        className="text-zinc-600 hover:text-zinc-300 transition-colors"
                      >
                        <Plus className="size-3" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {values.map((val: string) => (
                        <Badge
                          key={val}
                          variant="outline"
                          className={`text-xs px-1.5 py-0 ${colorClass}`}
                        >
                          {val}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(dim, val)}
                            className="ml-1 opacity-50 hover:opacity-100"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                    {addingTagDimension === dim && (
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="text"
                          value={newTagValue}
                          onChange={(e) => setNewTagValue(e.target.value)}
                          placeholder="标签值"
                          className="bg-zinc-800 border border-zinc-700 text-zinc-100 rounded px-2 py-1 text-xs flex-1"
                          onKeyDown={(e) => { if (e.key === 'Enter') handleAddTag(); }}
                        />
                        {dim === 'tool' && (
                          <select
                            value={newTagConfidence}
                            onChange={(e) => setNewTagConfidence(e.target.value)}
                            className="bg-zinc-800 border border-zinc-700 text-zinc-100 rounded px-1 py-1 text-xs"
                          >
                            <option value="full">full</option>
                            <option value="partial">partial</option>
                            <option value="experimental">experimental</option>
                            <option value="incompatible">incompatible</option>
                          </select>
                        )}
                        <Button variant="outline" size="xs" onClick={handleAddTag} disabled={!newTagValue}>
                          确定
                        </Button>
                        <Button variant="ghost" size="xs" onClick={cancelAddTag} className="text-zinc-500">
                          取消
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Source Info */}
          {file.source.type === 'public_repo' && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-lg text-zinc-200">来源信息</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {file.source.repo_name && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">仓库</span>
                    <span className="text-zinc-300">{file.source.repo_name}</span>
                  </div>
                )}
                {file.source.repo_url && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">链接</span>
                    <a
                      href={file.source.repo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="size-3" /> 查看
                    </a>
                  </div>
                )}
                {file.source.author && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">作者</span>
                    <span className="text-zinc-300">{file.source.author}</span>
                  </div>
                )}
                {file.source.file_path && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">路径</span>
                    <span className="text-zinc-300 font-mono text-xs">{file.source.file_path}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Content Preview */}
        <div className="lg:col-span-2">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-lg text-zinc-200">内容预览</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-zinc-950 rounded-lg p-4 text-sm text-zinc-300 font-mono overflow-x-auto whitespace-pre-wrap max-h-[600px] overflow-y-auto">
                {file.content}
              </pre>
            </CardContent>
          </Card>

          {/* Deployment Status */}
          {file.deployments && file.deployments.length > 0 && (
            <Card className="bg-zinc-900 border-zinc-800 mt-4">
              <CardHeader>
                <CardTitle className="text-lg text-zinc-200">部署状态</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {file.deployments.map((dep, i) => {
                    const tool = tools.find((t) => t.id === dep.tool_id);
                    return (
                      <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-zinc-800/50">
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            dep.status === 'success'
                              ? 'bg-green-500/20 text-green-400 border-green-500/30'
                              : dep.status === 'failed'
                              ? 'bg-red-500/20 text-red-400 border-red-500/30'
                              : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                          }`}
                        >
                          {dep.status === 'success' ? '成功' : dep.status === 'failed' ? '失败' : '待处理'}
                        </Badge>
                        <span className="text-sm text-zinc-300">{tool?.display_name || dep.tool_id}</span>
                        <span className="text-xs text-zinc-500 ml-auto">
                          {new Date(dep.deployed_at).toLocaleString('zh-CN')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
