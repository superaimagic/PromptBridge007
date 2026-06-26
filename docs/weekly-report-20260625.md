## 【PromptBridge007】

**同步日期**：2026-06-25

---

### 一、项目本质

**一句话定位**：一个开源的跨平台 AI 提示词管理系统，让你写一次提示词，就能一键部署到 20+ 种 AI 编程工具里。

**解决什么痛点**：
- 痛点1：**提示词碎片化** — 用 Claude Code 写的规则文件，换到 Cursor 就得重新写一遍，格式、路径、语法全不一样。每多一个工具就多一份维护负担。
- 痛点2：**没有统一管理入口** — 提示词散落在 `~/.cursorrules`、`.claude/CLAUDE.md`、`.github/copilot-instructions.md` 等十几个位置，改一个忘了改另一个，版本混乱。
- 痛点3：**公共提示词难以复用** — GitHub 上有大量优质 Agent 提示词仓库（如 agency-agents、system-prompts），但手动下载后格式不兼容、来源不可追溯、许可证不透明。

**目标用户**：
- AI 辅助编程的重度用户（每天同时使用 2+ 种 AI 编程工具的开发者）
- DevOps/团队负责人（需要统一团队提示词规范、确保所有成员环境一致）
- 提示词工程师/AI Agent 开发者（需要跨平台测试和发布提示词）

**市场/竞品情况**：
- **无直接竞品**：目前没有产品同时解决"跨工具格式转换 + 统一管理 + 一键部署"三个问题
- 部分重叠：
  - `agency-agents`：只做 Claude Code 格式的 Agent 集合，无转换能力
  - `system-prompts-and-models-of-ai-tools`：只做逆向提取，无部署能力
  - Cursor/Copilot 自带的规则管理：只管自家格式，无跨平台能力
- **PromptBridge007 的差异化**：PIF 统一格式 + FormatMatrix 智能转换引擎，一次创建、20+ 工具原生输出

---

### 二、业务全流程

**用户关键路径**（从打开到完成核心操作）：

```
安装(npx promptbridge007 init) → 扫描(promptbridge007 scan) → 查看提示词库 → 选择目标工具 → 一键部署(promptbridge007 deploy --tool cursor) → 验证部署结果
```

**业务核心闭环**（这个产品最核心的那个循环）：

```
输入提示词(PIF格式) → FormatMatrix格式转换 → 输出目标工具原生格式 → 部署到工具目录 → WatchEngine监听变更 → 反向同步回PIF
```

**用户核心价值点**（用户用完能得到什么？凭什么再来？）：

1. **一次编写，处处部署** — 写一次提示词，自动适配 24 种工具的原生格式，不再重复劳动
2. **环境自动发现** — 一条命令扫描本地所有 AI 工具和提示词，零配置开箱即用
3. **公共库即插即用** — 社区优质提示词一键导入，来源可追溯、许可证可审计

---

### 三、特色功能详解

| # | 功能名称 | 做了什么 | 怎么实现的（关键技术点） | 为什么别人没做/做得不一样 | 用户体感 |
|---|---------|---------|---------------------|---------------------|---------|
| 1 | FormatMatrix 格式矩阵 | 在 PIF 统一格式与 24 种工具格式之间双向转换 | 每个工具定义前向转换器(PIF→工具)和反向转换器(工具→PIF)，包括路径映射、语法适配、元数据提取 | 其他工具只管自家格式，没有跨格式转换需求；提示词仓库只存原始格式 | 选择目标工具→点部署→文件自动出现在正确位置，格式完全正确 |
| 2 | ScanEngine 环境扫描 | 自动发现本地已安装的 AI 工具及其提示词目录 | 已知路径模式匹配 + 广度优先搜索(BFS) + 文件内容特征识别，自动导入已有提示词 | 其他工具不需要"发现"，它们自己就是工具；提示词管理是新的需求场景 | 一条命令，10秒内看到本地所有 AI 工具和已有提示词 |
| 3 | 三模式部署 | 支持原版/定制/增量三种部署模式 | 原版=直接覆盖；定制=用户修改后保留定制内容；增量=只追加新增部分，不覆盖已有内容 | 其他部署工具通常是"覆盖即完事"，不关心用户已有定制 | 不会因为部署覆盖掉自己手写的定制内容，安心使用 |
| 4 | 双向同步 + Watch | 数据库↔工具目录双向同步，支持实时文件监听 | SyncEngine 推送/拉取 + WatchEngine 基于 fs.watch 实时监听文件变化，变更自动同步回数据库 | 其他工具单向输出即结束，不关心部署后用户是否手动修改 | 在工具目录里改了提示词，数据库自动更新，下次部署不会丢失修改 |
| 5 | MCP Server | AI Agent 可通过标准 MCP 协议直接调用提示词管理能力 | 暴露 8 个 MCP 工具（list_tools、deploy_prompt、search_prompts 等），支持 stdio 传输 | 这是面向 AI Agent 的接口，传统工具没有这个需求 | Claude Code / Cursor 等 AI Agent 可以直接调用提示词库，无需切换界面 |

