'use client';

import { useState, useEffect, useCallback } from 'react';
import { Rocket, Search, ArrowRight, ArrowLeft, Check, Loader2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api/client';
import type { FileItem, ToolInfo, DeploymentInfo } from '@/lib/api/client';

type DeployMode = 'original' | 'customized' | 'incremental';

export default function DeployPage() {
  const [step, setStep] = useState(1);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [tools, setTools] = useState<ToolInfo[]>([]);
  const [deployments, setDeployments] = useState<DeploymentInfo[]>([]);
  const [loading, setLoading] = useState(true);

  // Wizard state
  const [selectedFileId, setSelectedFileId] = useState('');
  const [selectedToolId, setSelectedToolId] = useState('');
  const [deployMode, setDeployMode] = useState<DeployMode>('original');
  const [customContent, setCustomContent] = useState('');
  const [incrementalContent, setIncrementalContent] = useState('');
  const [fileSearch, setFileSearch] = useState('');
  const [deploying, setDeploying] = useState(false);

  // Original content for preview
  const [originalContent, setOriginalContent] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [filesRes, toolsRes, depRes] = await Promise.all([
        api.getFiles({ page: 1, page_size: 100 }),
        api.getTools(),
        api.getDeployments(),
      ]);
      if (filesRes.success && filesRes.data) setFiles(filesRes.data);
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

  const handleSelectFile = async (fileId: string) => {
    setSelectedFileId(fileId);
    const res = await api.getFile(fileId);
    if (res.success && res.data) {
      setOriginalContent(res.data.content);
    }
  };

  const handleDeploy = async () => {
    if (!selectedFileId || !selectedToolId) return;
    try {
      setDeploying(true);
      const payload: { file_id: string; tool_id: string; mode: DeployMode; custom_content?: string } = {
        file_id: selectedFileId,
        tool_id: selectedToolId,
        mode: deployMode,
      };
      if (deployMode === 'customized' && customContent) {
        payload.custom_content = customContent;
      } else if (deployMode === 'incremental' && incrementalContent) {
        payload.custom_content = incrementalContent;
      }
      const res = await api.deploy(payload);
      if (res.success) {
        setStep(1);
        setSelectedFileId('');
        setSelectedToolId('');
        setDeployMode('original');
        setCustomContent('');
        setIncrementalContent('');
        loadData();
      }
    } catch {
      // ignore
    } finally {
      setDeploying(false);
    }
  };

  const selectedFile = files.find((f) => f.id === selectedFileId);
  const selectedTool = tools.find((t) => t.id === selectedToolId);

  const filteredFiles = fileSearch
    ? files.filter((f) => f.name.toLowerCase().includes(fileSearch.toLowerCase()))
    : files;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Rocket className="size-6 text-orange-400" />
        <h1 className="text-2xl font-bold">部署中心</h1>
      </div>

      {/* Deploy Wizard */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <div className="flex items-center gap-4">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    step >= s ? 'bg-blue-500 text-white' : 'bg-zinc-800 text-zinc-500'
                  }`}
                >
                  {step > s ? <Check className="size-4" /> : s}
                </div>
                <span className={`text-sm ${step >= s ? 'text-zinc-200' : 'text-zinc-600'}`}>
                  {s === 1 ? '选择文件' : s === 2 ? '选择工具' : s === 3 ? '部署模式' : '确认'}
                </span>
                {s < 4 && <ArrowRight className="size-3 text-zinc-700" />}
              </div>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {/* Step 1: Select File */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
                <Input
                  value={fileSearch}
                  onChange={(e) => setFileSearch(e.target.value)}
                  placeholder="搜索文件..."
                  className="pl-10 bg-zinc-800 border-zinc-700 text-zinc-100"
                />
              </div>
              <div className="max-h-64 overflow-y-auto space-y-1">
                {filteredFiles.map((file) => (
                  <button
                    key={file.id}
                    type="button"
                    onClick={() => handleSelectFile(file.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                      selectedFileId === file.id
                        ? 'bg-blue-500/10 border border-blue-500/30 text-blue-400'
                        : 'bg-zinc-800/50 border border-transparent hover:bg-zinc-800 text-zinc-300'
                    }`}
                  >
                    <FileText className="size-4 shrink-0" />
                    <span className="truncate">{file.name}</span>
                    <Badge variant="outline" className="text-xs ml-auto bg-zinc-800 text-zinc-400 border-zinc-700">
                      {file.license}
                    </Badge>
                  </button>
                ))}
                {filteredFiles.length === 0 && (
                  <div className="text-center py-8 text-zinc-500 text-sm">暂无数据</div>
                )}
              </div>
              <div className="flex justify-end">
                <Button onClick={() => setStep(2)} disabled={!selectedFileId}>
                  下一步 <ArrowRight className="size-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Select Tool */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {tools.map((tool) => (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => setSelectedToolId(tool.id)}
                    className={`p-4 rounded-lg border text-left transition-colors ${
                      selectedToolId === tool.id
                        ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                        : 'bg-zinc-800/50 border-zinc-800 text-zinc-300 hover:border-zinc-600'
                    }`}
                  >
                    <div className="font-medium">{tool.display_name}</div>
                    <Badge
                      variant="outline"
                      className={`text-xs mt-1 ${
                        tool.category === 'international'
                          ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                          : 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                      }`}
                    >
                      {tool.category === 'international' ? '国际' : '国内'}
                    </Badge>
                  </button>
                ))}
              </div>
              {tools.length === 0 && (
                <div className="text-center py-8 text-zinc-500 text-sm">暂无工具，请先执行环境扫描</div>
              )}
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="size-4 mr-1" /> 上一步
                </Button>
                <Button onClick={() => setStep(3)} disabled={!selectedToolId}>
                  下一步 <ArrowRight className="size-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Deploy Mode */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {([
                  { mode: 'original' as const, title: '原样部署', desc: '直接使用原始内容部署' },
                  { mode: 'customized' as const, title: '自定义', desc: '基于原始内容自定义修改后部署' },
                  { mode: 'incremental' as const, title: '增量', desc: '在原始内容基础上追加指令' },
                ]).map((item) => (
                  <button
                    key={item.mode}
                    type="button"
                    onClick={() => setDeployMode(item.mode)}
                    className={`p-4 rounded-lg border text-left transition-colors ${
                      deployMode === item.mode
                        ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                        : 'bg-zinc-800/50 border-zinc-800 text-zinc-300 hover:border-zinc-600'
                    }`}
                  >
                    <div className="font-medium">{item.title}</div>
                    <div className="text-xs text-zinc-500 mt-1">{item.desc}</div>
                  </button>
                ))}
              </div>

              {deployMode === 'customized' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-zinc-400 mb-1 block">原始内容（只读）</label>
                    <pre className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-500 font-mono h-64 overflow-auto">
                      {originalContent}
                    </pre>
                  </div>
                  <div>
                    <label className="text-sm text-zinc-400 mb-1 block">自定义内容</label>
                    <Textarea
                      value={customContent}
                      onChange={(e) => setCustomContent(e.target.value)}
                      placeholder="输入自定义内容..."
                      className="bg-zinc-950 border-zinc-800 text-zinc-100 font-mono text-sm h-64 resize-none"
                    />
                  </div>
                </div>
              )}

              {deployMode === 'incremental' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-zinc-400 mb-1 block">原始内容</label>
                    <pre className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-500 font-mono h-32 overflow-auto">
                      {originalContent}
                    </pre>
                  </div>
                  <div>
                    <label className="text-sm text-zinc-400 mb-1 block">追加指令</label>
                    <Textarea
                      value={incrementalContent}
                      onChange={(e) => setIncrementalContent(e.target.value)}
                      placeholder="输入要追加的指令内容..."
                      className="bg-zinc-950 border-zinc-800 text-zinc-100 font-mono text-sm h-32 resize-none"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)}>
                  <ArrowLeft className="size-4 mr-1" /> 上一步
                </Button>
                <Button onClick={() => setStep(4)}>
                  下一步 <ArrowRight className="size-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Preview & Confirm */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="bg-zinc-800/50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">文件</span>
                  <span className="text-zinc-200">{selectedFile?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">目标工具</span>
                  <span className="text-zinc-200">{selectedTool?.display_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">部署模式</span>
                  <Badge variant="outline" className="bg-zinc-800 text-zinc-400 border-zinc-700">
                    {deployMode === 'original' ? '原样部署' : deployMode === 'customized' ? '自定义' : '增量'}
                  </Badge>
                </div>
                {selectedTool?.deploy_config && (
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">目标路径</span>
                    <span className="text-zinc-200 font-mono text-xs">
                      {(selectedTool.deploy_config as Record<string, string>)?.targetDir || `~/.${selectedTool.name}/prompts/`}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(3)}>
                  <ArrowLeft className="size-4 mr-1" /> 上一步
                </Button>
                <Button onClick={handleDeploy} disabled={deploying}>
                  {deploying ? <Loader2 className="size-4 animate-spin mr-2" /> : <Rocket className="size-4 mr-2" />}
                  确认部署
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deployment History */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg text-zinc-200">部署历史</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-5 animate-spin text-zinc-500" />
            </div>
          ) : deployments.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-sm">暂无部署记录</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500">
                    <th className="text-left py-2 px-3">文件</th>
                    <th className="text-left py-2 px-3">工具</th>
                    <th className="text-left py-2 px-3">模式</th>
                    <th className="text-left py-2 px-3">状态</th>
                    <th className="text-left py-2 px-3">目标路径</th>
                    <th className="text-left py-2 px-3">时间</th>
                  </tr>
                </thead>
                <tbody>
                  {deployments.map((dep) => {
                    const file = files.find((f) => f.id === dep.file_id);
                    const tool = tools.find((t) => t.id === dep.tool_id);
                    return (
                      <tr key={dep.deploy_id} className="border-b border-zinc-800/50">
                        <td className="py-2 px-3 text-zinc-300">{file?.name || dep.file_id}</td>
                        <td className="py-2 px-3 text-zinc-300">{tool?.display_name || dep.tool_id}</td>
                        <td className="py-2 px-3">
                          <Badge variant="outline" className="text-xs bg-zinc-800 text-zinc-400 border-zinc-700">
                            {dep.mode === 'original' ? '原样' : dep.mode === 'customized' ? '自定义' : '增量'}
                          </Badge>
                        </td>
                        <td className="py-2 px-3">
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
                        </td>
                        <td className="py-2 px-3 font-mono text-xs text-zinc-500">{dep.target_path}</td>
                        <td className="py-2 px-3 text-zinc-500 text-xs">
                          {new Date(dep.created_at).toLocaleString('zh-CN')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
