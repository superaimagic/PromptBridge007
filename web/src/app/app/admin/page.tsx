'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck, Key, Webhook, FileText, FolderKanban, Loader2, Plus, Copy, Check, Trash2, AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Project {
  id: string;
  name: string;
  path: string;
  description: string | null;
  is_default: boolean | number;
  created_at: string;
  updated_at: string;
}

interface ApiKey {
  id: string;
  project_id: string;
  key_prefix: string;
  name: string;
  status: string;
  rate_limit: number;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

interface Webhook {
  id: string;
  project_id: string;
  url: string;
  events: string | string[];
  secret: string | null;
  status: string;
  failure_count: number | string;
  created_at: string;
}

interface AuditLog {
  id: string;
  project_id: string | null;
  api_key_id: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  method: string | null;
  path: string | null;
  status_code: number | null;
  created_at: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: Record<string, unknown>;
  error?: { code: string; message: string };
}

// ─── Admin API client ────────────────────────────────────────────────────────

function adminFetch(
  path: string,
  options: RequestInit,
  token: string,
): Promise<Response> {
  return fetch(`/api/admin${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Token': token,
      ...(options.headers || {}),
    },
  });
}

async function adminJson<T>(path: string, token: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const res = await adminFetch(path, options, token);
  return res.json() as Promise<ApiResponse<T>>;
}

// ─── Page ────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'pb_admin_token';

export default function AdminPage() {
  const [token, setToken] = useState<string>('');
  const [tokenInput, setTokenInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  // Load token from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setToken(saved);
  }, []);

  const handleSaveToken = async () => {
    if (!tokenInput.trim()) {
      setVerifyError('请输入 Admin Token');
      return;
    }
    setVerifying(true);
    setVerifyError('');
    try {
      const res = await adminJson<unknown[]>('/projects', tokenInput.trim());
      if (res.success) {
        setToken(tokenInput.trim());
        localStorage.setItem(STORAGE_KEY, tokenInput.trim());
      } else {
        setVerifyError(res.error?.message || 'Token 无效');
      }
    } catch {
      setVerifyError('网络错误或服务不可用');
    } finally {
      setVerifying(false);
    }
  };

  const handleClearToken = () => {
    setToken('');
    setTokenInput('');
    localStorage.removeItem(STORAGE_KEY);
  };

  // ─── Token Gate ────────────────────────────────────────────────────────────
  if (!token) {
    return (
      <div className="p-6 max-w-md mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="size-6 text-zinc-400" />
          <h1 className="text-2xl font-bold">管理后台</h1>
        </div>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-lg text-zinc-200 flex items-center gap-2">
              <Key className="size-5 text-amber-400" /> 管理员认证
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-zinc-300">Admin Token</Label>
              <Input
                type="password"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="PB_ADMIN_TOKEN"
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
                onKeyDown={(e) => e.key === 'Enter' && handleSaveToken()}
              />
              <p className="text-xs text-zinc-500">
                Token 由服务器环境变量 <code className="text-zinc-400">PB_ADMIN_TOKEN</code> 设置。本地开发时在 <code className="text-zinc-400">.dev.vars</code> 文件配置。
              </p>
            </div>
            {verifyError && (
              <div className="flex items-center gap-2 text-sm text-red-400">
                <AlertCircle className="size-4" />
                <span>{verifyError}</span>
              </div>
            )}
            <Button onClick={handleSaveToken} disabled={verifying} className="w-full gap-2">
              {verifying ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
              验证并进入
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Main Dashboard ────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck className="size-6 text-zinc-400" />
          <h1 className="text-2xl font-bold">管理后台</h1>
        </div>
        <Button variant="outline" size="sm" onClick={handleClearToken} className="gap-2">
          <ShieldCheck className="size-4" /> 退出
        </Button>
      </div>

      <Tabs defaultValue="projects">
        <TabsList>
          <TabsTrigger value="projects" className="gap-2"><FolderKanban className="size-4" /> 项目</TabsTrigger>
          <TabsTrigger value="keys" className="gap-2"><Key className="size-4" /> API Keys</TabsTrigger>
          <TabsTrigger value="webhooks" className="gap-2"><Webhook className="size-4" /> Webhooks</TabsTrigger>
          <TabsTrigger value="audit" className="gap-2"><FileText className="size-4" /> 审计日志</TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="mt-4">
          <ProjectsPanel token={token} />
        </TabsContent>
        <TabsContent value="keys" className="mt-4">
          <ApiKeysPanel token={token} />
        </TabsContent>
        <TabsContent value="webhooks" className="mt-4">
          <WebhooksPanel token={token} />
        </TabsContent>
        <TabsContent value="audit" className="mt-4">
          <AuditLogsPanel token={token} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Projects Panel ──────────────────────────────────────────────────────────

function ProjectsPanel({ token }: { token: string }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminJson<Project[]>('/projects', token);
      if (res.success) setProjects(res.data || []);
      else setError(res.error?.message || '加载失败');
    } catch {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setError('');
    try {
      const res = await adminJson<Project & { api_key: string }>('/projects', token, {
        method: 'POST',
        body: JSON.stringify({ name: newName, description: newDesc || null }),
      });
      if (res.success && res.data) {
        setNewKey(res.data.api_key);
        setNewName('');
        setNewDesc('');
        load();
      } else {
        setError(res.error?.message || '创建失败');
      }
    } catch {
      setError('网络错误');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('删除项目前需先删除其下所有 prompts。确认继续？')) return;
    try {
      const res = await adminJson<{ deleted: boolean }>(`/projects/${id}`, token, { method: 'DELETE' });
      if (!res.success) {
        alert(res.error?.message || '删除失败');
        return;
      }
      load();
    } catch {
      alert('网络错误');
    }
  };

  const handleCopyKey = () => {
    if (!newKey) return;
    navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base text-zinc-200 flex items-center gap-2">
            <Plus className="size-4 text-green-400" /> 创建项目（自动生成 API Key）
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-zinc-400 text-xs">项目名称 *</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="我的另一个项目" className="bg-zinc-800 border-zinc-700 text-zinc-100" />
            </div>
            <div className="space-y-1">
              <Label className="text-zinc-400 text-xs">描述</Label>
              <Input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="可选" className="bg-zinc-800 border-zinc-700 text-zinc-100" />
            </div>
          </div>
          <Button onClick={handleCreate} disabled={!newName.trim()} className="gap-2">
            <Plus className="size-4" /> 创建项目
          </Button>

          {newKey && (
            <div className="mt-3 p-3 rounded-lg bg-green-950/40 border border-green-900/50">
              <div className="flex items-center gap-2 text-sm text-green-300 mb-2">
                <Check className="size-4" />
                <span>项目已创建。以下是 API Key（仅显示一次，请妥善保存）：</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded text-green-300 text-xs break-all">{newKey}</code>
                <Button size="sm" variant="outline" onClick={handleCopyKey} className="gap-1">
                  {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
                  {copied ? '已复制' : '复制'}
                </Button>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setNewKey(null)} className="mt-2 text-xs">关闭</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-400 px-3">
          <AlertCircle className="size-4" /> {error}
        </div>
      )}

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base text-zinc-200">项目列表 ({projects.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="size-6 animate-spin text-zinc-500" /></div>
          ) : projects.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-sm">暂无项目</div>
          ) : (
            <div className="space-y-2">
              {projects.map((p) => (
                <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-zinc-200 flex items-center gap-2">
                      {p.name}
                      {p.is_default && <Badge variant="outline" className="text-xs bg-zinc-800 text-zinc-400 border-zinc-700">默认</Badge>}
                    </div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      <code className="text-zinc-400">{p.id}</code>
                      {p.description && <span className="ml-2">· {p.description}</span>}
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(p.id)} className="text-red-400 hover:text-red-300 gap-1">
                    <Trash2 className="size-3" /> 删除
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── API Keys Panel ──────────────────────────────────────────────────────────

function ApiKeysPanel({ token }: { token: string }) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [projectId, setProjectId] = useState('');
  const [keyName, setKeyName] = useState('');
  const [rateLimit, setRateLimit] = useState('100');
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [keysRes, projRes] = await Promise.all([
        adminJson<ApiKey[]>('/api-keys', token),
        adminJson<Project[]>('/projects', token),
      ]);
      if (keysRes.success) setKeys(keysRes.data || []);
      if (projRes.success) setProjects(projRes.data || []);
    } catch {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!projectId) {
      setError('请选择项目');
      return;
    }
    setError('');
    try {
      const res = await adminJson<ApiKey & { api_key: string }>('/api-keys', token, {
        method: 'POST',
        body: JSON.stringify({
          project_id: projectId,
          name: keyName || 'Additional Key',
          rate_limit: parseInt(rateLimit) || 100,
        }),
      });
      if (res.success && res.data) {
        setNewKey(res.data.api_key);
        setShowCreate(false);
        setKeyName('');
        setRateLimit('100');
        load();
      } else {
        setError(res.error?.message || '创建失败');
      }
    } catch {
      setError('网络错误');
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('吊销此 API Key？已吊销的 Key 立即失效，且无法恢复。')) return;
    try {
      const res = await adminJson<{ status: string }>(`/api-keys/${id}`, token, { method: 'DELETE' });
      if (!res.success) {
        alert(res.error?.message || '吊销失败');
        return;
      }
      load();
    } catch {
      alert('网络错误');
    }
  };

  const handleCopyKey = () => {
    if (!newKey) return;
    navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const projectMap = new Map(projects.map((p) => [p.id, p.name]));

  return (
    <div className="space-y-4">
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base text-zinc-200 flex items-center justify-between">
            <span className="flex items-center gap-2"><Key className="size-4 text-amber-400" /> API Keys ({keys.length})</span>
            <Button size="sm" onClick={() => setShowCreate(!showCreate)} className="gap-1">
              <Plus className="size-3" /> 新建
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {showCreate && (
            <div className="p-3 rounded-lg bg-zinc-800/50 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-zinc-400 text-xs">项目 *</Label>
                  <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 rounded-md px-3 py-2 text-sm">
                    <option value="">选择项目...</option>
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-zinc-400 text-xs">名称</Label>
                  <Input value={keyName} onChange={(e) => setKeyName(e.target.value)} placeholder="Additional Key" className="bg-zinc-800 border-zinc-700 text-zinc-100" />
                </div>
                <div className="space-y-1">
                  <Label className="text-zinc-400 text-xs">速率限制 (req/min)</Label>
                  <Input type="number" value={rateLimit} onChange={(e) => setRateLimit(e.target.value)} className="bg-zinc-800 border-zinc-700 text-zinc-100" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleCreate} className="gap-1">生成 Key</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowCreate(false)}>取消</Button>
              </div>
            </div>
          )}

          {newKey && (
            <div className="p-3 rounded-lg bg-green-950/40 border border-green-900/50">
              <div className="flex items-center gap-2 text-sm text-green-300 mb-2">
                <Check className="size-4" /> API Key 已生成（仅显示一次）：
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded text-green-300 text-xs break-all">{newKey}</code>
                <Button size="sm" variant="outline" onClick={handleCopyKey} className="gap-1">
                  {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
                  {copied ? '已复制' : '复制'}
                </Button>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setNewKey(null)} className="mt-2 text-xs">关闭</Button>
            </div>
          )}

          {error && <div className="flex items-center gap-2 text-sm text-red-400"><AlertCircle className="size-4" /> {error}</div>}

          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="size-6 animate-spin text-zinc-500" /></div>
          ) : keys.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-sm">暂无 API Key</div>
          ) : (
            <div className="space-y-2">
              {keys.map((k) => (
                <div key={k.id} className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-zinc-200 flex items-center gap-2">
                      <span>{k.name}</span>
                      <Badge variant="outline" className={`text-xs ${k.status === 'active' ? 'bg-green-900/30 text-green-400 border-green-900/50' : 'bg-red-900/30 text-red-400 border-red-900/50'}`}>
                        {k.status === 'active' ? '活跃' : '已吊销'}
                      </Badge>
                    </div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      <code className="text-zinc-400">{k.key_prefix}...</code>
                      <span className="mx-2">·</span>
                      <span>{projectMap.get(k.project_id) || k.project_id}</span>
                      <span className="mx-2">·</span>
                      <span>{k.rate_limit}/min</span>
                      {k.last_used_at && <><span className="mx-2">·</span><span>上次使用: {new Date(k.last_used_at).toLocaleString()}</span></>}
                    </div>
                  </div>
                  {k.status === 'active' && (
                    <Button size="sm" variant="ghost" onClick={() => handleRevoke(k.id)} className="text-red-400 hover:text-red-300 gap-1">
                      <Trash2 className="size-3" /> 吊销
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Webhooks Panel ──────────────────────────────────────────────────────────

function WebhooksPanel({ token }: { token: string }) {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [projectId, setProjectId] = useState('');
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState('prompt.created,prompt.updated,prompt.deleted');
  const [secret, setSecret] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [whRes, projRes] = await Promise.all([
        adminJson<Webhook[]>('/webhooks', token),
        adminJson<Project[]>('/projects', token),
      ]);
      if (whRes.success) setWebhooks(whRes.data || []);
      if (projRes.success) setProjects(projRes.data || []);
    } catch {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!projectId || !url || !events) {
      setError('项目、URL、事件均为必填');
      return;
    }
    setError('');
    try {
      const res = await adminJson<Webhook>('/webhooks', token, {
        method: 'POST',
        body: JSON.stringify({
          project_id: projectId,
          url,
          events: events.split(',').map((s) => s.trim()).filter(Boolean),
          secret: secret || null,
        }),
      });
      if (res.success) {
        setShowCreate(false);
        setUrl(''); setSecret(''); setEvents('prompt.created,prompt.updated,prompt.deleted');
        load();
      } else {
        setError(res.error?.message || '创建失败');
      }
    } catch {
      setError('网络错误');
    }
  };

  const projectMap = new Map(projects.map((p) => [p.id, p.name]));
  const formatEvents = (e: string | string[]) => Array.isArray(e) ? e.join(', ') : e;

  return (
    <div className="space-y-4">
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base text-zinc-200 flex items-center justify-between">
            <span className="flex items-center gap-2"><Webhook className="size-4 text-blue-400" /> Webhooks ({webhooks.length})</span>
            <Button size="sm" onClick={() => setShowCreate(!showCreate)} className="gap-1">
              <Plus className="size-3" /> 新建
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {showCreate && (
            <div className="p-3 rounded-lg bg-zinc-800/50 space-y-3">
              <div className="space-y-1">
                <Label className="text-zinc-400 text-xs">项目 *</Label>
                <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 rounded-md px-3 py-2 text-sm">
                  <option value="">选择项目...</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-zinc-400 text-xs">回调 URL *</Label>
                <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://your-app.com/api/pb-webhook" className="bg-zinc-800 border-zinc-700 text-zinc-100" />
              </div>
              <div className="space-y-1">
                <Label className="text-zinc-400 text-xs">订阅事件（逗号分隔）*</Label>
                <Input value={events} onChange={(e) => setEvents(e.target.value)} className="bg-zinc-800 border-zinc-700 text-zinc-100" />
                <p className="text-xs text-zinc-500">可选: prompt.created, prompt.updated, prompt.deleted</p>
              </div>
              <div className="space-y-1">
                <Label className="text-zinc-400 text-xs">签名密钥（可选）</Label>
                <Input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="whsec_..." className="bg-zinc-800 border-zinc-700 text-zinc-100" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleCreate} className="gap-1">创建</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowCreate(false)}>取消</Button>
              </div>
            </div>
          )}

          {error && <div className="flex items-center gap-2 text-sm text-red-400"><AlertCircle className="size-4" /> {error}</div>}

          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="size-6 animate-spin text-zinc-500" /></div>
          ) : webhooks.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-sm">暂无 Webhook</div>
          ) : (
            <div className="space-y-2">
              {webhooks.map((w) => (
                <div key={w.id} className="p-3 rounded-lg bg-zinc-800/50">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-zinc-200 truncate flex-1">{w.url}</span>
                    <Badge variant="outline" className={`text-xs ${w.status === 'active' ? 'bg-green-900/30 text-green-400 border-green-900/50' : 'bg-red-900/30 text-red-400 border-red-900/50'}`}>
                      {w.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">
                    <span>{projectMap.get(w.project_id) || w.project_id}</span>
                    <span className="mx-2">·</span>
                    <span>事件: {formatEvents(w.events)}</span>
                    {typeof w.failure_count === 'number' && w.failure_count > 0 && (
                      <><span className="mx-2">·</span><span className="text-amber-400">失败 {w.failure_count} 次</span></>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Audit Logs Panel ────────────────────────────────────────────────────────

function AuditLogsPanel({ token }: { token: string }) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminJson<AuditLog[]>(`/audit-logs?page=${page}&page_size=50`, token);
      if (res.success) setLogs(res.data || []);
    } catch {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  }, [token, page]);

  useEffect(() => { load(); }, [load]);

  const actionColor = (action: string): string => {
    if (action.includes('create')) return 'text-green-400';
    if (action.includes('update')) return 'text-blue-400';
    if (action.includes('delete')) return 'text-red-400';
    if (action.includes('rollback')) return 'text-amber-400';
    return 'text-zinc-400';
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-base text-zinc-200 flex items-center justify-between">
          <span className="flex items-center gap-2"><FileText className="size-4 text-zinc-400" /> 审计日志</span>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}>上一页</Button>
            <span className="text-xs text-zinc-500 px-2 py-1">第 {page} 页</span>
            <Button size="sm" variant="ghost" disabled={logs.length < 50 || loading} onClick={() => setPage(page + 1)}>下一页</Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && <div className="flex items-center gap-2 text-sm text-red-400 mb-3"><AlertCircle className="size-4" /> {error}</div>}
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="size-6 animate-spin text-zinc-500" /></div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 text-sm">暂无日志</div>
        ) : (
          <div className="space-y-1 max-h-[600px] overflow-y-auto">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 px-2 py-1.5 rounded text-xs hover:bg-zinc-800/30">
                <span className="text-zinc-500 shrink-0 w-32">{new Date(log.created_at).toLocaleString()}</span>
                <span className={`shrink-0 font-mono ${actionColor(log.action)}`}>{log.action}</span>
                <span className="text-zinc-400 shrink-0">{log.method}</span>
                <span className="text-zinc-400 truncate flex-1">{log.path}</span>
                <span className={`shrink-0 ${log.status_code && log.status_code < 400 ? 'text-green-400' : 'text-red-400'}`}>{log.status_code}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