---

### 四、技术架构

**完整技术栈**：

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端框架 | Next.js 16 (App Router) | React 19 + Turbopack |
| UI | Tailwind CSS 4 | 自定义主题 |
| 字体 | Geist (本地 woff2) | 替代 Google Fonts 避免 Workers 构建失败 |
| 后端 API | Next.js Route Handler | 纯 Next.js 实现，无框架依赖 |
| ORM | Drizzle ORM | 支持 D1 和 libsql 双模式 |
| 数据库(云端) | Cloudflare D1 | SQLite 兼容，边缘部署 |
| 数据库(本地) | libsql (Turso) | 本地开发用，file: 协议 |
| 部署 | Cloudflare Workers | @opennextjs/cloudflare 适配器 |
| CI/CD | GitHub Actions | push to main 自动部署 |
| 包管理 | npm | - |
| 语言 | TypeScript 5 | 全栈类型安全 |

**系统架构概述**：

```
用户浏览器
  ↓
Cloudflare Workers (Next.js SSR + API)
  ├── 静态资源 (ASSETS binding)
  ├── D1 数据库 (DB binding)
  └── API Route Handler (31个端点)
        ├── 直接 DB 操作 (tools, projects, files, tags, deployments...)
        ├── FormatMatrix (纯JS，Workers兼容)
        ├── ToolRegistry (纯数据，Workers兼容)
        └── 引擎 (Scan/Sync/Deploy/Watch/PublicSync) — 懒加载，仅本地可用

本地开发模式
  ├── Next.js Dev Server (localhost:3000)
  ├── libsql 本地数据库 (file:./data/promptbridge007.db)
  └── 全部引擎可用 (fs/os/child_process)
```

**关键架构决策**：

| 决策点 | 选了什么 | 放弃了什么 | 选这个的原因 | 放弃那个的原因 |
|--------|---------|-----------|------------|-------------|
| API 框架 | Next.js Route Handler | Hono | Hono 在 Workers 中触发 ComponentMod 错误，无法修复 | Hono 更轻量、路由更优雅，但与 Next.js RSC 模块系统冲突 |
| Workers 适配器 | @opennextjs/cloudflare | @cloudflare/next-on-pages | 支持 Next.js 16 | 旧适配器锁定 Next.js ≤15.5.2 |
| 数据库双模式 | D1(云端) + libsql(本地) | 纯 D1 或纯 libsql | 云端需要 D1 绑定，本地需要文件数据库 | 纯 D1 本地开发体验差，纯 libsql Workers 不支持 |
| 引擎加载策略 | 懒加载 (require/dynamic import) | 顶层 import | Workers 不支持 fs/os/child_process | 顶层 import 在 Workers 中直接崩溃 |
| 字体方案 | 本地 woff2 文件 | Google Fonts (next/font/google) | Workers 构建环境无法下载 Google Fonts | Google Fonts 更方便但 Turbopack 构建失败 |
| SPA 路由 | 不使用 _redirects | Cloudflare Pages _redirects | Workers 不需要 SPA 重定向 | _redirects 在 Workers 中导致无限循环 |

**AI模型使用明细**：

| 模型 | 用途 | 调用方式 | 选型理由 | 额度/成本情况 |
|------|------|---------|---------|-------------|
| 无 | 本项目不直接调用 AI 模型 | - | 提示词管理工具，非 AI 生成工具 | 零成本 |

**数据存储方案**：

| 存储 | 存什么 | 选型理由 |
|------|-------|---------|
| Cloudflare D1 | 工具定义、项目、提示词文件、标签、版本、部署记录、公共源 | 云端 SQLite，边缘低延迟，免费 500MB |
| libsql (本地) | 同上（开发环境） | 本地文件数据库，零依赖启动 |
| 工具目录 (文件系统) | 实际部署的提示词文件 | 各工具原生格式，如 .cursorrules、CLAUDE.md |

