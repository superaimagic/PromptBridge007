/**
 * FormatMatrix - PIF (Prompt Internal Format) 与 24 种目标工具格式之间的转换引擎
 *
 * PIF 内部格式: Markdown + YAML Frontmatter
 * 所有转换都经过 PIF 中转，实现 N:M 格式互转
 *
 * 格式分类:
 *   - Plain Markdown: 无 frontmatter，纯 markdown 内容
 *   - Frontmatter Markdown: YAML frontmatter + markdown body (使用 gray-matter)
 *   - Pure YAML: 整个文件为 YAML 格式
 *   - JSON: 整个文件为 JSON 格式
 */

import matter from 'gray-matter';

// ============================================================
// 1. PIFEntity 接口
// ============================================================

export interface PIFEntity {
  name: string;
  content: string;
  slug?: string;
  license?: string;
  licenseUrl?: string;
  sourceType?: string;
  repoName?: string;
  repoUrl?: string;
  repoLicense?: string;
  author?: string;
  authorUrl?: string;
  filePath?: string;
  commitHash?: string;
  fetchedAt?: string;
  tags?: {
    tool?: Array<{ value: string; confidence: string }>;
    role?: string;
    domain?: string[];
    language?: string;
    quality?: string;
    source_type?: string;
    custom?: Record<string, string>;
  };
  version?: number;
  /** 工具描述 — 用于 Cursor / OpenClaw / Coze / YAML 类工具 */
  description?: string;
  /** 是否始终应用 — 用于 Cursor .mdc 格式 */
  alwaysApply?: boolean;
  /** 文件匹配模式 — 用于 Cursor .mdc 格式 (alwaysApply=false 时生效) */
  globs?: string[];
}

// ============================================================
// 2. 辅助函数
// ============================================================

/** 生成 PromptBridge007 元数据 HTML 注释 */
function buildMetaComment(pif: PIFEntity): string {
  const parts = ['PromptBridge007'];
  parts.push(`name: ${pif.name}`);
  if (pif.license) parts.push(`license: ${pif.license}`);
  if (pif.repoName) parts.push(`source: ${pif.repoName}`);
  return `<!-- ${parts.join(' | ')} -->`;
}

/** 将内容缩进为 YAML 块标量 (|) 格式 */
function toYamlBlockScalar(content: string): string {
  if (!content) return '';
  return content
    .split('\n')
    .map((line) => (line ? `  ${line}` : ''))
    .join('\n');
}

/** 转义 YAML 双引号字符串中的特殊字符 */
function escapeYamlString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

