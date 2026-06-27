# PromptBridge007 API Reference

> **版本**: v1.0  
> **Base URL**: `https://promptbridge007.loveshixun.workers.dev`  
> **认证方式**: API Key（Header: `X-API-Key`）  
> **响应格式**: JSON  
> **创建日期**: 2026-06-27

---

## 目录

- [快速开始](#快速开始)
- [认证机制](#认证机制)
- [统一响应格式](#统一响应格式)
- [错误码参考](#错误码参考)
- [端点清单](#端点清单)
  - [公开端点](#公开端点无需认证)
  - [Prompt 管理](#prompt-管理需-api-key)
  - [搜索与推荐](#搜索与推荐)
  - [版本管理](#版本管理)
  - [部署与转换](#部署与转换)
  - [MCP 协议](#mcp-协议)
  - [管理端点](#管理端点需管理员-token)
- [多项目接入指南](#多项目接入指南)
- [SDK 示例](#sdk-示例)
- [限制与配额](#限制与配额)

---

## 快速开始

### 1. 获取 API Key

```bash
# 管理员创建项目和 API Key
curl -X POST https://promptbridge007.loveshixun.workers.dev/api/admin/projects \
  -H "X-Admin-Token: your-admin-token" \
  -H "Content-Type: application/json" \
  -d '{"name": "我的项目", "description": "项目描述"}'
```

响应：
```json
{
  "success": true,
  "data": {
    "id": "proj_abc123",
    "name": "我的项目",
    "api_key": "pb_proj_abc123_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  }
}
```

> ⚠️ API Key 仅在创建时显示完整值，请妥善保存。

### 2. 获取项目 Prompt 列表

```bash
curl https://promptbridge007.loveshixun.workers.dev/api/v1/prompts \
  -H "X-API-Key: pb_proj_abc123_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

### 3. 搜索 Prompt

```bash
curl -X POST https://promptbridge007.loveshixun.workers.dev/api/v1/prompts/search \
  -H "X-API-Key: pb_proj_abc123_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{"query": "security", "tags": {"tool": "cursor"}}'
```

---

## 认证机制

### API Key 认证

所有 `/api/v1/*` 端点需要在 HTTP Header 中携带 API Key：

```
X-API-Key: pb_[project-id]_[32位随机字符]
```

- API Key 绑定到特定项目，**不可跨项目使用**
- API Key 自动注入项目上下文，所有操作限制在当前项目内
- 未携带 API Key：返回 `401 Unauthorized`
- API Key 无效或已吊销：返回 `403 Forbidden`

### 管理员认证

`/api/admin/*` 端点需要管理员 Token：

```
X-Admin-Token: your-admin-token
```

---

## 统一响应格式

### 成功响应

```json
{
  "success": true,
  "data": {},
  "error": null,
  "meta": {
    "page": 1,
    "page_size": 20,
    "total": 100
  }
}
```

### 错误响应

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "API Key is required"
  }
}
```

---

## 错误码参考

| HTTP 状态码 | 错误码 | 说明 |
|-------------|--------|------|
| 400 | `BAD_REQUEST` | 请求参数错误 |
| 401 | `UNAUTHORIZED` | 未提供 API Key |
| 403 | `FORBIDDEN` | API Key 无效或已吊销 |
| 404 | `NOT_FOUND` | 资源不存在或不属于当前项目 |
| 409 | `DUPLICATE_TAG` | 标签已存在 |
| 422 | `VALIDATION_ERROR` | 输入验证失败 |
| 429 | `RATE_LIMITED` | 速率超限 |
| 500 | `INTERNAL_ERROR` | 服务器内部错误 |

---

## 端点清单

### 公开端点（无需认证）

#### GET /api/v1/tools

获取所有支持的 AI 工具列表。

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "id": "cursor",
      "name": "Cursor",
      "format": "mdc",
      "directory": ".cursor/rules",
      "is_active": true
    },
    {
      "id": "claude-code",
      "name": "Claude Code",
      "format": "markdown",
      "directory": ".claude/commands",
      "is_active": true
    }
  ]
}
```

#### GET /api/v1/public-sources

获取公共 Prompt 源列表。

#### GET /api/v1/health

健康检查端点。

```json
{
  "success": true,
  "data": { "status": "ok", "version": "1.0.0" }
}
```

---

### Prompt 管理（需 API Key）

#### GET /api/v1/prompts

列出当前项目的 Prompt。

**查询参数**:

| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `page` | int | 1 | 页码 |
| `page_size` | int | 20 | 每页数量（最大 100） |
| `library` | string | - | `private` 或 `public` |
| `search` | string | - | 关键词搜索 |
| `tool` | string | - | 按工具过滤（如 `cursor`） |
| `role` | string | - | 按角色过滤（如 `system-prompt`） |
| `domain` | string | - | 按领域过滤（如 `ai-assistant`） |
| `language` | string | - | 按语言过滤（如 `en`、`zh`） |
| `quality` | string | - | 按质量过滤（`draft`/`basic`/`standard`/`detailed`/`comprehensive`） |
| `sort` | string | `created_at` | 排序字段（`created_at`/`updated_at`/`install_count`/`rating`） |
| `order` | string | `desc` | 排序方向（`asc`/`desc`） |

**请求示例**:
```bash
curl "https://promptbridge007.loveshixun.workers.dev/api/v1/prompts?page=1&page_size=10&tool=cursor&language=en" \
  -H "X-API-Key: pb_proj_abc123_xxx"
```

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "id": "spl-2ed8b832",
      "slug": "openai/4o-2025-09-03-new-personality",
      "name": "[OpenAI] 4o 2025 09 03 New Personality",
      "format": "markdown",
      "license": "CC0-1.0",
      "version": 1,
      "install_count": 0,
      "rating": 0,
      "created_at": "2026-06-25T07:28:12Z",
      "updated_at": "2026-06-25T07:28:12Z"
    }
  ],
  "meta": { "page": 1, "page_size": 10, "total": 86 }
}
```

---

#### POST /api/v1/prompts

在当前项目创建 Prompt。

**请求体**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | ✅ | Prompt 名称（≤200 字符） |
| `content` | string | ✅ | Prompt 内容（≤1MB） |
| `format` | string | ✅ | 格式（如 `markdown`） |
| `license` | string | - | 许可证（如 `MIT`、`CC0-1.0`） |
| `tags` | object | - | 标签对象 `{ dimension: value }` |

**请求示例**:
```bash
curl -X POST https://promptbridge007.loveshixun.workers.dev/api/v1/prompts \
  -H "X-API-Key: pb_proj_abc123_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Security Review Prompt",
    "content": "You are a security expert...",
    "format": "markdown",
    "license": "MIT",
    "tags": { "tool": "cursor", "role": "code-review", "domain": "security" }
  }'
```

**响应** (201):
```json
{
  "success": true,
  "data": {
    "id": "file_abc123",
    "slug": "my-security-review-prompt-a1b2c3",
    "name": "My Security Review Prompt",
    "content_hash": "sha256:...",
    "version": 1,
    "created_at": "2026-06-27T10:00:00Z"
  }
}
```

---

#### GET /api/v1/prompts/:id

获取单个 Prompt 详情（含完整内容）。

**响应示例**:
```json
{
  "success": true,
  "data": {
    "id": "spl-2ed8b832",
    "slug": "openai/4o-2025-09-03-new-personality",
    "name": "[OpenAI] 4o 2025 09 03 New Personality",
    "content": "You are ChatGPT, a large language model...",
    "content_hash": "sha256:...",
    "format": "markdown",
    "project_id": "proj_abc123",
    "source_type": "public",
    "repo_name": "system_prompts_leaks",
    "repo_url": "https://github.com/asgeirtj/system_prompts_leaks/blob/main/OpenAI/4o-2025-09-03-new-personality.md",
    "repo_license": "CC0-1.0",
    "license": "CC0-1.0",
    "license_url": "https://creativecommons.org/publicdomain/zero/1.0/",
    "version": 1,
    "tags": [
      { "dimension": "tool", "value": "chatgpt", "confidence": 0.95 },
      { "dimension": "role", "value": "system-prompt", "confidence": 0.90 },
      { "dimension": "language", "value": "en", "confidence": 0.95 }
    ],
    "deployments": [],
    "created_at": "2026-06-25T07:28:12Z",
    "updated_at": "2026-06-25T07:28:12Z"
  }
}
```

> ⚠️ 若该 Prompt 不属于当前 API Key 对应的项目，返回 `404 Not Found`。

---

#### PUT /api/v1/prompts/:id

更新 Prompt。内容变更会自增版本号并写入版本历史。

**请求体**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | - | 新名称 |
| `content` | string | - | 新内容（变更后 version+1） |
| `tags` | object | - | 新标签 |

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "file_abc123",
    "updated_at": "2026-06-27T11:00:00Z",
    "version": 2
  }
}
```

---

#### DELETE /api/v1/prompts/:id

软删除 Prompt（写入 `deleted_at` 时间戳）。

**响应**:
```json
{
  "success": true,
  "data": { "id": "file_abc123", "deleted": true }
}
```

---

### 搜索与推荐

#### POST /api/v1/prompts/search

在当前项目范围内搜索 Prompt。

**请求体**:

| 字段 | 类型 | 说明 |
|------|------|------|
| `query` | string | 搜索关键词 |
| `tags` | object | 标签过滤 `{ dimension: value }` |
| `must_have_all_tags` | boolean | 是否要求所有标签同时匹配 |
| `page` | int | 页码 |
| `page_size` | int | 每页数量 |

**请求示例**:
```bash
curl -X POST https://promptbridge007.loveshixun.workers.dev/api/v1/prompts/search \
  -H "X-API-Key: pb_proj_abc123_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "security review",
    "tags": { "tool": "cursor", "domain": "security" },
    "must_have_all_tags": true,
    "page": 1,
    "page_size": 10
  }'
```

---

#### GET /api/v1/prompts/similar/:id

基于标签相似度推荐 Prompt。

**查询参数**: `limit`（默认 5，最大 20）

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "file": { "id": "...", "name": "...", "slug": "..." },
      "score": 0.85,
      "matched_tags": ["tool:cursor", "role:system-prompt"]
    }
  ]
}
```

---

### 版本管理

#### GET /api/v1/prompts/:id/versions

获取 Prompt 的版本历史。

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "version": 2,
      "content_hash": "sha256:...",
      "content_preview": "前200字符预览...",
      "created_at": "2026-06-27T11:00:00Z"
    },
    {
      "version": 1,
      "content_hash": "sha256:...",
      "content_preview": "前200字符预览...",
      "created_at": "2026-06-25T07:28:12Z"
    }
  ]
}
```

---

#### POST /api/v1/prompts/:id/rollback/:version

回滚到指定版本（创建新版本，不覆盖历史）。

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "file_abc123",
    "version": 3,
    "rolled_back_from": 2,
    "rolled_back_to": 1,
    "updated_at": "2026-06-27T12:00:00Z"
  }
}
```

---

### 部署与转换

#### POST /api/v1/prompts/:id/deploy

将 Prompt 部署到指定 AI 工具。

**请求体**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `tool_id` | string | ✅ | 目标工具 ID（如 `cursor`） |
| `mode` | string | ✅ | 部署模式：`original`/`customized`/`incremental` |
| `custom_content` | string | - | 自定义内容（`mode=customized` 时必填） |

> ⚠️ 部署端点在 Cloudflare Workers 环境下依赖本地文件系统，仅适用于本地开发或 CLI 模式。

---

#### POST /api/v1/prompts/:id/convert

将 Prompt 转换为目标工具格式。

**请求体**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `target_format` | string | ✅ | 目标格式（如 `to_cursor`、`to_claude_code`） |

**响应**:
```json
{
  "success": true,
  "data": {
    "converted_content": "---\ndescription: ...\n---\nYou are...",
    "format": "to_cursor",
    "preview": true
  }
}
```

---

### MCP 协议

#### GET /api/v1/mcp/tools

获取 MCP 工具和资源清单。

**响应**:
```json
{
  "success": true,
  "data": {
    "tools": [
      { "name": "search_prompts", "description": "Search prompts by keyword and tags" },
      { "name": "get_prompt", "description": "Get a specific prompt by ID" },
      { "name": "deploy_prompt", "description": "Deploy a prompt to a target tool" },
      { "name": "convert_format", "description": "Convert prompt to target format" },
      { "name": "scan_environment", "description": "Scan for installed AI tools" },
      { "name": "sync_tool", "description": "Sync prompts with tool directory" },
      { "name": "list_tools", "description": "List all supported AI tools" },
      { "name": "suggest_similar", "description": "Find similar prompts" }
    ],
    "resources": [
      { "uri": "prompt-library://catalog", "description": "Full prompt catalog" },
      { "uri": "prompt-library://tools", "description": "Supported tool list" },
      { "uri": "prompt-library://formats", "description": "Available format conversions" },
      { "uri": "prompt-library://stats", "description": "Library statistics" }
    ]
  }
}
```

---

#### POST /api/v1/mcp/execute

执行 MCP 工具（带项目上下文）。

**请求体**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `tool` | string | ✅ | 工具名称 |
| `arguments` | object | - | 工具参数 |

**示例 — 搜索 Prompt**:
```bash
curl -X POST https://promptbridge007.loveshixun.workers.dev/api/v1/mcp/execute \
  -H "X-API-Key: pb_proj_abc123_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "search_prompts",
    "arguments": {
      "query": "code review",
      "limit": 5,
      "include_content": false
    }
  }'
```

> 使用 API Key 时，搜索自动限定在当前项目范围内。

---

### 管理端点（需管理员 Token）

#### POST /api/admin/projects

创建新项目并生成 API Key。

**请求体**:
```json
{
  "name": "项目名称",
  "path": "/optional/local/path",
  "description": "项目描述"
}
```

**响应** (201):
```json
{
  "success": true,
  "data": {
    "id": "proj_abc123",
    "name": "项目名称",
    "path": "/optional/local/path",
    "description": "项目描述",
    "is_default": false,
    "created_at": "2026-06-27T10:00:00Z",
    "api_key": "pb_proj_abc123_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  }
}
```

---

#### GET /api/admin/projects

列出所有项目。

---

#### GET /api/admin/projects/:id

获取项目详情。

---

#### PUT /api/admin/projects/:id

更新项目信息（名称、描述）。

---

#### DELETE /api/admin/projects/:id

删除项目（若有关联文件则拒绝）。

---

#### GET /api/admin/api-keys

列出所有 API Key。

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": "key_abc123",
      "project_id": "proj_abc123",
      "key_prefix": "pb_proj_abc123_xxxx",
      "status": "active",
      "created_at": "2026-06-27T10:00:00Z",
      "last_used_at": "2026-06-27T12:30:00Z",
      "rate_limit": 100
    }
  ]
}
```

> ⚠️ API Key 完整值仅在创建时返回，列表中只显示前缀。

---

#### DELETE /api/admin/api-keys/:id

吊销 API Key（立即生效）。

---

#### POST /api/admin/webhooks

为项目配置 Webhook。

**请求体**:
```json
{
  "project_id": "proj_abc123",
  "url": "https://your-system.com/webhook/promptbridge",
  "events": ["prompt.created", "prompt.updated", "prompt.deleted"]
}
```

**Webhook 载荷示例**:
```json
{
  "event": "prompt.updated",
  "project_id": "proj_abc123",
  "prompt_id": "file_abc123",
  "version": 2,
  "timestamp": "2026-06-27T11:00:00Z"
}
```

---

#### GET /api/admin/audit-logs

查询审计日志。

**查询参数**: `project_id`、`action`、`from`、`to`、`page`

---

## 多项目接入指南

### 接入流程

```
1. 管理员创建项目 → 获得 API Key
         │
2. 外部系统配置 API Key
         │
3. 外部系统调用 GET /api/v1/prompts → 获取 Prompt 列表
         │
4. 外部系统调用 GET /api/v1/prompts/:id → 获取完整 Prompt
         │
5. （可选）配置 Webhook → 实时感知 Prompt 更新
         │
6. （可选）调用 POST /api/v1/prompts/:id/convert → 转换为目标格式
```

### 10+ 项目接入示例

```
┌────────────────┐     API-Key-A     ┌──────────────────┐
│  项目 A (Web)   │ ───────────────▶ │                  │
│  需要: 翻译Prompt │                  │                  │
└────────────────┘                  │                  │
                                      │  PromptBridge007  │
┌────────────────┐     API-Key-B     │  (Cloudflare)     │
│  项目 B (API)   │ ───────────────▶ │                  │
│  需要: 代码审查   │                  │  · 200+ 系统提示词 │
└────────────────┘                  │  · 格式转换        │
                                      │  · 版本管理        │
┌────────────────┐     API-Key-C     │  · MCP 协议        │
│  项目 C (CLI)   │ ───────────────▶ │                  │
│  需要: 通用助手   │                  │                  │
└────────────────┘                  └──────────────────┘
         ...                                    │
┌────────────────┐     API-Key-J              │
│  项目 J (App)   │ ──────────────────────────┘
│  需要: 安全审计   │
└────────────────┘
```

### 各项目接入步骤

1. **管理员在 PromptBridge007 中为每个项目创建独立的项目和 API Key**
2. **各项目在代码中配置 API Key**（环境变量推荐）：
   ```env
   PROMPTBRIDGE_API_KEY=pb_proj_xxx_xxx
   PROMPTBRIDGE_BASE_URL=https://promptbridge007.loveshixun.workers.dev
   ```
3. **各项目通过 API 消费 Prompt**：
   ```typescript
   const res = await fetch(`${process.env.PROMPTBRIDGE_BASE_URL}/api/v1/prompts?tool=cursor`, {
     headers: { 'X-API-Key': process.env.PROMPTBRIDGE_API_KEY }
   });
   const { data } = await res.json();
   ```
4. **（可选）配置 Webhook 接收更新通知**

---

## SDK 示例

### TypeScript / Node.js

```typescript
class PromptBridgeClient {
  constructor(private apiKey: string, private baseUrl = 'https://promptbridge007.loveshixun.workers.dev') {}

  private async request(path: string, options: RequestInit = {}) {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    return res.json();
  }

  // 列出 Prompt
  async listPrompts(params?: {
    page?: number;
    page_size?: number;
    tool?: string;
    language?: string;
    search?: string;
  }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/api/v1/prompts${query ? '?' + query : ''}`);
  }

  // 获取单个 Prompt
  async getPrompt(id: string) {
    return this.request(`/api/v1/prompts/${id}`);
  }

  // 搜索 Prompt
  async searchPrompts(query: string, tags?: Record<string, string>) {
    return this.request('/api/v1/prompts/search', {
      method: 'POST',
      body: JSON.stringify({ query, tags }),
    });
  }

  // 格式转换
  async convertFormat(id: string, targetFormat: string) {
    return this.request(`/api/v1/prompts/${id}/convert`, {
      method: 'POST',
      body: JSON.stringify({ target_format: targetFormat }),
    });
  }

  // 创建 Prompt
  async createPrompt(data: { name: string; content: string; format: string; tags?: Record<string, string> }) {
    return this.request('/api/v1/prompts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // 获取版本历史
  async getVersions(id: string) {
    return this.request(`/api/v1/prompts/${id}/versions`);
  }
}

// 使用
const client = new PromptBridgeClient(process.env.PROMPTBRIDGE_API_KEY!);
const { data } = await client.listPrompts({ tool: 'cursor', language: 'en', page_size: 10 });
```

### Python

```python
import requests
import os

class PromptBridgeClient:
    def __init__(self, api_key, base_url='https://promptbridge007.loveshixun.workers.dev'):
        self.api_key = api_key
        self.base_url = base_url
        self.headers = {
            'X-API-Key': api_key,
            'Content-Type': 'application/json'
        }

    def list_prompts(self, **params):
        res = requests.get(f'{self.base_url}/api/v1/prompts', headers=self.headers, params=params)
        return res.json()

    def get_prompt(self, prompt_id):
        res = requests.get(f'{self.base_url}/api/v1/prompts/{prompt_id}', headers=self.headers)
        return res.json()

    def search_prompts(self, query, tags=None):
        payload = {'query': query}
        if tags:
            payload['tags'] = tags
        res = requests.post(f'{self.base_url}/api/v1/prompts/search',
                           headers=self.headers, json=payload)
        return res.json()

    def convert_format(self, prompt_id, target_format):
        res = requests.post(f'{self.base_url}/api/v1/prompts/{prompt_id}/convert',
                           headers=self.headers, json={'target_format': target_format})
        return res.json()

# 使用
client = PromptBridgeClient(os.environ['PROMPTBRIDGE_API_KEY'])
result = client.list_prompts(tool='cursor', language='en', page_size=10)
```

### cURL

```bash
# 设置变量
export PB_API_KEY="pb_proj_abc123_xxx"
export PB_BASE="https://promptbridge007.loveshixun.workers.dev"

# 列出 Prompt
curl "$PB_BASE/api/v1/prompts?page=1&page_size=10" \
  -H "X-API-Key: $PB_API_KEY"

# 搜索 Prompt
curl -X POST "$PB_BASE/api/v1/prompts/search" \
  -H "X-API-Key: $PB_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "security", "tags": {"tool": "cursor"}}'

# 获取单个 Prompt
curl "$PB_BASE/api/v1/prompts/spl-2ed8b832" \
  -H "X-API-Key: $PB_API_KEY"

# 格式转换
curl -X POST "$PB_BASE/api/v1/prompts/spl-2ed8b832/convert" \
  -H "X-API-Key: $PB_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"target_format": "to_cursor"}'
```

---

## 限制与配额

### 速率限制

| 级别 | 限制 | 说明 |
|------|------|------|
| 默认 | 100 req/min per API Key | 超限返回 `429 Too Many Requests` |
| 管理员可调 | 最高 1000 req/min | 通过 `/api/admin/api-keys` 配置 |

### 内容限制

| 项目 | 限制 |
|------|------|
| Prompt 内容大小 | 1MB |
| Prompt 名称长度 | 200 字符 |
| 标签值长度 | 50 字符 |
| 分页 page_size | 最大 100 |
| 搜索结果 limit | 最大 20（相似推荐） |

### Cloudflare D1 免费层限制

| 资源 | 免费额度 | 当前使用 |
|------|----------|----------|
| 存储 | 500 MB | ~14 MB |
| 读取 | 500 万行/天 | ~5000 行/天 |
| 写入 | 10 万行/天 | ~800 行/天 |

---

## 变更日志

| 日期 | 版本 | 变更 |
|------|------|------|
| 2026-06-27 | v1.0 | 初始版本，基于现有 31 个端点 + 规划中的 v1 API |

---

*本文档随系统开发持续更新。如需帮助，请提交 Issue。*