**数据库表结构**（9 张表）：

| 表名 | 用途 | 关键字段 |
|------|------|---------|
| tools | 24 种 AI 工具定义 | id, name, type(INT/CN), format_spec, deploy_config |
| projects | 项目/工作区 | id, name, path, is_default |
| files | 提示词文件(PIF格式) | id, name, content, content_hash, source_type, license |
| tags | 多维标签 | id, file_id, dimension(tool/role/domain/language/quality/source_type), value, confidence |
| file_versions | 版本历史 | id, file_id, version, content, change_summary |
| deployments | 部署记录 | id, file_id, tool_id, mode(original/customized/incremental), status |
| scan_sources | 扫描来源 | id, scan_id, tool_id, path |
| scan_history | 扫描历史 | id, tool_ids, status, files_found |
| public_sources | 公共库 | id, name, repo_url, repo_license, last_sync_at |

**安全与性能方案**：
- 输入验证：`validateInput()` 检查 SQL 注入和 XSS
- 输入清洗：`sanitizeInput()` 移除危险字符
- 内容哈希：`computeContentHash()` SHA-256 校验，检测变更
- 懒加载引擎：Workers 环境不加载 Node.js 模块，避免崩溃
- D1 索引：关键字段已建索引（需验证覆盖度）

---

### 五、数据与效果

**当前运营数据**：

| 指标 | 数值 | 采集方式 | 备注 |
|------|------|---------|------|
| 支持工具数 | 24 | ToolRegistry | 国际 13 + 国产 11 |
| API 端点数 | 31 | Route Handler | 全部 HTTP 200 |
| D1 数据行数 | 153 | D1 API 查询 | 12文件+93标签+24工具+6公共源+5部署+1项目+12版本 |
| D1 存储用量 | < 1 MB | 估算 | 免费额度 500 MB |
| 云端部署 | ✅ 成功 | Workers URL | CI/CD 自动部署 |
| GitHub Stars | 0 | GitHub API | 刚发布 |
| 本地提示词 | 61 条 | CL4R1T4S 导入 | 含中文翻译 |

**核心量化成果**：

| 成果 | 数据 | 推算依据 |
|------|------|---------|
| 格式覆盖 | 24 种工具 × 2 方向 = 48 个转换器 | FormatMatrix 中每个工具定义前向+反向转换 |
| API 可用率 | 100% (9/9 核心端点测试通过) | curl 测试全部返回 200 |
| 部署零成本 | $0/月 | Cloudflare 免费额度内，D1 < 1MB / 500MB |
| 构建产物 | ~3 MB Worker | Workers 免费限额 10 MB |

**性能指标**：

| 指标 | 数值 |
|------|------|
| API 响应时间 (云端) | ~200-500ms (D1 冷启动) |
| 首页加载 | ~1s (SSR + 静态资源) |
| 本地开发启动 | ~2s (next dev) |

---

### 六、项目历程与决策轨迹

**项目起源**：
AI 编程工具爆发（2024-2025），开发者同时使用 Claude Code、Cursor、Copilot 等多个工具，提示词管理混乱。没有统一方案解决跨平台提示词同步问题。PromptBridge007 应运而生，以"007号特工"的品牌调性，做提示词的跨平台特工。

**关键版本与决策**（按时间倒序）：

| 日期 | 版本 | 做了什么 | 为什么这么做 |
|------|------|---------|---------|
| 2026-06-25 | v0.1.0-cloud | Hono→Route Handler 迁移 + 引擎懒加载 + D1 种子数据 | Workers 部署后 API 全部 500，根因是 Hono 与 Workers RSC 不兼容 |
| 2026-06-24 | v0.1.0-deploy | 迁移到 @opennextjs/cloudflare + CI/CD 部署 | @cloudflare/next-on-pages 不支持 Next.js 16 |
| 2026-06-24 | v0.1.0-init | 初始版本：全功能本地开发 + GitHub 发布 | 项目从零搭建，完成核心功能 |
| 2026-06-23 | - | CL4R1T4S 61 条提示词导入 + 中文翻译 | 丰富种子数据，验证格式转换能力 |

**踩过的坑**：

