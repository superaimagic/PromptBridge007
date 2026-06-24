'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, ArrowUp, ArrowDown, Loader2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api/client';
import type { ToolInfo, DeploymentInfo } from '@/lib/api/client';

export default function SyncPage() {
  const [tools, setTools] = useState<ToolInfo[]>([]);
  const [deployments, setDeployments] = useState<DeploymentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncingTools, setSyncingTools] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [toolsRes, depRes] = await Promise.all([
        api.getTools(),
        api.getDeployments(),
      ]);
      if (toolsRes.success && toolsRes.data) setTools(toolsRes.data);
      if (depRes.success && depRes.data) setDeployments(depRes.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const syncTool = async (toolId: string, direction: 'to_tool' | 'from_tool') => {
    // Find a deployment for this tool to sync
    const dep = deployments.find((d) => d.tool_id === toolId);
    if (!dep) return;

    setSyncingTools((prev) => new Set(prev).add(toolId));
    try {
      await api.sync({
        direction,
        file_id: dep.file_id,
        tool_id: toolId,
      });
      loadData();
    } catch {
      // ignore
    } finally {
      setSyncingTools((prev) => {
        const next = new Set(prev);
        next.delete(toolId);
        return next;
      });
    }
  };

  const syncAll = async () => {
    setSyncingAll(true);
    try {
      // Sync all tools that have deployments
      for (const dep of deployments) {
        await api.sync({
          direction: 'to_tool',
          file_id: dep.file_id,
          tool_id: dep.tool_id,
        });
      }
      loadData();
    } catch {
      // ignore
    } finally {
      setSyncingAll(false);
    }
  };

  const getToolSyncStatus = (toolId: string) => {
    const toolDeps = deployments.filter((d) => d.tool_id === toolId);
    if (toolDeps.length === 0) return 'none';
    const hasFailed = toolDeps.some((d) => d.status === 'failed');
    const hasPending = toolDeps.some((d) => d.status === 'pending');
    if (hasFailed) return 'conflict';
    if (hasPending) return 'pending';
    return 'synced';
  };

  const getLastSyncTime = (toolId: string) => {
    const toolDeps = deployments.filter((d) => d.tool_id === toolId);
    if (toolDeps.length === 0) return null;
    return toolDeps.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0].updated_at;
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <RefreshCw className="size-6 text-cyan-400" />
          <h1 className="text-2xl font-bold">同步管理</h1>
        </div>
        <Button onClick={syncAll} disabled={syncingAll || tools.length === 0} className="gap-2">
          {syncingAll ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          同步全部
        </Button>
      </div>

      {/* Sync Status Overview */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg text-zinc-200">工具同步状态</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-5 animate-spin text-zinc-500" />
            </div>
          ) : tools.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-sm">暂无工具，请先执行环境扫描</div>
          ) : (
            <div className="space-y-2">
              {tools.map((tool) => {
                const status = getToolSyncStatus(tool.id);
                const lastSync = getLastSyncTime(tool.id);
                const isSyncing = syncingTools.has(tool.id);

                return (
                  <div
                    key={tool.id}
                    className="flex items-center gap-4 p-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-zinc-200">{tool.display_name}</span>
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            status === 'synced'
                              ? 'bg-green-500/20 text-green-400 border-green-500/30'
                              : status === 'conflict'
                              ? 'bg-red-500/20 text-red-400 border-red-500/30'
                              : status === 'pending'
                              ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                              : 'bg-zinc-800 text-zinc-500 border-zinc-700'
                          }`}
                        >
                          {status === 'synced' ? '已同步' : status === 'conflict' ? '冲突' : status === 'pending' ? '待同步' : '未部署'}
                        </Badge>
                      </div>
                      {lastSync && (
                        <div className="text-xs text-zinc-500 mt-0.5">
                          <Clock className="inline size-3 mr-1" />
                          上次同步: {new Date(lastSync).toLocaleString('zh-CN')}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => syncTool(tool.id, 'to_tool')}
                        disabled={isSyncing || status === 'none'}
                        className="gap-1"
                      >
                        {isSyncing ? <Loader2 className="size-3 animate-spin" /> : <ArrowUp className="size-3" />}
                        推送
                      </Button>
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => syncTool(tool.id, 'from_tool')}
                        disabled={isSyncing || status === 'none'}
                        className="gap-1"
                      >
                        {isSyncing ? <Loader2 className="size-3 animate-spin" /> : <ArrowDown className="size-3" />}
                        拉取
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync Log */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg text-zinc-200">同步日志</CardTitle>
        </CardHeader>
        <CardContent>
          {deployments.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-sm">暂无同步记录</div>
          ) : (
            <div className="space-y-2">
              {deployments.slice(0, 20).map((dep) => {
                const tool = tools.find((t) => t.id === dep.tool_id);
                return (
                  <div
                    key={dep.deploy_id}
                    className="flex items-center gap-3 p-2 rounded bg-zinc-800/30 text-sm"
                  >
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
                    <span className="text-zinc-300">{tool?.display_name || dep.tool_id}</span>
                    <span className="text-zinc-500">{dep.mode}</span>
                    <span className="text-zinc-600 ml-auto text-xs">
                      {new Date(dep.created_at).toLocaleString('zh-CN')}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
