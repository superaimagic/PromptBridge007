# PromptBridge007

<p align="center">
  <strong>Write once, deploy everywhere.</strong><br>
  Cross-platform AI prompt management system — convert, deploy, and sync prompts across 24 AI coding tools.
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#supported-tools">Supported Tools</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#cli">CLI</a> •
  <a href="#mcp-server">MCP Server</a> •
  <a href="#acknowledgments">Acknowledgments</a> •
  <a href="#license">License</a>
</p>

---

## Features

- **Format Conversion** — Convert prompts between 24 AI tool formats (Cursor MDC, Claude Code, GitHub Copilot, Windsurf, etc.)
- **One-Click Deploy** — Deploy prompts to any supported tool with 3 modes: original, customized, incremental
- **Bidirectional Sync** — Push to / pull from tool directories with conflict detection
- **Environment Scan** — Auto-detect installed AI tools and import existing prompt files
- **Public Library Sync** — Clone and import community prompt repos (e.g., [CL4R1T4S](https://github.com/elder-plinius/CL4R1T4S))
- **MCP Server** — Let AI assistants search, deploy, and manage prompts via Model Context Protocol
- **CLI** — Full command-line interface for automation and scripting
- **Web UI** — Next.js dashboard for visual prompt management
- **Multi-Project** — Manage prompts across multiple project directories
- **Watch Mode** — Auto-detect file changes in tool directories
- **Semantic Search** — TF-IDF scoring + tag-based similarity search

## Supported Tools

| International | Domestic (China) |
|---|---|
| Cursor | Kimi Code |
| Claude Code | Doubao (豆包) |
| GitHub Copilot | Qwen Code (通义灵码) |
| Windsurf | Coze (扣子) |
| Aider | GLM (智谱) |
| Gemini CLI | Tiangong AI (天工) |
| Codex (OpenAI) | DeepSeek Coder |
| OpenCode | Spark Code (星火代码) |
| Trae | Yuanbao (腾讯元宝) |
| Amp | |
| Kiro | |
| Replit | |
| Warp | |
| OpenClaw | |

## Quick Start

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

```bash
git clone https://github.com/superaimagic/PromptBridge007.git
cd PromptBridge007/web
npm install
```

### Development

```bash
npm run dev
```

Open http://localhost:3000 — the onboarding wizard will guide you through setup.

### CLI

```bash
# Scan for installed AI tools
npx tsx src/cli/index.ts scan

# List all prompts
npx tsx src/cli/index.ts list

# Deploy a prompt to Cursor
npx tsx src/cli/index.ts deploy <file-id> cursor

# Search prompts
npx tsx src/cli/index.ts search "security"

# Convert format
npx tsx src/cli/index.ts convert <file-id> to_cursor

# Sync with a tool
npx tsx src/cli/index.ts sync cursor

# List supported tools
npx tsx src/cli/index.ts tools
```

## Architecture

```
┌─────────────────────────────────────────────┐
│  Next.js 16 (App Router) + Hono API         │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐ │
│  │ Landing   │  │ /app/*   │  │ /api/*    │ │
│  │ Page      │  │ (SPA)    │  │ (Hono)    │ │
│  └──────────┘  └──────────┘  └─────┬─────┘ │
│                                     │        │
│  ┌──────────────────────────────────▼─────┐ │
│  │         Core Engines                   │ │
│  │  ToolRegistry │ FormatMatrix           │ │
│  │  ScanEngine   │ DeployEngine           │ │
│  │  SyncEngine   │ PublicSyncEngine       │ │
│  │  WatchEngine  │ SearchEngine           │ │
│  └──────────────────────────────────┬─────┘ │
│                                     │        │
│  ┌──────────────────────────────────▼─────┐ │
│  │  SQLite (libsql) + Drizzle ORM         │ │
│  └────────────────────────────────────────┘ │
│                                     │        │
│  ┌──────────────────────────────────▼─────┐ │
│  │  MCP Server (stdio + HTTP)             │ │
│  │  8 Tools + 4 Resources                 │ │
│  └────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### Core Engines

| Engine | Description |
|--------|-------------|
| **FormatMatrix** | Converts between PIF (Prompt Internal Format) and 24 tool-specific formats |
| **ScanEngine** | Detects installed AI tools and imports existing prompt files |
| **DeployEngine** | Deploys prompts to target tool directories with 3 modes |
| **SyncEngine** | Bidirectional sync between database and tool directories |
| **PublicSyncEngine** | Git clone/pull from community prompt repositories |
| **WatchEngine** | Monitors tool directories for file changes |
| **SearchEngine** | TF-IDF scoring + tag-based similarity search |

## MCP Server

PromptBridge007 includes an MCP server that lets AI assistants directly access your prompt library.

### Tools

| Tool | Description |
|------|-------------|
| `search_prompts` | Search prompts by keyword, tags, or format |
| `get_prompt` | Get a specific prompt with optional format conversion |
| `deploy_prompt` | Deploy a prompt to a target AI tool |
| `convert_format` | Convert a prompt to a target format |
| `scan_environment` | Scan for installed AI tools |
| `sync_tool` | Sync prompts with a tool directory |
| `list_tools` | List all supported AI tools |
| `suggest_similar` | Find similar prompts based on tags |

### Resources

| Resource | Description |
|----------|-------------|
| `prompt-library://catalog` | Full prompt catalog |
| `prompt-library://tools` | Supported tool list |
| `prompt-library://formats` | Available format conversions |
| `prompt-library://stats` | Library statistics |

### Usage with Claude Desktop / Cursor

Add to your MCP config:

```json
{
  "mcpServers": {
    "promptbridge007": {
      "command": "npx",
      "args": ["tsx", "path/to/PromptBridge007/web/src/mcp/server.ts"]
    }
  }
}
```

Or use the HTTP endpoint: `http://localhost:3000/api/mcp/*`

## API

All features are accessible via REST API at `/api/*`:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/init` | POST | Initialize database |
| `/api/projects` | GET/POST | Manage projects |
| `/api/files` | GET/POST | List/create prompts |
| `/api/files/:id` | GET/PUT/DELETE | CRUD single prompt |
| `/api/files/search` | POST | Search prompts |
| `/api/tools` | GET | List supported tools |
| `/api/scan` | POST | Scan environment |
| `/api/deploy` | POST | Deploy prompt |
| `/api/sync/statuses` | GET | Get sync status |
| `/api/sync/:tool_id` | POST | Sync with tool |
| `/api/convert` | POST | Convert format |
| `/api/public-sources` | GET/POST | Manage public repos |
| `/api/mcp/tools` | GET | List MCP tools |
| `/api/mcp/execute` | POST | Execute MCP tool |

## Project Structure

```
web/
├── src/
│   ├── app/              # Next.js App Router pages
│   ├── cli/              # CLI entry point (pb007)
│   ├── components/       # React UI components
│   ├── lib/
│   │   ├── api/          # Hono API routes
│   │   │   └── routes/   # Modular route files
│   │   ├── core/         # Core engines
│   │   ├── db/           # Database schema & seed
│   │   └── stores/       # State management
│   └── mcp/              # MCP server
├── package.json
└── tsconfig.json
```

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS, Base UI
- **API**: Hono (embedded in Next.js Route Handler)
- **Database**: SQLite (libsql), Drizzle ORM
- **MCP**: Model Context Protocol (stdio + HTTP)
- **CLI**: Commander.js

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License — see [LICENSE](LICENSE) for details.

## Acknowledgments

我们站在开源巨人的肩膀上。感谢以下项目和数据源的贡献：

### System Prompts 数据源

- **[system_prompts_leaks](https://github.com/asgeirtj/system_prompts_leaks)** — [CC0-1.0](https://creativecommons.org/publicdomain/zero/1.0/) — 收集整理了 200+ 个 AI 产品的系统提示词（Claude、ChatGPT、Gemini、Grok 等），由 [@asgeirtj](https://github.com/asgeirtj) 维护
- **[CL4R1T4S](https://github.com/elder-plinius/CL4R1T4S)** — [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) — AI 系统提示词透明度项目

### 技术栈

- **[gray-matter](https://github.com/jonschlinkert/gray-matter)** — Frontmatter 解析
- **[Drizzle ORM](https://orm.drizzle.team/)** — TypeScript ORM
- **[Hono](https://hono.dev/)** — 极速 Web 框架
- **[Tailwind CSS](https://tailwindcss.com/)** — CSS 框架

### 基础设施

- **[Cloudflare Workers](https://workers.cloudflare.com/)** — Edge 部署
- **[Cloudflare D1](https://developers.cloudflare.com/d1/)** — Serverless SQLite 数据库

> 完整的致谢列表（包括许可证详情）请查看 [CREDITS.md](CREDITS.md)
