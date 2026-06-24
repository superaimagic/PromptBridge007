'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, X, Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { api } from '@/lib/api/client';
import { DIMENSION_COLORS } from '@/components/app/TagBadges';
import type { FileDetail, ToolInfo } from '@/lib/api/client';

const CONFIDENCE_LEVELS = ['full', 'partial', 'experimental', 'incompatible'];
const ROLE_OPTIONS = ['developer', 'architect', 'reviewer', 'tester', 'pm', 'designer', 'analyst', 'devops'];
const DOMAIN_OPTIONS = ['frontend', 'backend', 'fullstack', 'mobile', 'devops', 'data', 'ai', 'security', 'testing', 'documentation'];
const LANGUAGE_OPTIONS = ['typescript', 'javascript', 'python', 'go', 'rust', 'java', 'csharp', 'ruby', 'php', 'swift', 'kotlin'];
const QUALITY_OPTIONS = ['production', 'beta', 'experimental', 'draft'];
const LICENSE_OPTIONS = ['MIT', 'Apache-2.0', 'GPL-3.0', 'BSD-3-Clause', 'CC0-1.0', 'Unlicense', 'proprietary'];

export default function FileEditPage() {
  const params = useParams();
  const router = useRouter();
  const fileId = params.id as string;

  const [file, setFile] = useState<FileDetail | null>(null);
  const [tools, setTools] = useState<ToolInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Edit state
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [license, setLicense] = useState('MIT');
  const [toolTags, setToolTags] = useState<Array<{ value: string; confidence: string }>>([]);
  const [role, setRole] = useState('');
  const [domainTags, setDomainTags] = useState<string[]>([]);
  const [language, setLanguage] = useState('');
  const [quality, setQuality] = useState('');
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [newCustomTag, setNewCustomTag] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [fileRes, toolsRes] = await Promise.all([
        api.getFile(fileId),
        api.getTools(),
      ]);
      if (fileRes.success && fileRes.data) {
        const f = fileRes.data;
        setFile(f);
        setName(f.name);
        setContent(f.content);
        setLicense(f.license);
        // Parse tags
        if (f.tags.tool && Array.isArray(f.tags.tool)) {
          setToolTags(f.tags.tool.map((t: { value: string; confidence?: string | null }) => ({
            value: t.value,
            confidence: t.confidence || 'full',
          })));
        }
        if (f.tags.role) setRole(String(f.tags.role));
        if (f.tags.domain) {
          setDomainTags(Array.isArray(f.tags.domain) ? f.tags.domain : [String(f.tags.domain)]);
        }
        if (f.tags.language) setLanguage(String(f.tags.language));
        if (f.tags.quality) setQuality(String(f.tags.quality));
        if (f.tags.custom) {
          setCustomTags(Array.isArray(f.tags.custom) ? f.tags.custom as string[] : [String(f.tags.custom)]);
        }
      }
      if (toolsRes.success && toolsRes.data) {
        setTools(toolsRes.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [fileId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const tagsPayload: Record<string, unknown> = {};
      if (toolTags.length > 0) {
        tagsPayload.tool = toolTags.map((t) => ({ value: t.value, confidence: t.confidence }));
      }
      if (role) tagsPayload.role = role;
      if (domainTags.length > 0) tagsPayload.domain = domainTags;
      if (language) tagsPayload.language = language;
      if (quality) tagsPayload.quality = quality;
      if (customTags.length > 0) tagsPayload.custom = customTags;
      if (file?.source?.type) tagsPayload.source_type = file.source.type;

      const res = await api.updateFile(fileId, {
        name,
        content,
        tags: tagsPayload,
      });
      if (res.success) {
        router.push(`/app/files/${fileId}`);
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const addToolTag = (toolName: string) => {
    if (!toolTags.some((t) => t.value === toolName)) {
      setToolTags([...toolTags, { value: toolName, confidence: 'full' }]);
    }
  };

  const removeToolTag = (value: string) => {
    setToolTags(toolTags.filter((t) => t.value !== value));
  };

  const addDomainTag = (domain: string) => {
    if (!domainTags.includes(domain)) setDomainTags([...domainTags, domain]);
  };

  const removeDomainTag = (domain: string) => {
    setDomainTags(domainTags.filter((d) => d !== domain));
  };

  const addCustomTag = () => {
    if (newCustomTag.trim() && !customTags.includes(newCustomTag.trim())) {
      setCustomTags([...customTags, newCustomTag.trim()]);
      setNewCustomTag('');
    }
  };

  const removeCustomTag = (tag: string) => {
    setCustomTags(customTags.filter((t) => t !== tag));
  };

  const handleDelete = async () => {
    if (!confirm('确定要删除此文件吗？')) return;
    try {
      await api.deleteFile(fileId);
      router.push('/app/library/private');
    } catch (err) {
      alert('删除失败：' + (err instanceof Error ? err.message : String(err)));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="size-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/app/files/${fileId}`)} className="text-zinc-400">
          <ArrowLeft className="size-5" />
        </Button>
        <h1 className="text-2xl font-bold">编辑提示词</h1>
      </div>

      {/* Basic Info */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg text-zinc-200">基本信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-zinc-300">名称</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 mt-1"
            />
          </div>
          <div>
            <Label className="text-zinc-300">许可证</Label>
            <select
              value={license}
              onChange={(e) => setLicense(e.target.value)}
              className="w-full mt-1 bg-zinc-800 border border-zinc-700 text-zinc-100 rounded-lg px-3 py-2 text-sm"
            >
              {LICENSE_OPTIONS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Content Editor */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg text-zinc-200">内容</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={20}
            className="bg-zinc-950 border-zinc-700 text-zinc-100 font-mono text-sm resize-y"
          />
        </CardContent>
      </Card>

      {/* Tag Editor */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg text-zinc-200">标签</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Tool Tags */}
          <div>
            <Label className="text-zinc-300 mb-2 block">工具 (多选)</Label>
            <div className="flex flex-wrap gap-1 mb-2">
              {toolTags.map((t) => (
                <Badge
                  key={t.value}
                  variant="outline"
                  className={`text-xs px-1.5 py-0.5 ${DIMENSION_COLORS.tool}`}
                >
                  {t.value}
                  <select
                    value={t.confidence}
                    onChange={(e) => {
                      setToolTags(toolTags.map((tt) =>
                        tt.value === t.value ? { ...tt, confidence: e.target.value } : tt
                      ));
                    }}
                    className="bg-transparent text-xs ml-1 cursor-pointer"
                  >
                    {CONFIDENCE_LEVELS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => removeToolTag(t.value)} className="ml-1 opacity-50 hover:opacity-100">×</button>
                </Badge>
              ))}
            </div>
            <select
              onChange={(e) => { if (e.target.value) { addToolTag(e.target.value); e.target.value = ''; } }}
              className="bg-zinc-800 border border-zinc-700 text-zinc-100 rounded px-2 py-1 text-sm"
              defaultValue=""
            >
              <option value="">+ 添加工具</option>
              {tools.map((t) => (
                <option key={t.id} value={t.name}>{t.display_name}</option>
              ))}
            </select>
          </div>

          <Separator className="bg-zinc-800" />

          {/* Role */}
          <div>
            <Label className="text-zinc-300 mb-2 block">角色 (单选)</Label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">选择角色...</option>
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <Separator className="bg-zinc-800" />

          {/* Domain */}
          <div>
            <Label className="text-zinc-300 mb-2 block">领域 (多选)</Label>
            <div className="flex flex-wrap gap-1 mb-2">
              {domainTags.map((d) => (
                <Badge key={d} variant="outline" className={`text-xs px-1.5 py-0.5 ${DIMENSION_COLORS.domain}`}>
                  {d}
                  <button type="button" onClick={() => removeDomainTag(d)} className="ml-1 opacity-50 hover:opacity-100">×</button>
                </Badge>
              ))}
            </div>
            <select
              onChange={(e) => { if (e.target.value) { addDomainTag(e.target.value); e.target.value = ''; } }}
              className="bg-zinc-800 border border-zinc-700 text-zinc-100 rounded px-2 py-1 text-sm"
              defaultValue=""
            >
              <option value="">+ 添加领域</option>
              {DOMAIN_OPTIONS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <Separator className="bg-zinc-800" />

          {/* Language */}
          <div>
            <Label className="text-zinc-300 mb-2 block">语言 (单选)</Label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">选择语言...</option>
              {LANGUAGE_OPTIONS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>

          <Separator className="bg-zinc-800" />

          {/* Quality */}
          <div>
            <Label className="text-zinc-300 mb-2 block">质量 (单选)</Label>
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">选择质量...</option>
              {QUALITY_OPTIONS.map((q) => (
                <option key={q} value={q}>{q}</option>
              ))}
            </select>
          </div>

          <Separator className="bg-zinc-800" />

          {/* Source Type (read-only) */}
          {file?.source?.type && (
            <div>
              <Label className="text-zinc-300 mb-2 block">来源类型 (只读)</Label>
              <Badge variant="outline" className={`text-xs px-1.5 py-0.5 ${DIMENSION_COLORS.source_type}`}>
                {file.source.type}
              </Badge>
            </div>
          )}

          <Separator className="bg-zinc-800" />

          {/* Custom Tags */}
          <div>
            <Label className="text-zinc-300 mb-2 block">自定义标签</Label>
            <div className="flex flex-wrap gap-1 mb-2">
              {customTags.map((t) => (
                <Badge key={t} variant="outline" className={`text-xs px-1.5 py-0.5 ${DIMENSION_COLORS.custom}`}>
                  {t}
                  <button type="button" onClick={() => removeCustomTag(t)} className="ml-1 opacity-50 hover:opacity-100">×</button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newCustomTag}
                onChange={(e) => setNewCustomTag(e.target.value)}
                placeholder="输入自定义标签"
                className="bg-zinc-800 border-zinc-700 text-zinc-100 text-sm"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag(); } }}
              />
              <Button variant="outline" size="sm" onClick={addCustomTag} className="gap-1">
                <Plus className="size-3" /> 添加
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-between">
        <Button variant="outline" onClick={handleDelete} className="gap-2 text-red-400 border-red-500/30 hover:bg-red-500/10 hover:text-red-300">
          <Trash2 className="size-4" /> 删除
        </Button>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.push(`/app/files/${fileId}`)}>
            <X className="size-4 mr-2" /> 取消
          </Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? <Loader2 className="size-4 animate-spin mr-2" /> : <Save className="size-4 mr-2" />}
            保存
          </Button>
        </div>
      </div>
    </div>
  );
}