| 坑 | 现象 | 根因 | 怎么解决的 |
|----|------|------|----------|
| Hono + Workers 不兼容 | `TypeError: components.ComponentMod.handler is not a function` | Hono 的 `app.fetch()` 在 Workers 运行时触发 Next.js 内部 RSC 模块系统冲突 | 彻底移除 Hono，全部迁移为 Next.js Route Handler |
| libsql 模块级加载崩溃 | `URL_SCHEME_NOT_SUPPORTED` for `file:` URLs | `@libsql/client` 在 Workers 中模块级初始化尝试创建 file: 客户端 | 改为 `require()` 懒加载，仅在本地模式调用 |
| fs/os 顶层 import 崩溃 | `[unenv] fs.mkdirSync is not implemented yet!` | Workers 运行时没有 Node.js fs/os 模块 | 5 个引擎的 fs/os/child_process 改为 `require()` 懒加载 |
| Google Fonts 构建失败 | `Can't resolve '@vercel/turbopack-next/internal/font/google/font'` | Workers 构建环境无法下载 Google Fonts | 替换为本地 woff2 字体文件 |
| _redirects 无限循环 | `Infinite loop detected in this rule` | SPA 重定向文件不适用于 Workers 部署 | 删除 _redirects，Workers 不需要 |
| next-on-pages 版本锁定 | `peer next@">=14.3.0 && <=15.5.2"` | 旧适配器不支持 Next.js 16 | 迁移到 @opennextjs/cloudflare |

---

### 七、当前状态

- **当前版本**：v0.1.0（首次云端部署成功）
- **访问链接**：https://promptbridge007.loveshixun.workers.dev/ （Workers）| http://localhost:3000 （本地）
- **运行状态**：✅正常
- **已知问题**：
  - 前端页面尚未与云端 API 联调（/app/* 页面仍调用本地 API）
  - D1 仅有 12 条种子文件，本地 61 条 CL4R1T4S 提示词尚未同步到云端
  - Scan/Sync/Deploy/Watch 引擎在 Workers 环境不可用（依赖 fs/os），仅本地模式可用
- **技术债**：
  - Hono 路由文件 (`web/src/lib/api/`) 仍存在但不再被使用，应清理
  - D1 数据库缺少索引优化（大表全表扫描可能触发行读取限额）
  - 前端页面缺少错误边界和加载状态
  - 无自动化测试
  - 环境变量硬编码在脚本中（API token 应迁移到 CI/CD secrets）

---

### 八、下一步计划

| 优先级 | 要做什么 | 为什么做 | 预期产出 |
|--------|---------|---------|---------|
| P0 | 前端与云端 API 联调 | 当前前端页面无法在云端正常使用，用户看到空数据 | /app/* 页面正确调用 Workers API |
| P1 | CL4R1T4S 61 条提示词同步到 D1 | 云端数据太少，无法展示完整功能 | D1 文件数从 12 → 73+ |
| P1 | 清理废弃的 Hono 路由代码 | 死代码增加维护负担和构建体积 | 删除 web/src/lib/api/ 目录 |
| P2 | 自定义域名绑定 | workers.dev 域名不利于 SEO 和品牌 | 绑定 promptbridge007.com 或类似域名 |
| P2 | D1 索引优化 | 防止大表全表扫描触发行读取限额 | 关键查询字段添加索引 |

---

### 九、需要Agent协助的事项

- [ ] 前端与云端 API 联调：确保 /app/* 页面在 Workers 环境正确获取数据
- [ ] CL4R1T4S 提示词批量导入 D1：将本地 61 条提示词通过 API 或 SQL 写入云端
- [ ] 无

---

### 十、补充说明

**品牌调性**：以"007号特工"为核心意象——你的提示词，007号特工全权管理。暗喻提示词管理如同特工任务：精准、高效、跨平台执行。

**设计理念**：
- **PIF (Prompt Interchange Format)** 作为核心枢纽格式，类似 JSON 之于数据交换——提示词领域的"通用中间格式"
- **格式矩阵 (Format Matrix)** 作为转换引擎，类似 Babel 之于 JavaScript——一次编写，到处运行
- **全栈 Cloudflare**：用户要求所有技术栈统一使用 Cloudflare 生态

**未来愿景**：
- 提示词市场：用户可发布和订阅优质提示词
- AI 辅助优化：接入 LLM 自动优化提示词质量
- 团队协作：多人共享提示词库，版本控制和审批流程
- 更多工具支持：持续扩展 FormatMatrix 覆盖的工具数量

**与其他项目的关系**：
- CL4R1T4S 仓库：作为公共源导入，提供 61 条高质量英文 Agent 提示词
- Coze Skill：商业化分析已完成，PromptBridge007 可作为 Coze 技能发布的提示词来源
