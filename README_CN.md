# PromptBridge007

<p align="center">
  <strong>一次编写，到处部署。</strong><br>
  跨平台 AI 提示词管理系统 — 在 24 款 AI 编程工具之间转换、部署和同步提示词。
</p>

<p align="center">
  <a href="#功能特性">功能特性</a> •
  <a href="#支持的工具">支持的工具</a> •
  <a href="#快速开始">快速开始</a> •
  <a href="#架构">架构</a> •
  <a href="#命令行工具">命令行工具</a> •
  <a href="#mcp-服务器">MCP 服务器</a> •
  <a href="#许可证">许可证</a>
</p>

---

## 功能特性

- **格式转换** — 在 24 种 AI 工具格式之间转换提示词（Cursor MDC、Claude Code、GitHub Copilot、Windsurf 等）
- **一键部署** — 3 种模式部署提示词到目标工具：原版、定制、增量
- **双向同步** — 推送/拉取工具目录的提示词，支持冲突检测
- **环境扫描** — 自动检测已安装的 AI 工具并导入现有提示词文件
- **公共库同步** — 克隆并导入社区提示词仓库（如 [CL4R1T4S](https://github.com/elder-plinius/CL4R1T4S)）
- **MCP 服务器** — 让 AI 助手通过模型上下文协议搜索、部署和管理提示词
- **命令行工具** — 完整的命令行界面，支持自动化和脚本
- **Web 界面** — Next.js 可视化提示词管理仪表板
- **多项目管理** — 跨多个项目目录管理提示词
- **文件监听** — 自动检测工具目录中的文件变化
- **语义搜索** — TF-IDF 评分 + 基于标签的相似度搜索

## 支持的工具

| 国际工具 | 国内工具 |
|---|---|
| Cursor | Kimi Code |
| Claude Code | 豆包 (Doubao) |
| GitHub Copilot | 通义灵码 (Qwen Code) |
| Windsurf | 扣子 (Coze) |
| Aider | 智谱 GLM |
| Gemini CLI | 天工 AI |
| Codex (OpenAI) | DeepSeek Coder |
| OpenCode | 星火代码 |
| Trae | 腾讯元宝 |
| Amp | |
| Kiro | |
| Replit | |
| Warp | |
| OpenClaw | |

## 快速开始

### 前置要求

- Node.js 18+
- npm 或 pnpm

### 安装

```bash
git clone https://github.com/superaimagic/PromptBridge007.git
cd PromptBridge007/web
npm install
```

### 开发

```bash
npm run dev
```

打开 http://localhost:3000 — 引导向导将引导你完成初始设置。

### 命令行工具

```bash
# 扫描已安装的 AI 工具
npx tsx src/cli/index.ts scan

# 列出所有提示词
npx tsx src/cli/index.ts list

# 部署提示词到 Cursor
npx tsx src/cli/index.ts deploy <file-id> cursor

# 搜索提示词
npx tsx src/cli/index.ts search "安全"

# 格式转换
npx tsx src/cli/index.ts convert <file-id> to_cursor

# 同步工具
npx tsx src/cli/index.ts sync cursor

# 列出支持的工具
npx tsx src/cli/index.ts tools
```

## 架构

```
┌─────────────────────────────────────────────┐
│  Next.js 16 (App Router) + Hono API         │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐ │
│  │ 首页      │  │ /app/*   │  │ /api/*    │ │
│  │          │  │ (SPA)    │  │ (Hono)    │ │
│  └──────────┘  └──────────┘  └─────┬─────┘ │
│                                     │        │
│  ┌──────────────────────────────────▼─────┐ │
│  │         核心引擎                       │ │
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
│  │  MCP 服务器 (stdio + HTTP)             │ │
│  │  8 个工具 + 4 个资源                    │ │
│  └────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### 核心引擎

| 引擎 | 描述 |
|------|------|
| **FormatMatrix** | 在 PIF（提示词内部格式）和 24 种工具特定格式之间转换 |
| **ScanEngine** | 检测已安装的 AI 工具并导入现有提示词文件 |
| **DeployEngine** | 以 3 种模式将提示词部署到目标工具目录 |
| **SyncEngine** | 数据库与工具目录之间的双向同步 |
| **PublicSyncEngine** | 从社区提示词仓库 git clone/pull |
| **WatchEngine** | 监控工具目录的文件变化 |
| **SearchEngine** | TF-IDF 评分 + 基于标签的相似度搜索 |

## MCP 服务器

PromptBridge007 内置 MCP 服务器，让 AI 助手可以直接访问你的提示词库。

### 工具列表

| 工具 | 描述 |
|------|------|
| `search_prompts` | 按关键词、标签或格式搜索提示词 |
| `get_prompt` | 获取指定提示词，支持格式转换 |
| `deploy_prompt` | 部署提示词到目标 AI 工具 |
| `convert_format` | 将提示词转换为目标格式 |
| `scan_environment` | 扫描已安装的 AI 工具 |
| `sync_tool` | 与工具目录同步提示词 |
| `list_tools` | 列出所有支持的 AI 工具 |
| `suggest_similar` | 基于标签查找相似提示词 |

### 资源列表

| 资源 | 描述 |
|------|------|
| `prompt-library://catalog` | 完整提示词目录 |
| `prompt-library://tools` | 支持的工具列表 |
| `prompt-library://formats` | 可用的格式转换 |
| `prompt-library://stats` | 库统计信息 |

### 在 Claude Desktop / Cursor 中使用

添加到 MCP 配置：

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

或使用 HTTP 端点：`http://localhost:3000/api/mcp/*`

## API 接口

所有功能可通过 REST API 访问（`/api/*`）：

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/init` | POST | 初始化数据库 |
| `/api/projects` | GET/POST | 管理项目 |
| `/api/files` | GET/POST | 列出/创建提示词 |
| `/api/files/:id` | GET/PUT/DELETE | 单个提示词 CRUD |
| `/api/files/search` | POST | 搜索提示词 |
| `/api/tools` | GET | 列出支持的工具 |
| `/api/scan` | POST | 扫描环境 |
| `/api/deploy` | POST | 部署提示词 |
| `/api/sync/statuses` | GET | 获取同步状态 |
| `/api/sync/:tool_id` | POST | 同步工具 |
| `/api/convert` | POST | 格式转换 |
| `/api/public-sources` | GET/POST | 管理公共仓库 |
| `/api/mcp/tools` | GET | 列出 MCP 工具 |
| `/api/mcp/execute` | POST | 执行 MCP 工具 |

## 项目结构

```
web/
├── src/
│   ├── app/              # Next.js App Router 页面
│   ├── cli/              # CLI 入口 (pb007)
│   ├── components/       # React UI 组件
│   ├── lib/
│   │   ├── api/          # Hono API 路由
│   │   │   └── routes/   # 模块化路由文件
│   │   ├── core/         # 核心引擎
│   │   ├── db/           # 数据库 Schema 和种子数据
│   │   └── stores/       # 状态管理
│   └── mcp/              # MCP 服务器
├── package.json
└── tsconfig.json
```

## 技术栈

- **前端**: Next.js 16, React 19, Tailwind CSS, Base UI
- **API**: Hono（嵌入 Next.js Route Handler）
- **数据库**: SQLite (libsql), Drizzle ORM
- **MCP**: Model Context Protocol (stdio + HTTP)
- **CLI**: Commander.js

## 贡献

欢迎贡献！请随时提交 Pull Request。

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 发起 Pull Request

## 许可证

MIT License — 详见 [LICENSE](LICENSE)

## 致谢

- [CL4R1T4S](https://github.com/elder-plinius/CL4R1T4S) — AI 系统提示词透明度项目
- [gray-matter](https://github.com/jonschlinkert/gray-matter) — Frontmatter 解析
- [Drizzle ORM](https://orm.drizzle.team/) — TypeScript ORM
- [Hono](https://hono.dev/) — 高性能 Web 框架