/** 基础 YAML 语法校验 — 检查关键行是否可解析 */
function validateYaml(yaml: string): boolean {
  try {
    const lines = yaml.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      // 检查键值对行
      if (trimmed.includes(':')) {
        const colonIdx = trimmed.indexOf(':');
        const key = trimmed.slice(0, colonIdx).trim();
        if (!key) return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

/** 基础 JSON 语法校验 */
function validateJson(json: string): boolean {
  try {
    JSON.parse(json);
    return true;
  } catch {
    return false;
  }
}

/** 将工具 ID 转换为格式键名 */
function getFormatKey(toolId: string): string {
  return `to_${toolId.replace(/-/g, '_')}`;
}

/** 确保内容以换行符结尾 */
function ensureTrailingNewline(content: string): string {
  return content.endsWith('\n') ? content : content + '\n';
}

// ============================================================
// 3. 正向转换器: PIF → 目标格式
// ============================================================

// -------------------------------------------------------
// 3A. Plain Markdown 格式 (无 frontmatter)
// 规则: 首行 # 标题 + 元数据 HTML 注释 + 正文
// -------------------------------------------------------

/** PIF → Claude Code (CLAUDE.md) */
function to_claude_code(pif: PIFEntity): string {
  const lines: string[] = [];
  lines.push(`# ${pif.name}`);
  lines.push('');
  lines.push(buildMetaComment(pif));
  lines.push('');
  lines.push(pif.content);
  return ensureTrailingNewline(lines.join('\n'));
}

/** PIF → GitHub Copilot (.github/copilot-instructions.md) */
function to_copilot(pif: PIFEntity): string {
  const lines: string[] = [];
  lines.push(buildMetaComment(pif));
  lines.push('');
  lines.push(pif.content);
  return ensureTrailingNewline(lines.join('\n'));
}

/** PIF → Windsurf (.windsurfrules / .windsurf/rules/*.md) */
function to_windsurf(pif: PIFEntity): string {
  const lines: string[] = [];
  lines.push(buildMetaComment(pif));
  lines.push('');
  lines.push(pif.content);
  return ensureTrailingNewline(lines.join('\n'));
}

/** PIF → Aider (CONVENTIONS.md) */
function to_aider(pif: PIFEntity): string {
  const lines: string[] = [];
  lines.push(buildMetaComment(pif));
  lines.push('');
  lines.push(pif.content);
  return ensureTrailingNewline(lines.join('\n'));
}

/** PIF → Gemini CLI (GEMINI.md) */
function to_gemini_cli(pif: PIFEntity): string {
  const lines: string[] = [];
  lines.push(buildMetaComment(pif));
  lines.push('');
  lines.push(pif.content);
  return ensureTrailingNewline(lines.join('\n'));
}

/** PIF → Codex / OpenAI (codex.md / CODEX.md) */
function to_codex(pif: PIFEntity): string {
  const lines: string[] = [];
  lines.push(buildMetaComment(pif));
  lines.push('');
  lines.push(pif.content);
  return ensureTrailingNewline(lines.join('\n'));
}

/** PIF → OpenCode (OPENCODE.md) */
function to_opencode(pif: PIFEntity): string {
  const lines: string[] = [];
  lines.push(buildMetaComment(pif));
  lines.push('');
  lines.push(pif.content);
  return ensureTrailingNewline(lines.join('\n'));
}

/** PIF → Trae (.trae/rules/*.md) */
function to_trae(pif: PIFEntity): string {
  const lines: string[] = [];
  lines.push(buildMetaComment(pif));
  lines.push('');
  lines.push(pif.content);
  return ensureTrailingNewline(lines.join('\n'));
}

/** PIF → Amp (AMP.md) */
function to_amp(pif: PIFEntity): string {
  const lines: string[] = [];
  lines.push(buildMetaComment(pif));
  lines.push('');
  lines.push(pif.content);
  return ensureTrailingNewline(lines.join('\n'));
}

/** PIF → Kiro (.kiro/specs/*.md / .kiro/steering/*.md) */
function to_kiro(pif: PIFEntity): string {
  const lines: string[] = [];
  lines.push(buildMetaComment(pif));
  lines.push('');
  lines.push(pif.content);
  return ensureTrailingNewline(lines.join('\n'));
}

/** PIF → Replit (.replit/prompts/*.md) */
function to_replit(pif: PIFEntity): string {
  const lines: string[] = [];
  lines.push(buildMetaComment(pif));
  lines.push('');
  lines.push(pif.content);
  return ensureTrailingNewline(lines.join('\n'));
}

/** PIF → Warp (.warp/prompts/*.md) */
function to_warp(pif: PIFEntity): string {
  const lines: string[] = [];
  lines.push(buildMetaComment(pif));
  lines.push('');
  lines.push(pif.content);
  return ensureTrailingNewline(lines.join('\n'));
}

/** PIF → 智谱 GLM (.glm/instructions.md) */
function to_glm(pif: PIFEntity): string {
  const lines: string[] = [];
  lines.push(buildMetaComment(pif));
  lines.push('');
  lines.push(pif.content);
  return ensureTrailingNewline(lines.join('\n'));
}

/** PIF → 通义灵码 (.tongyi/rules/*.md) */
function to_tongyi(pif: PIFEntity): string {
  const lines: string[] = [];
  lines.push(buildMetaComment(pif));
  lines.push('');
  lines.push(pif.content);
  return ensureTrailingNewline(lines.join('\n'));
}

/** PIF → 天工 AI (.tiangong/instructions.md) */
function to_tiangong(pif: PIFEntity): string {
  const lines: string[] = [];
  lines.push(buildMetaComment(pif));
  lines.push('');
  lines.push(pif.content);
  return ensureTrailingNewline(lines.join('\n'));
}

/** PIF → DeepSeek Coder (.deepseek/instructions.md) */
function to_deepseek_coder(pif: PIFEntity): string {
  const lines: string[] = [];
  lines.push(buildMetaComment(pif));
  lines.push('');
  lines.push(pif.content);
  return ensureTrailingNewline(lines.join('\n'));
}

/** PIF → 星火代码 (.spark-code/rules/*.md) */
function to_spark_code(pif: PIFEntity): string {
  const lines: string[] = [];
  lines.push(buildMetaComment(pif));
  lines.push('');
  lines.push(pif.content);
  return ensureTrailingNewline(lines.join('\n'));
}

// -------------------------------------------------------
// 3B. Frontmatter Markdown 格式 (使用 gray-matter)
// -------------------------------------------------------

/** PIF → Cursor (.cursor/rules/*.mdc) */
function to_cursor(pif: PIFEntity): string {
  const data: Record<string, unknown> = {
    name: pif.name,
    description: pif.description || `Rules for ${pif.name}`,
    alwaysApply: pif.alwaysApply !== undefined ? pif.alwaysApply : true,
  };
  // 当 alwaysApply 为 false 时，添加 globs 字段
  if (!data.alwaysApply && pif.globs && pif.globs.length > 0) {
    data.globs = pif.globs;
  }
  const result = matter.stringify(pif.content, data);
  return ensureTrailingNewline(result);
}

/** PIF → OpenClaw (.openclaw/agents/*.md) */
function to_openclaw(pif: PIFEntity): string {
  const data: Record<string, unknown> = {
    name: pif.name,
    description: pif.description || `Agent for ${pif.name}`,
    version: pif.version ?? 1.0,
  };
  const result = matter.stringify(pif.content, data);
  return ensureTrailingNewline(result);
}

/** PIF → 扣子 Coze (.coze/bots/*.md) */
function to_coze(pif: PIFEntity): string {
  const data: Record<string, unknown> = {
    name: pif.name,
    description: pif.description || `Skill: ${pif.name}`,
    type: 'skill',
  };
  // Coze 要求 body 包含 ## Instructions 和 ## Examples 段落
  let body = pif.content;
  if (!body.includes('## Instructions')) {
    body = `## Instructions\n\n${pif.content}`;
  }
  if (!body.includes('## Examples')) {
    body += '\n\n## Examples\n\n<!-- Add usage examples here -->';
  }
  const result = matter.stringify(body, data);
  return ensureTrailingNewline(result);
}

// -------------------------------------------------------
// 3C. Pure YAML 格式
// -------------------------------------------------------

/** PIF → Kimi Code (.kimi/rules.yaml) */
function to_kimi_code(pif: PIFEntity): string {
  const lines: string[] = [];
  lines.push(`name: "${escapeYamlString(pif.name)}"`);
  lines.push(`description: "${escapeYamlString(pif.description || `Rules for ${pif.name}`)}"`);
  lines.push('content: |');
  lines.push(toYamlBlockScalar(pif.content));
  const result = ensureTrailingNewline(lines.join('\n'));
  validateYaml(result);
  return result;
}

/** PIF → 豆包 (.doubao/rules.yaml) */
function to_doubao(pif: PIFEntity): string {
  const lines: string[] = [];
  lines.push(`name: "${escapeYamlString(pif.name)}"`);
  lines.push(`description: "${escapeYamlString(pif.description || `Rules for ${pif.name}`)}"`);
  lines.push('content: |');
  lines.push(toYamlBlockScalar(pif.content));
  const result = ensureTrailingNewline(lines.join('\n'));
  validateYaml(result);
  return result;
}

/** PIF → Qwen Code (.qwen-code/rules.yaml) */
function to_qwen_code(pif: PIFEntity): string {
  const lines: string[] = [];
  lines.push(`name: "${escapeYamlString(pif.name)}"`);
  lines.push(`description: "${escapeYamlString(pif.description || `Rules for ${pif.name}`)}"`);
  lines.push('content: |');
  lines.push(toYamlBlockScalar(pif.content));
  const result = ensureTrailingNewline(lines.join('\n'));
  validateYaml(result);
  return result;
}

// -------------------------------------------------------
// 3D. JSON 格式
// -------------------------------------------------------

/** PIF → 腾讯元宝 (.yuanbao/config.json) */
function to_yuanbao(pif: PIFEntity): string {
  const obj = {
    name: pif.name,
    description: pif.description || `Configuration for ${pif.name}`,
    content: pif.content,
  };
  const result = JSON.stringify(obj, null, 2);
  validateJson(result);
  return ensureTrailingNewline(result);
}

// ============================================================
// 4. 反向转换器: 源格式 → PIF
// ============================================================

/** Plain Markdown → PIF partial */
function from_markdown(content: string): Partial<PIFEntity> {
  // 尝试用 gray-matter 解析 frontmatter
  if (matter.test(content)) {
    const parsed = matter(content);
    const data = parsed.data;
    return {
      name: data.name || data.title || 'Untitled',
      content: parsed.content.trim(),
      license: data.license,
      slug: data.slug,
      sourceType: data.source_type || data.sourceType,
      repoName: data.repo_name || data.repoName,
      repoUrl: data.repo_url || data.repoUrl,
      author: data.author,
      description: data.description,
      alwaysApply: data.alwaysApply,
      globs: data.globs,
    };
  }
  // 纯 markdown，从标题或元数据注释提取名称
  const metaMatch = content.match(/<!--\s*PromptBridge007\s*\|.*?name:\s*([^|]+)/);
  if (metaMatch) {
    return {
      name: metaMatch[1].trim(),
      content: content.replace(/<!--\s*PromptBridge007[^>]*-->\s*\n?/, '').trim(),
      sourceType: 'user_created',
    };
  }
  const titleMatch = content.match(/^#\s+(.+)$/m);
  return {
    name: titleMatch ? titleMatch[1].trim() : 'Untitled',
    content,
    sourceType: 'user_created',
  };
}

/** Cursor .mdc → PIF partial */
function from_mdc(content: string): Partial<PIFEntity> {
  if (!matter.test(content)) {
    return from_markdown(content);
  }
  const parsed = matter(content);
  const data = parsed.data;
  return {
    name: data.name || data.title || 'Untitled',
    content: parsed.content.trim(),
    description: data.description,
    alwaysApply: data.alwaysApply,
    globs: data.globs,
    sourceType: data.source ? 'public_repo' : undefined,
    repoName: data.source,
  };
}

/** OpenClaw agent .md → PIF partial */
function from_openclaw_md(content: string): Partial<PIFEntity> {
  if (!matter.test(content)) {
    return from_markdown(content);
  }
  const parsed = matter(content);
  const data = parsed.data;
  return {
    name: data.name || data.title || 'Untitled',
    content: parsed.content.trim(),
    description: data.description,
    version: typeof data.version === 'number' ? data.version : undefined,
  };
}

/** Coze skill .md → PIF partial */
function from_coze_md(content: string): Partial<PIFEntity> {
  if (!matter.test(content)) {
    // 回退: 尝试从旧格式解析
    return from_skill_md(content);
  }
  const parsed = matter(content);
  const data = parsed.data;
  return {
    name: data.name || data.title || 'Untitled',
    content: parsed.content.trim(),
    description: data.description,
  };
}

/** Pure YAML → PIF partial */
function from_yaml(content: string): Partial<PIFEntity> {
  const parsed = parseSimpleYaml(content);
  return {
    name: str(parsed.name) ?? 'Untitled',
    content: typeof parsed.content === 'string' ? parsed.content : content,
    description: str(parsed.description),
    license: str(parsed.license),
    sourceType: str(parsed.source) ? 'public_repo' : undefined,
    repoName: str(parsed.source),
  };
}

/** JSON → PIF partial */
function from_json(content: string): Partial<PIFEntity> {
  try {
    const parsed = JSON.parse(content);
    return {
      name: parsed.name ?? 'Untitled',
      content: typeof parsed.content === 'string' ? parsed.content : content,
      description: parsed.description,
      license: parsed.license,
      sourceType: parsed.source ? 'public_repo' : undefined,
      repoName: parsed.source,
    };
  } catch {
    return { name: 'Untitled', content };
  }
}

/** TOML → PIF partial（向后兼容，当前 24 种工具无 TOML 格式） */
function from_toml(content: string): Partial<PIFEntity> {
  const parsed = parseSimpleToml(content);
  return {
    name: parsed.name ?? 'Untitled',
    content: parsed.content ?? content,
    license: parsed.license,
    sourceType: parsed.source ? 'public_repo' : undefined,
    repoName: parsed.source,
  };
}

/** 旧版 skill_md → PIF partial（向后兼容 Coze/OpenClaw 旧格式） */
function from_skill_md(content: string): Partial<PIFEntity> {
  const nameMatch = content.match(/^#\s+Skill:\s+(.+)$/m);
  const licenseMatch = content.match(/- License:\s*(.+)$/m);
  const sourceMatch = content.match(/- Source:\s*(.+)$/m);
  const contentMatch = content.match(/^## Content\r?\n([\s\S]*)$/m);
  return {
    name: nameMatch ? nameMatch[1].trim() : 'Untitled',
    content: contentMatch ? contentMatch[1].trim() : content,
    license: licenseMatch ? licenseMatch[1].trim() : undefined,
    repoUrl: sourceMatch ? sourceMatch[1].trim() : undefined,
    sourceType: sourceMatch ? 'public_repo' : undefined,
  };
}

// ============================================================
// 5. 简易 YAML 解析器（用于纯 YAML 文件，非 frontmatter）
// ============================================================

function parseSimpleYaml(yaml: string): Record<string, string | string[] | undefined> {
  const result: Record<string, string | string[] | undefined> = {};
  let currentKey = '';
  let inBlock = false;
  let blockLines: string[] = [];

  for (const line of yaml.split('\n')) {
    // 块标量处理 (content: |)
    if (inBlock) {
      if (line.startsWith('  ') || line === '') {
        blockLines.push(line.startsWith('  ') ? line.slice(2) : '');
        continue;
      } else {
        result[currentKey] = blockLines.join('\n');
        inBlock = false;
        blockLines = [];
      }
    }

    const kvMatch = line.match(/^(\w[\w_-]*):\s*(.*)$/);
    if (kvMatch) {
      const key = kvMatch[1];
      const val = kvMatch[2].trim();

      if (val === '|' || val === '>') {
        currentKey = key;
        inBlock = true;
        blockLines = [];
        continue;
      }

      if (val === '') {
        result[key] = undefined;
        continue;
      }

      // 去除引号
      const unquoted = val.replace(/^["']|["']$/g, '');

      // 数组值 [a, b, c]
      if (unquoted.startsWith('[') && unquoted.endsWith(']')) {
        result[key] = unquoted
          .slice(1, -1)
          .split(',')
          .map((s) => s.trim().replace(/^["']|["']$/g, ''));
        continue;
      }

      result[key] = unquoted;
    }

    // 处理 YAML 数组项 (- value)
    const arrayMatch = line.match(/^(\s+)-\s+(.+)$/);
    if (arrayMatch && currentKey) {
      const arr = result[currentKey];
      if (Array.isArray(arr)) {
        arr.push(arrayMatch[2].trim().replace(/^["']|["']$/g, ''));
      } else {
        result[currentKey] = [arrayMatch[2].trim().replace(/^["']|["']$/g, '')];
      }
    }
  }

  if (inBlock) {
    result[currentKey] = blockLines.join('\n');
  }

  return result;
}

/** 从解析结果中提取字符串值（排除数组） */
function str(val: string | string[] | undefined): string | undefined {
  if (Array.isArray(val)) return val[0];
  return val;
}

/** 简易 TOML 解析器（向后兼容，当前 24 种工具无 TOML 格式） */
function parseSimpleToml(toml: string): Record<string, string | undefined> {
  const result: Record<string, string | undefined> = {};
  for (const line of toml.split('\n')) {
    const kvMatch = line.match(/^(\w[\w_-]*)\s*=\s*"(.*)"\s*$/);
    if (kvMatch) {
      result[kvMatch[1]] = kvMatch[2];
    }
  }
  return result;
}

// ============================================================
// 6. FormatMatrix 类
// ============================================================

type ForwardConverter = (pif: PIFEntity) => string;
type ReverseConverter = (content: string) => Partial<PIFEntity>;

const forwardConverters: Record<string, ForwardConverter> = {
  to_claude_code,
  to_cursor,
  to_copilot,
  to_windsurf,
  to_gemini_cli,
  to_codex,
  to_opencode,
  to_trae,
  to_amp,
  to_kiro,
  to_replit,
  to_warp,
  to_kimi_code,
  to_coze,
  to_glm,
  to_doubao,
  to_tongyi,
  to_tiangong,
  to_deepseek_coder,
  to_qwen_code,
  to_spark_code,
  to_yuanbao,
  to_aider,
  to_openclaw,
};

const reverseConverters: Record<string, ReverseConverter> = {
  from_markdown,
  from_mdc,
  from_openclaw_md,
  from_coze_md,
  from_yaml,
  from_json,
  from_toml,
  from_skill_md,
};

export class FormatMatrix {
  /**
   * 将 PIF 转换为目标格式
   * @param targetFormat 格式键名，如 "to_cursor" 或工具 ID (如 "cursor")
   */
  toFormat(pif: PIFEntity, targetFormat: string): string {
    // 支持直接传入工具 ID（如 "cursor"），自动转换为 "to_cursor"
    const formatKey = targetFormat.startsWith('to_')
      ? targetFormat
      : getFormatKey(targetFormat);
    const converter = forwardConverters[formatKey];
    if (!converter) {
      throw new Error(`Unsupported target format: ${formatKey}`);
    }
    return converter(pif);
  }

  /**
   * 将源格式转换为 PIF partial
   */
  fromFormat(content: string, sourceFormat: string): Partial<PIFEntity> {
    const converter = reverseConverters[sourceFormat];
    if (!converter) {
      throw new Error(`Unsupported source format: ${sourceFormat}`);
    }
    return converter(content);
  }

  /**
   * 获取所有支持的目标格式
   */
  getSupportedFormats(): string[] {
    return Object.keys(forwardConverters);
  }

  /**
   * 获取所有支持的反向格式
   */
  getSupportedSourceFormats(): string[] {
    return Object.keys(reverseConverters);
  }
}

export const formatMatrix = new FormatMatrix();
