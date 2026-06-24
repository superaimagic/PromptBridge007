'use client';

import { useState, useEffect, useCallback } from 'react';
import { ScanSearch, Play, CheckCircle2, XCircle, Loader2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api/client';
import type { ToolInfo, ScanResult } from '@/lib/api/client';

export default function ScanPage() {
  const [tools, setTools] = useState<ToolInfo[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getTools();
      if (res.success && res.data) {
        setTools(res.data);
      }
    } catch {
      setError('加载工具列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const startScan = async () => {
    try {
      setScanning(true);
      setScanResult(null);
      setError(null);
      const res = await api.startScan(undefined, 'full');
      if (res.success && res.data) {
        setScanResult(res.data);
        // Poll for completion
        pollScanStatus(res.data.scan_id);
      } else {
        setError(res.error?.message || '启动扫描失败');
      }
    } catch {
      setError('启动扫描失败');
    } finally {
      setScanning(false);
    }
  };

  const pollScanStatus = useCallback(async (scanId: string) => {
    const poll = async () => {
      try {
        const res = await api.getScanStatus(scanId);
        if (res.success && res.data) {
          setScanResult(res.data);
          if (res.data.status === 'running') {
            setTimeout(poll, 2000);
          } else {
            // Add to history
            setScanHistory((prev) => [res.data!, ...prev]);
          }
        }
      } catch {
        // Stop polling on error
      }
    };
    setTimeout(poll, 2000);
  }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ScanSearch className="size-6 text-blue-400" />
        <h1 className="text-2xl font-bold">环境扫描</h1>
      </div>

      {/* Scan Button & Progress */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg text-zinc-200">扫描本地环境</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-zinc-400">
            自动检测本地已安装的AI编程工具，扫描其提示词文件目录。
          </p>
          <Button onClick={startScan} disabled={scanning} className="gap-2">
            {scanning ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Play className="size-4" />
            )}
            {scanning ? '扫描中...' : '开始扫描'}
          </Button>

          {/* Scan Progress */}
          {scanResult && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-2">
                {scanResult.status === 'running' ? (
                  <Loader2 className="size-4 animate-spin text-blue-400" />
                ) : scanResult.status === 'completed' ? (
                  <CheckCircle2 className="size-4 text-green-400" />
                ) : (
                  <XCircle className="size-4 text-red-400" />
                )}
                <span className="text-sm text-zinc-300">
                  {scanResult.status === 'running'
                    ? '正在扫描...'
                    : scanResult.status === 'completed'
                    ? '扫描完成'
                    : '扫描失败'}
                </span>
              </div>

              {scanResult.status === 'running' && (
                <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                  <div className="bg-blue-500 h-2 rounded-full animate-pulse" style={{ width: '60%' }} />
                </div>
              )}

              {scanResult.status === 'completed' && (
                <div className="grid grid-cols-4 gap-3 text-center">
                  <div className="bg-zinc-800 rounded-lg p-3">
                    <div className="text-2xl font-bold text-zinc-100">{scanResult.files_found ?? 0}</div>
                    <div className="text-xs text-zinc-500">发现文件</div>
                  </div>
                  <div className="bg-zinc-800 rounded-lg p-3">
                    <div className="text-2xl font-bold text-green-400">{scanResult.files_imported ?? 0}</div>
                    <div className="text-xs text-zinc-500">已导入</div>
                  </div>
                  <div className="bg-zinc-800 rounded-lg p-3">
                    <div className="text-2xl font-bold text-yellow-400">{scanResult.files_updated ?? 0}</div>
                    <div className="text-xs text-zinc-500">已更新</div>
                  </div>
                  <div className="bg-zinc-800 rounded-lg p-3">
                    <div className="text-2xl font-bold text-zinc-500">{scanResult.files_skipped ?? 0}</div>
                    <div className="text-xs text-zinc-500">已跳过</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detected Tools */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg text-zinc-200">已检测工具</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-5 animate-spin text-zinc-500" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-400 text-sm">{error}</div>
          ) : tools.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-sm">暂无数据，请先执行扫描</div>
          ) : (
            <div className="space-y-2">
              {tools.map((tool) => (
                <div
                  key={tool.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
                >
                  <CheckCircle2 className="size-4 text-green-400 shrink-0" />
                  <span className="font-medium text-zinc-200">{tool.display_name}</span>
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      tool.category === 'international'
                        ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                        : 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                    }`}
                  >
                    {tool.category === 'international' ? '国际' : '国内'}
                  </Badge>
                  <span className="ml-auto text-xs text-zinc-500">
                    {tool.prompt_paths?.length ?? 0} 个提示词路径
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scan History */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg text-zinc-200">扫描历史</CardTitle>
        </CardHeader>
        <CardContent>
          {scanHistory.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-sm">暂无扫描记录</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500">
                    <th className="text-left py-2 px-3">扫描ID</th>
                    <th className="text-left py-2 px-3">类型</th>
                    <th className="text-left py-2 px-3">状态</th>
                    <th className="text-left py-2 px-3">发现</th>
                    <th className="text-left py-2 px-3">导入</th>
                    <th className="text-left py-2 px-3">时间</th>
                  </tr>
                </thead>
                <tbody>
                  {scanHistory.map((h) => (
                    <tr key={h.scan_id} className="border-b border-zinc-800/50">
                      <td className="py-2 px-3 font-mono text-xs text-zinc-400">{h.scan_id}</td>
                      <td className="py-2 px-3">
                        <Badge variant="outline" className="text-xs bg-zinc-800 text-zinc-400 border-zinc-700">
                          {h.status === 'completed' ? '全量' : '增量'}
                        </Badge>
                      </td>
                      <td className="py-2 px-3">
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            h.status === 'completed'
                              ? 'bg-green-500/20 text-green-400 border-green-500/30'
                              : h.status === 'failed'
                              ? 'bg-red-500/20 text-red-400 border-red-500/30'
                              : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                          }`}
                        >
                          {h.status === 'completed' ? '完成' : h.status === 'failed' ? '失败' : '运行中'}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 text-zinc-300">{h.files_found ?? 0}</td>
                      <td className="py-2 px-3 text-green-400">{h.files_imported ?? 0}</td>
                      <td className="py-2 px-3 text-zinc-500">
                        <Clock className="inline size-3 mr-1" />
                        {h.started_at ? new Date(h.started_at).toLocaleString('zh-CN') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
