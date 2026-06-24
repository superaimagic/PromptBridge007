'use client';

import { useState, useEffect, useCallback } from 'react';
import { Settings, Database, Globe, Wrench, Palette, Info, Loader2, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api/client';
import type { ToolInfo, PublicSource } from '@/lib/api/client';

const VERSION = '0.1.0';

export default function SettingsPage() {
  const [tools, setTools] = useState<ToolInfo[]>([]);
  const [sources, setSources] = useState<PublicSource[]>([]);
  const [loading, setLoading] = useState(true);

  // Settings from localStorage - initialize from localStorage directly
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window === 'undefined') return 'dark';
    return (localStorage.getItem('pb_theme') as 'dark' | 'light') || 'dark';
  });
  const [sidebarDefault, setSidebarDefault] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('pb_sidebar_default') !== 'false';
  });
  const [enabledTools, setEnabledTools] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {};
    try { return JSON.parse(localStorage.getItem('pb_enabled_tools') || '{}'); } catch { return {}; }
  });
  const [enabledSources, setEnabledSources] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {};
    try { return JSON.parse(localStorage.getItem('pb_enabled_sources') || '{}'); } catch { return {}; }
  });
  const [dbPath, setDbPath] = useState(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('pb_db_path') || '';
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [toolsRes, sourcesRes] = await Promise.all([
        api.getTools(),
        api.getPublicSources(),
      ]);
      if (toolsRes.success && toolsRes.data) {
        setTools(toolsRes.data);
        setEnabledTools((prev) => {
          const next = { ...prev };
          for (const tool of toolsRes.data!) {
            if (next[tool.id] === undefined) next[tool.id] = tool.is_active;
          }
          return next;
        });
      }
      if (sourcesRes.success && sourcesRes.data) {
        setSources(sourcesRes.data);
        setEnabledSources((prev) => {
          const next = { ...prev };
          for (const source of sourcesRes.data!) {
            if (next[source.id] === undefined) next[source.id] = source.is_active;
          }
          return next;
        });
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const saveSetting = (key: string, value: unknown) => {
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  };

  const handleThemeChange = (isDark: boolean) => {
    const newTheme = isDark ? 'dark' : 'light';
    setTheme(newTheme);
    saveSetting('pb_theme', newTheme);
    document.documentElement.classList.toggle('dark', isDark);
  };

  const handleToolToggle = (toolId: string, enabled: boolean) => {
    setEnabledTools((prev) => {
      const next = { ...prev, [toolId]: enabled };
      saveSetting('pb_enabled_tools', next);
      return next;
    });
  };

  const handleSourceToggle = (sourceId: string, enabled: boolean) => {
    setEnabledSources((prev) => {
      const next = { ...prev, [sourceId]: enabled };
      saveSetting('pb_enabled_sources', next);
      return next;
    });
  };

  const handleBackup = () => {
    const data = {
      theme,
      sidebarDefault,
      enabledTools,
      enabledSources,
      dbPath,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `promptbridge-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRestore = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          if (data.theme) { setTheme(data.theme); saveSetting('pb_theme', data.theme); }
          if (data.sidebarDefault !== undefined) { setSidebarDefault(data.sidebarDefault); saveSetting('pb_sidebar_default', data.sidebarDefault); }
          if (data.enabledTools) { setEnabledTools(data.enabledTools); saveSetting('pb_enabled_tools', data.enabledTools); }
          if (data.enabledSources) { setEnabledSources(data.enabledSources); saveSetting('pb_enabled_sources', data.enabledSources); }
          if (data.dbPath) { setDbPath(data.dbPath); saveSetting('pb_db_path', data.dbPath); }
        } catch {
          // ignore invalid JSON
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Settings className="size-6 text-zinc-400" />
        <h1 className="text-2xl font-bold">设置</h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-8 animate-spin text-zinc-500" />
        </div>
      ) : (
        <>
          {/* Database Config */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-lg text-zinc-200 flex items-center gap-2">
                <Database className="size-5 text-blue-400" /> 数据库配置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-zinc-300">数据库路径</Label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="text"
                    value={dbPath}
                    onChange={(e) => { setDbPath(e.target.value); saveSetting('pb_db_path', e.target.value); }}
                    placeholder="~/.promptbridge/data.db"
                    className="flex-1 bg-zinc-800 border border-zinc-700 text-zinc-100 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleBackup} className="gap-2">
                  📦 备份设置
                </Button>
                <Button variant="outline" onClick={handleRestore} className="gap-2">
                  📥 恢复设置
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Public Sources Config */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-lg text-zinc-200 flex items-center gap-2">
                <Globe className="size-5 text-green-400" /> 公共库配置
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sources.length === 0 ? (
                <div className="text-center py-4 text-zinc-500 text-sm">暂无公共来源</div>
              ) : (
                <div className="space-y-3">
                  {sources.map((source) => (
                    <div key={source.id} className="flex items-center gap-3 p-2 rounded-lg bg-zinc-800/50">
                      <Switch
                        checked={enabledSources[source.id] ?? source.is_active}
                        onCheckedChange={(checked) => handleSourceToggle(source.id, checked)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-zinc-200">{source.name}</div>
                        <div className="text-xs text-zinc-500 truncate">{source.repo_url}</div>
                      </div>
                      {source.repo_license && (
                        <Badge variant="outline" className="text-xs bg-zinc-800 text-zinc-400 border-zinc-700">
                          {source.repo_license}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tools Config */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-lg text-zinc-200 flex items-center gap-2">
                <Wrench className="size-5 text-orange-400" /> 工具配置
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tools.length === 0 ? (
                <div className="text-center py-4 text-zinc-500 text-sm">暂无工具，请先执行环境扫描</div>
              ) : (
                <div className="space-y-3">
                  {tools.map((tool) => (
                    <div key={tool.id} className="flex items-center gap-3 p-2 rounded-lg bg-zinc-800/50">
                      <Switch
                        checked={enabledTools[tool.id] ?? tool.is_active}
                        onCheckedChange={(checked) => handleToolToggle(tool.id, checked)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-zinc-200">{tool.display_name}</div>
                        <div className="text-xs text-zinc-500">{tool.name}</div>
                      </div>
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
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-lg text-zinc-200 flex items-center gap-2">
                <Palette className="size-5 text-purple-400" /> 外观
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {theme === 'dark' ? <Moon className="size-4 text-zinc-400" /> : <Sun className="size-4 text-zinc-400" />}
                  <Label className="text-zinc-300">深色模式</Label>
                </div>
                <Switch
                  checked={theme === 'dark'}
                  onCheckedChange={handleThemeChange}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-zinc-300">侧边栏默认展开</Label>
                <Switch
                  checked={sidebarDefault}
                  onCheckedChange={(checked) => {
                    setSidebarDefault(checked);
                    saveSetting('pb_sidebar_default', checked);
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* About */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-lg text-zinc-200 flex items-center gap-2">
                <Info className="size-5 text-zinc-400" /> 关于
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">版本</span>
                <span className="text-zinc-300">v{VERSION}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">项目名称</span>
                <span className="text-zinc-300">PromptBridge007 (词桥007)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">许可证</span>
                <span className="text-zinc-300">MIT</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">GitHub</span>
                <a
                  href="https://github.com/promptbridge007"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  github.com/promptbridge007
                </a>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
