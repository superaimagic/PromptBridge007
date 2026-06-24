---
AIGC:
    Label: "1"
    ContentProducer: 001191110102MACQD9K64018705
    ProduceID: 2112579193014592_0/project_7654032267832066354-files/提示词管理系统/PromptBridge007-PRD.md
    ReservedCode1: ""
    ContentPropagator: 001191110102MACQD9K64028705
    PropagateID: 2112579193014592#1782107263202
    ReservedCode2: ""
---
# PromptBridge007 产品需求文档（PRD）

**版本：v1.0**  
**日期：2026-06-22**  
**作者：PromptBridge007 团队**  
**状态：草稿**  

---

## 1. 文档信息

| 字段 | 内容 |
|------|------|
| 项目名称 | PromptBridge007（词桥007） |
| 英文标识 | promptbridge007 |
| 中文名称 | 词桥007 |
| 产品版本 | v1.0 |
| 文档类型 | 产品需求文档 (PRD) |
| 目标读者 | 开发团队、项目管理者、技术评审委员会 |
| 密级 | 公开 |

### 修订历史

| 版本 | 日期 | 作者 | 变更说明 |
|------|------|------|----------|
| v1.0 | 2026-06-22 | - | 初始版本，基于 PromptBridge007 v2/v3 设计文档整合 |

---

## 2. 产品概述

### 2.1 产品愿景

PromptBridge007（词桥007）致力于成为**提示词管理的终极特工**——像 007 一样精准、高效、无处不在，让 AI 开发者能够在一个统一平台管理、分发和同步提示词资产，跨越国际与国产工具边界，实现"一次创建，处处部署"的工作流。

### 2.2 产品定位

**开源的跨平台提示词管理系统**，核心定位：

- **环境感知**：自动发现用户的 AI 工具安装环境
- **资产沉淀**：构建私有 + 公共的提示词知识库
- **格式统一**：内部 PIF (Prompt Internal Format) 统一存储
- **一键部署**：支持 20+ 主流 AI 工具的原生格式输出
- **MCP 接入**：通过 MCP Server 暴露提示词查询与部署接口，让其他 AI Agent 直接调用

### 2.3 核心价值

| 价值维度 | 具体描述 |
|----------|----------|
| **效率提升** | 无需手动转换格式，一键部署到多个工具 |
| **资产复用** | 标签化组织，快速检索和复用历史提示词 |
| **来源可追溯** | 公共库文件标注完整来源和许可证信息 |
| **工具无偏见** | 国产与国际工具同等对待，统一体验 |

### 2.4 设计哲学

PromptBridge007 遵循四条核心原则：

1. **文件是主体，标签是视图**  
   一切以文件为核心实体，标签是挂在文件上的多维元数据，用于组织和检索。

2. **来源可追溯，许可可审计**  
   公共库每个文件必须标明来源（repo、author、commit），许可证是强制字段。

3. **工具无国界，能力无差异**  
   国产工具与国际工具同等对待，使用同一套标签、部署、转换体系。

4. **Agent 原生，MCP 优先**  
   所有核心能力通过 MCP Server 暴露，让 AI Agent 能像调用本地工具一样调用提示词库。

---

## 3. 目标用户与使用场景

### 3.1 目标用户画像

#### 用户画像 A：AI 独立开发者
- **背景**：个人开发者，同时使用 Claude Code、Cursor、Coze 等多个工具
- **痛点**：在多个工具间复制粘贴提示词，维护成本高
- **诉求**：统一的提示词库，一键同步更新

#### 用户画像 B：AI 团队技术负责人
- **背景**：管理 5-10 人的 AI 开发团队，需要统一提示词规范
- **痛点**：团队成员各自维护提示词，无法共享和审计
- **诉求**：集中管理、版本控制、团队协作

#### 用户画像 C：AI 工具爱好者
- **背景**：积极尝试新工具，喜欢收集和整理优质提示词
- **痛点**：找不到优质提示词来源，或来源分散难以管理
- **诉求**：发现优质资源、便捷导入、环境扫描

#### 用户画像 D：企业 AI 转型顾问
- **背景**：帮助企业引入 AI 工具，需要快速配置和部署
- **痛点**：每个企业的工具栈不同，迁移成本高
- **诉求**：跨工具兼容、快速适配、模板化部署

### 3.2 核心使用场景

| 场景 | 描述 | 用户类型 |
|------|------|----------|
| **场景 1：环境扫描导入** | 首次使用时，扫描本地 AI 工具环境，自动导入现有提示词到私有库 | A、C |
| **场景 2：公共库探索** | 浏览社区贡献的优质提示词，按标签筛选，收藏或直接部署 | A、B、C |
| **场景 3：格式转换部署** | 将私有提示词转换为目标工具的原生格式，一键部署 | A、B、D |
| **场景 4：团队共享** | 将个人提示词发布到团队空间，团队成员可直接使用 | B |
| **场景 5：跨工具同步** | 在一个工具修改提示词后，自动同步到其他已部署的工具 | A、B |

---

## 4. 功能需求

### 4.1 功能模块总览

```
┌─────────────────────────────────────────────────────────────────┐
│                    PromptBridge007 v1.0                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│  │  环境扫描   │  │  提示词库   │  │   部署中心  │  │  同步   │ │
│  │   引擎     │  │  (私有+公共) │  │             │  │  管理   │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘ │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│  │  格式转换   │  │  多维标签   │  │   搜索过滤  │  │ MCP     │ │
│  │   矩阵      │  │   体系      │  │             │  │ Server  │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 模块 1：环境扫描引擎

**功能描述**：自动发现用户机器上安装的 AI 工具，扫描其提示词目录，提取并导入到私有库。

#### 扫描策略：两级优先

基于公共库数据源（agency-agents、system-prompts 等）的目录结构分析，这些仓库已经明确标注了各工具的提示词存放路径。扫描引擎采用**两级优先策略**：

```
第一优先级：Tool Registry 已知路径（从公共库结构 + 官方文档推导）
  → 直接扫 ~/.claude/projects/*/prompts/      （Claude Code）
  → 直接扫 ~/.cursor/prompts/                  （Cursor）
  → 直接扫 ~/.coze/bots/                       （扣子 Coze）
  → 直接扫 ~/.windsurf/prompts/                （Windsurf）
  → ...（Tool Registry 中 20+ 工具的 prompt_paths）
  → 命中率高、速度快、零误判

第二优先级：广度扫描（仅当第一级未发现新工具时触发）
  → 扫 ~/ 下常见安装目录（~/Applications、~/AppData、~/.local 等）
  → 用 detectCommands 验证工具是否实际安装
  → 递归搜索提示词文件特征（.mdc、CLAUDE.md、.cursorrules 等）
  → 速度较慢，作为兜底方案
```

**设计理由**：公共库数据源本身已包含各工具的提示词目录结构信息，直接复用这些已知路径可大幅提升扫描效率和准确率，避免全盘遍历带来的性能开销。

#### 1.1 工具发现 (Phase 1)

| 功能点 | 描述 | 优先级 |
|--------|------|--------|
| 工具检测 | 按 Tool Registry 的 detect 规则检测已安装工具 | P0 |
| 已知路径优先扫描 | 优先扫描 Tool Registry 中已注册的 prompt_paths | P0 |
| 安装验证 | 确认工具可执行且版本兼容 | P0 |
| 首次扫描引导 | 首次启动时引导用户进行环境扫描 | P1 |

#### 1.2 路径深挖 (Phase 2)

| 功能点 | 描述 | 优先级 |
|--------|------|--------|
| 已知路径目录扫描 | 递归扫描 prompt_paths 下的所有文件（第一优先级） | P0 |
| 广度路径搜索 | 在常见安装目录中搜索未注册工具的提示词特征文件（第二优先级） | P1 |
| 内容解析 | 解析文件内容，提取结构化元数据 | P0 |
| 格式识别 | 自动识别源文件格式（markdown/yaml/mdc等） | P0 |
| 公共库路径映射 | 将公共库数据源的目录结构映射到本地扫描路径，辅助路径发现 | P1 |

#### 1.3 导入私有库 (Phase 3)

| 功能点 | 描述 | 优先级 |
|--------|------|--------|
| 去重检测 | 基于 content_hash 检测重复文件 | P0 |
| 自动标注 | 根据扫描来源自动添加标签 | P0 |
| 版本记录 | 记录导入版本和导入时间 | P1 |
| 关系建立 | 建立扫描来源与文件的关联关系 | P1 |

#### 1.4 变更检测 (Phase 4)

| 功能点 | 描述 | 优先级 |
|--------|------|--------|
| 增量扫描 | 对比 hash 变化检测文件变更 | P1 |
| 变更通知 | 文件变更时提醒用户确认同步 | P1 |
| 历史回溯 | 支持查看文件的历史版本 | P2 |

### 4.3 模块 2：提示词库

#### 2.1 私有库

| 功能点 | 描述 | 优先级 |
|--------|------|--------|
| 文件浏览 | 列表/网格视图展示私有提示词 | P0 |
| 文件详情 | 查看文件完整内容和元数据 | P0 |
| 文件创建 | 创建新的提示词文件 | P0 |
| 文件编辑 | 编辑现有提示词内容 | P0 |
| 文件删除 | 删除提示词（软删除，可恢复） | P1 |
| 批量操作 | 批量移动、删除、导出文件 | P2 |

#### 2.2 公共库

| 功能点 | 描述 | 优先级 |
|--------|------|--------|
| 同步管理 | 配置公共库数据源，同步最新内容 | P0 |
| 浏览搜索 | 搜索和浏览公共库内容 | P0 |
| 收藏导入 | 将公共库文件收藏或导入到私有库 | P0 |
| 来源展示 | 展示文件的完整来源信息 | P0 |

#### 2.3 公共库数据源

| 数据源 | 许可证 | 规模 | 说明 |
|--------|--------|------|------|
| agency-agents | MIT | 232+ Agent | 主要英文 Agent 集合 |
| system-prompts-and-models-of-ai-tools | GPL-3.0 | - | 逆向提取内容 |
| awesome-openclaw-agents | MIT | - | OpenClaw 生态 |
| agency-agents-zh | MIT | 46+ Agent | 中文版，含中国原创 |
| agency-agents-ja | MIT | 97+ Agent | 日文版，含日本原创 |
| Cursor/Copilot/Coze 官方文档 | - | - | 官方格式规范 |

### 4.4 模块 3：多维标签体系

#### 3.1 标签维度（7维）

| 维度 | 必填 | 说明 | 示例值 |
|------|------|------|--------|
| **tool** | ✅ | 工具兼容性，必填，可多值，带 confidence | claude-code, cursor, coze |
| **role** | ✅ | 角色类型 | agent, system-prompt, skill, rule, template, tool-def, workflow, persona, knowledge |
| **domain** | ✅ | 业务领域，可多值 | engineering, frontend, backend, product, marketing |
| **language** | ✅ | 语言 | zh, en, ja, ko |
| **quality** | ✅ | 质量等级 | official, verified, community, experimental |
| **source_type** | ✅ | 来源类型 | public_repo, official_doc, community_submit, environment_scan, user_created, reverse_engineered |
| **custom** | ❌ | 自定义标签 | 用户自由定义 |

#### 3.2 工具标签详解

**confidence 级别定义**：

| 级别 | 说明 |
|------|------|
| full | 完全兼容，无需修改 |
| partial | 部分兼容，可能需要小幅调整 |
| experimental | 实验性支持，可能有问题 |
| incompatible | 不兼容，无法直接使用 |

**工具列表**：

| 分类 | 工具 | 检测规则 | 提示词路径 |
|------|------|----------|------------|
| **国际工具** | Claude Code | `which claude` / `claude --version` | ~/.claude/projects/*/prompts/ |
| | Cursor | `cursor --version` | ~/.cursor/prompts/ |
| | GitHub Copilot | `copilot --version` | ~/.github/copilot/ |
| | Windsurf | `windsurf --version` | ~/.windsurf/prompts/ |
| | Aider | `aider --version` | ~/.aider/prompts/ |
| | Gemini CLI | `gemini --version` | ~/.gemini/prompts/ |
| | Codex | `codex --version` | ~/.codex/prompts/ |
| | OpenCode | `opencode --version` | ~/.opencode/prompts/ |
| | OpenClaw | `openclaw --version` | ~/.openclaw/agents/ |
| | Trae | `trae --version` | ~/.trae/prompts/ |
| | Amp | `amp --version` | ~/.amp/prompts/ |
| | Kiro | `kiro --version` | ~/.kiro/prompts/ |
| | Replit | `replit --version` | ~/.replit/prompts/ |
| | Warp | `warp --version` | ~/.warp/prompts/ |
| **国产工具** | Kimi Code | `kimi-code --version` | ~/.kimi-code/prompts/ |
| | 扣子 Coze | `coze --version` | ~/.coze/bots/ |
| | 智谱 GLM | `glm --version` | ~/.glm/prompts/ |
| | 豆包 | `doubao --version` | ~/.doubao/prompts/ |
| | 通义灵码 | `tongyi-lingma --version` | ~/.tongyi/prompts/ |
| | 天工 AI | `tiangong --version` | ~/.tiangong/prompts/ |
| | Qwen Code | `qwen-code --version` | ~/.qwen-code/prompts/ |
| | DeepSeek Coder | `deepseek-coder --version` | ~/.deepseek-coder/prompts/ |
| | 星火代码 | `spark-code --version` | ~/.spark-code/prompts/ |
| | 腾讯元宝 | `yuanbao --version` | ~/.yuanbao/prompts/ |

#### 3.3 标签管理

| 功能点 | 描述 | 优先级 |
|--------|------|--------|
| 添加标签 | 为文件添加多维标签 | P0 |
| 删除标签 | 删除文件的指定标签 | P0 |
| 批量打标 | 批量为多个文件添加标签 | P1 |
| 标签建议 | 基于文件内容智能推荐标签 | P2 |
| 标签统计 | 展示各维度的标签分布统计 | P1 |

### 4.5 模块 4：格式转换引擎

#### 4.1 内部统一格式 (PIF)

所有文件内部统一存储为 **Markdown + YAML Frontmatter**：

```yaml
---
schema_version: "1.0"
id: "f8e7d6c5b4a3"
slug: "frontend-developer-agent"
name: "Frontend Developer Agent"
source:
  type: "public_repo"
  repo_name: "agency-agents"
  repo_url: "https://github.com/example/agency-agents"
  repo_license: "MIT"
  author: "username"
  author_url: "https://github.com/username"
  file_path: "engineering/frontend-developer.md"
  commit_hash: "48b5225"
  fetched_at: "2026-06-22T10:00:00Z"
license: "MIT"
license_url: "https://opensource.org/licenses/MIT"
tags:
  tool:
    - value: "claude-code"
      confidence: "full"
    - value: "cursor"
      confidence: "full"
  role: "agent"
  domain: ["engineering", "frontend"]
  language: "en"
  quality: "verified"
  source_type: "public_repo"
  custom: {}
version: 1
install_count: 2341
rating: 4.8
created_at: "2026-06-22T10:00:00Z"
updated_at: "2026-06-22T10:00:00Z"
---

# Frontend Developer Agent

[文件正文内容...]
```

#### 4.2 格式转换矩阵

| 目标格式 | 转换函数 | 说明 |
|----------|----------|------|
| **to_claude_code** | PIF → 纯 markdown | Claude Code 原生格式 |
| **to_cursor** | PIF → mdc + frontmatter | Cursor 的 .mdc 格式 |
| **to_copilot** | PIF → markdown | GitHub Copilot 格式 |
| **to_windsurf** | PIF → markdown | Windsurf 格式 |
| **to_gemini_cli** | PIF → yaml | Gemini CLI 配置格式 |
| **to_codex** | PIF → toml | Codex 配置格式 |
| **to_kimi_code** | PIF → yaml | Kimi Code 格式 |
| **to_coze** | PIF → skill_md | 扣子 Coze 技能格式 |
| **to_glm** | PIF → markdown | 智谱 GLM 格式 |
| **to_doubao** | PIF → yaml | 豆包格式 |
| **to_tongyi** | PIF → markdown | 通义灵码格式 |
| **to_deepseek_coder** | PIF → markdown | DeepSeek Coder 格式 |
| **to_qwen_code** | PIF → yaml | Qwen Code 格式 |
| **to_spark_code** | PIF → markdown | 星火代码格式 |
| **to_yuanbao** | PIF → json | 腾讯元宝格式 |
| **to_aider** | PIF → markdown | Aider 格式 |
| **to_openclaw** | PIF → skill_md | OpenClaw 技能格式 |
| **to_trae** | PIF → markdown | Trae 格式 |

#### 4.3 反向转换

| 源格式 | 转换函数 | 说明 |
|--------|----------|------|
| from_markdown | markdown → PIF | 通用 markdown |
| from_mdc | mdc → PIF | Cursor 格式 |
| from_yaml | yaml → PIF | 通用 YAML |
| from_toml | toml → PIF | Codex 格式 |
| from_json | json → PIF | 通用 JSON |
| from_skill_md | skill_md → PIF | Coze 技能格式 |

#### 4.4 格式转换功能

| 功能点 | 描述 | 优先级 |
|--------|------|--------|
| 单文件转换 | 将单个文件转换为指定格式 | P0 |
| 批量转换 | 批量转换多个文件 | P1 |
| 格式预览 | 预览转换后的格式效果 | P1 |
| 自定义模板 | 用户可定义转换模板 | P2 |

### 4.6 模块 5：部署中心

#### 5.1 三种部署模式

| 模式 | 描述 | 适用场景 |
|------|------|----------|
| **原版部署** | 直接使用，一键部署 | 快速启用完整提示词 |
| **定制部署** | 双栏编辑（只读参考 + 可编辑） | 在原版基础上定制 |
| **增量部署** | 原版内容 + 追加自定义指令 | 扩展而非修改原版 |

#### 5.2 部署功能

| 功能点 | 描述 | 优先级 |
|--------|------|--------|
| 选择文件 | 从库中选择待部署文件 | P0 |
| 选择工具 | 选择目标部署工具 | P0 |
| 选择模式 | 选择部署模式（原版/定制/增量） | P0 |
| 预览确认 | 预览部署效果并确认 | P0 |
| 执行部署 | 执行部署操作 | P0 |
| 部署历史 | 记录和管理部署历史 | P1 |
| 回滚部署 | 回滚到之前的部署版本 | P2 |

#### 5.3 部署配置

| 工具 | 部署路径 | 配置说明 |
|------|----------|----------|
| Claude Code | `~/.claude/projects/{project}/prompts/` | 需指定项目 |
| Cursor | `~/.cursor/prompts/` | 全局或项目级 |
| GitHub Copilot | `~/.github/copilot/` | 项目级配置 |
| Coze | API 部署到指定 Bot | 需 API Key |
| 其他工具 | 各自的提示词目录 | 参考 Tool Registry |

### 4.7 模块 6：同步引擎

#### 6.1 同步方向

| 方向 | 描述 | 触发时机 |
|------|------|----------|
| **PromptBridge007 → 工具** | 编辑保存后同步到已部署工具 | 手动/自动 |
| **工具 → PromptBridge007** | 检测外部修改时提示用户 | 检测到变更时 |
| **工具间间接同步** | 通过 PromptBridge007 中转 | 手动触发 |

#### 6.2 同步功能

| 功能点 | 描述 | 优先级 |
|--------|------|--------|
| 同步状态显示 | 展示各工具的同步状态 | P0 |
| 手动同步 | 手动触发同步操作 | P0 |
| 冲突处理 | 检测冲突并引导解决 | P1 |
| 同步日志 | 记录同步操作的详细日志 | P1 |
| 同步通知 | 同步结果通知 | P1 |

### 4.8 模块 7：搜索与过滤

#### 7.1 搜索功能

| 功能点 | 描述 | 优先级 |
|--------|------|--------|
| 全文搜索 | 搜索提示词内容 | P0 |
| 标签筛选 | 按 7 维标签组合筛选 | P0 |
| 高级筛选 | 组合多个条件的复杂筛选 | P1 |
| 搜索历史 | 记录和管理搜索历史 | P2 |

#### 7.2 筛选维度

| 维度 | 筛选类型 | 说明 |
|------|----------|------|
| tool | 多选 | 工具兼容性 |
| role | 单选/多选 | 角色类型 |
| domain | 多选 | 业务领域 |
| language | 单选/多选 | 语言 |
| quality | 单选/多选 | 质量等级 |
| source_type | 单选/多选 | 来源类型 |
| custom | 自定义 | 自定义标签 |

### 4.9 模块 8：MCP Server

**功能描述**：通过 Model Context Protocol (MCP) 暴露 PromptBridge007 的核心能力，让 AI Agent（如 Claude Code、Cursor Agent、OpenClaw 等）能直接调用提示词库，实现 Agent 间的提示词共享与部署。

**必要性说明**：MCP 是 2026 年 AI 工具生态的标准接口协议。没有 MCP Server，PromptBridge007 只能作为独立工具使用；有了 MCP Server，它就成为 AI Agent 生态的基础设施节点，任何 Agent 都能通过标准协议查询、获取和部署提示词。

#### 8.1 MCP Tools 定义

| Tool 名称 | 功能 | 输入 | 输出 | 优先级 |
|-----------|------|------|------|--------|
| search_prompts | 搜索提示词 | query, tags, limit | 匹配的提示词列表 | P0 |
| get_prompt | 获取提示词详情 | file_id | 完整内容 + 元数据 | P0 |
| deploy_prompt | 部署提示词到目标工具 | file_id, tool_id, deploy_mode | 部署结果 | P0 |
| list_tools | 列出已检测的工具 | - | 工具列表 + 状态 | P0 |
| scan_environment | 触发环境扫描 | - | 扫描结果摘要 | P1 |
| get_tags | 获取标签体系 | dimension | 标签列表 + 统计 | P1 |
| sync_from_tool | 从工具同步提示词 | tool_id | 同步结果 | P2 |

#### 8.2 MCP Resources 定义

| Resource URI | 描述 | 优先级 |
|-------------|------|--------|
| promptbridge://prompts/{id} | 单个提示词完整内容 | P0 |
| promptbridge://prompts/recent | 最近更新的提示词 | P1 |
| promptbridge://tools/installed | 已安装工具清单 | P1 |
| promptbridge://public-sources/status | 公共库同步状态 | P2 |

#### 8.3 MCP Server 配置

```json
{
  "mcpServers": {
    "promptbridge007": {
      "command": "bun",
      "args": ["run", "mcp-server.ts"],
      "env": {
        "PROMPTBRIDGE_DB": "~/.promptbridge007/promptbridge.db"
      }
    }
  }
}
```

#### 8.4 与 CLI / Web UI 的关系

MCP Server 是 CLI 核心能力的子集暴露，三者共享同一套 Service 层：

```
┌──────────┐  ┌──────────┐  ┌──────────┐
│   CLI    │  │  Web UI  │  │   MCP    │
│ Commander│  │ Next.js  │  │  Server  │
└────┬─────┘  └────┬─────┘  └────┬─────┘
     │              │              │
     └──────────────┼──────────────┘
                    │
           ┌────────┴────────┐
           │   Service 层    │
           │ FileService     │
           │ TagService      │
           │ DeployEngine    │
           │ ScanEngine      │
           │ FormatMatrix    │
           └─────────────────┘
```

---

## 5. 非功能需求

### 5.1 性能指标

| 指标 | 要求 | 说明 |
|------|------|------|
| 首次扫描时间 | < 30s | 10 个工具的首次完整扫描 |
| 文件转换时间 | < 500ms | 单个文件的格式转换 |
| 搜索响应时间 | < 200ms | 1000 个文件库的搜索 |
| 部署操作时间 | < 2s | 单文件到单工具的部署 |
| 启动时间 | < 3s | CLI 工具冷启动 |

### 5.2 可用性

| 指标 | 要求 |
|------|------|
| 系统可用性 | 99.5%（CLI 工具，本地运行） |
| 离线可用性 | 核心功能完全支持离线使用 |
| 数据持久化 | SQLite 本地存储，支持备份 |

### 5.3 兼容性

| 维度 | 要求 |
|------|------|
| 操作系统 | macOS 12+, Ubuntu 20.04+, Windows 10+ (WSL2) |
| 架构 | x86_64, ARM64 (Apple Silicon) |
| 运行时 | Bun 1.0+ (首选), Node.js 22+ (兼容) |
| MCP 兼容 | 支持 Claude Code、Cursor、Windsurf、OpenClaw 等主流 MCP 客户端 |

### 5.4 安全性

| 方面 | 措施 |
|------|------|
| 数据存储 | 本地 SQLite，敏感信息可选加密 |
| 外部调用 | 仅在用户授权下调用工具 CLI |
| 来源验证 | 公共库文件验证 commit hash |
| 许可证合规 | 强制标注许可证，拒绝无许可证内容 |

### 5.5 可扩展性

| 方面 | 设计 |
|------|------|
| 工具扩展 | Tool Registry 支持动态注册新工具 |
| 格式扩展 | Converter 插件支持自定义格式 |
| 存储扩展 | 支持切换到 PostgreSQL/MySQL（企业版） |

---

## 6. 数据模型

### 6.1 数据库 Schema (SQLite)

#### 表 1: tools（工具注册表）

```sql
CREATE TABLE tools (
    id TEXT PRIMARY KEY,                    -- nanoid 12位
    name TEXT NOT NULL UNIQUE,              -- 工具名称，如 "claude-code"
    display_name TEXT NOT NULL,             -- 显示名称，如 "Claude Code"
    category TEXT NOT NULL,                 -- 'international' | 'domestic'
    detect_commands TEXT NOT NULL,          -- JSON数组，检测命令
    prompt_paths TEXT NOT NULL,             -- JSON数组，提示词路径
    format_spec TEXT,                       -- JSON对象，格式规范
    deploy_config TEXT,                     -- JSON对象，部署配置
    is_active INTEGER DEFAULT 1,            -- 是否启用
    created_at TEXT NOT NULL,               -- ISO8601
    updated_at TEXT NOT NULL
);
```

#### 表 2: files（文件主体）

```sql
CREATE TABLE files (
    id TEXT PRIMARY KEY,                    -- nanoid 12位
    slug TEXT NOT NULL UNIQUE,              -- URL友好标识符
    name TEXT NOT NULL,                     -- 文件名
    content TEXT NOT NULL,                  -- 文件正文
    content_hash TEXT NOT NULL,             -- sha256 hash
    format TEXT NOT NULL,                   -- markdown|yaml|toml|json|mdc|xml|txt|skill_md
    
    -- 来源信息
    source_type TEXT NOT NULL,              -- public_repo|official|community|scanned|user_created|reverse_engineered
    repo_name TEXT,
    repo_url TEXT,
    repo_license TEXT,
    author TEXT,
    author_url TEXT,
    file_path TEXT,
    commit_hash TEXT,
    fetched_at TEXT,
    
    -- 许可证（必填）
    license TEXT NOT NULL,
    license_url TEXT,
    
    -- 统计
    version INTEGER DEFAULT 1,
    install_count INTEGER DEFAULT 0,
    rating REAL DEFAULT 0,
    
    -- 时间戳
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,                        -- 软删除
    
    -- 索引
    UNIQUE(content_hash)                   -- 基于内容去重
);

CREATE INDEX idx_files_slug ON files(slug);
CREATE INDEX idx_files_license ON files(license);
CREATE INDEX idx_files_source_type ON files(source_type);
CREATE INDEX idx_files_created_at ON files(created_at);
```

#### 表 3: tags（多维标签）

```sql
CREATE TABLE tags (
    id TEXT PRIMARY KEY,
    file_id TEXT NOT NULL,
    dimension TEXT NOT NULL,                -- tool|role|domain|language|quality|source_type|custom
    value TEXT NOT NULL,
    confidence TEXT,                        -- 仅 dimension=tool 时使用：full|partial|experimental|incompatible
    created_at TEXT NOT NULL,
    
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
    UNIQUE(file_id, dimension, value)
);

CREATE INDEX idx_tags_file_id ON tags(file_id);
CREATE INDEX idx_tags_dimension ON tags(dimension);
CREATE INDEX idx_tags_value ON tags(value);
CREATE INDEX idx_tags_dimension_value ON tags(dimension, value);
```

#### 表 4: file_versions（版本历史）

```sql
CREATE TABLE file_versions (
    id TEXT PRIMARY KEY,
    file_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    content TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    change_summary TEXT,
    created_at TEXT NOT NULL,
    
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
    UNIQUE(file_id, version)
);

CREATE INDEX idx_file_versions_file_id ON file_versions(file_id);
```

#### 表 5: deployments（部署关系）

```sql
CREATE TABLE deployments (
    id TEXT PRIMARY KEY,
    file_id TEXT NOT NULL,
    tool_id TEXT NOT NULL,
    mode TEXT NOT NULL,                     -- original|customized|incremental
    target_path TEXT NOT NULL,               -- 部署目标路径
    deployed_content TEXT,                   -- 部署时的内容快照
    status TEXT NOT NULL,                   -- pending|success|failed|conflict
    error_message TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
    FOREIGN KEY (tool_id) REFERENCES tools(id)
);

CREATE INDEX idx_deployments_file_id ON deployments(file_id);
CREATE INDEX idx_deployments_tool_id ON deployments(tool_id);
CREATE INDEX idx_deployments_status ON deployments(status);
```

#### 表 6: scan_sources（环境扫描来源）

```sql
CREATE TABLE scan_sources (
    id TEXT PRIMARY KEY,
    tool_id TEXT NOT NULL,
    source_path TEXT NOT NULL,               -- 扫描的目录路径
    is_recursive INTEGER DEFAULT 1,
    file_pattern TEXT,                       -- 如 "*.md", "*.yaml"
    created_at TEXT NOT NULL,
    
    FOREIGN KEY (tool_id) REFERENCES tools(id)
);
```

#### 表 7: scan_history（扫描历史）

```sql
CREATE TABLE scan_history (
    id TEXT PRIMARY KEY,
    tool_id TEXT,
    scan_type TEXT NOT NULL,                -- full|incremental
    files_found INTEGER DEFAULT 0,
    files_imported INTEGER DEFAULT 0,
    files_updated INTEGER DEFAULT 0,
    files_skipped INTEGER DEFAULT 0,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    status TEXT NOT NULL,                   -- running|completed|failed
    error_message TEXT
);

CREATE INDEX idx_scan_history_tool_id ON scan_history(tool_id);
CREATE INDEX idx_scan_history_started_at ON scan_history(started_at);
```

#### 表 8: public_sources（公共库同步源）

```sql
CREATE TABLE public_sources (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    repo_url TEXT NOT NULL,
    repo_license TEXT,
    description TEXT,
    local_path TEXT,                         -- 本地缓存路径
    last_sync_at TEXT,
    last_commit_hash TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
```

### 6.2 数据关系图

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────┐
│    tools    │────▶│  deployments│◀────│      files      │
└─────────────┘     └─────────────┘     └─────────────────┘
       │                                         │
       │                                         │
       ▼                                         ▼
┌─────────────┐                         ┌─────────────┐
│ scan_sources│                         │     tags    │
└─────────────┘                         └─────────────┘
       │
       ▼
┌─────────────┐     ┌─────────────────┐
│scan_history │     │ public_sources  │
└─────────────┘     └─────────────────┘

┌─────────────────┐
│  file_versions  │
└─────────────────┘
```

---

## 7. API 设计

### 7.1 API 概述

- **Base URL**: `http://localhost:4783/api` (本地 CLI 模式)
- **认证方式**: 本地服务，无需认证
- **响应格式**: JSON
- **分页**: 使用 `page` 和 `page_size` 参数

### 7.2 通用响应格式

```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "meta": {
    "page": 1,
    "page_size": 20,
    "total": 100
  }
}
```

错误响应：

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "FILE_NOT_FOUND",
    "message": "文件不存在"
  }
}
```

### 7.3 环境扫描 API

#### POST /api/scan

启动环境扫描。

**请求体**：

```json
{
  "tool_ids": ["claude-code", "cursor"],  // 可选，指定工具；为空则扫描全部
  "scan_type": "full"                      // full | incremental
}
```

**响应**：

```json
{
  "success": true,
  "data": {
    "scan_id": "scan_abc123",
    "status": "running",
    "started_at": "2026-01-15T10:00:00Z"
  }
}
```

#### GET /api/scan/{scan_id}

获取扫描结果。

**响应**：

```json
{
  "success": true,
  "data": {
    "scan_id": "scan_abc123",
    "status": "completed",
    "tool_id": "claude-code",
    "files_found": 12,
    "files_imported": 10,
    "files_updated": 2,
    "files_skipped": 0,
    "started_at": "2026-01-15T10:00:00Z",
    "completed_at": "2026-01-15T10:00:15Z"
  }
}
```

### 7.4 文件管理 API

#### GET /api/files

浏览文件列表。

**查询参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| page | int | 页码，默认 1 |
| page_size | int | 每页数量，默认 20 |
| library | string | 'private' \| 'public'，默认全部 |
| search | string | 搜索关键词 |
| tool | string | 工具标签筛选（逗号分隔多值） |
| role | string | 角色标签 |
| domain | string | 领域标签（逗号分隔多值） |
| language | string | 语言标签 |
| quality | string | 质量标签 |
| source_type | string | 来源类型 |
| sort | string | 'created_at' \| 'updated_at' \| 'install_count' \| 'rating' |
| order | string | 'asc' \| 'desc' |

**响应**：

```json
{
  "success": true,
  "data": [
    {
      "id": "f8e7d6c5b4a3",
      "slug": "frontend-developer-agent",
      "name": "Frontend Developer Agent",
      "license": "MIT",
      "tags": {
        "tool": [{"value": "claude-code", "confidence": "full"}],
        "role": "agent",
        "domain": ["engineering", "frontend"],
        "language": "en",
        "quality": "verified"
      },
      "install_count": 2341,
      "rating": 4.8,
      "created_at": "2026-06-22T10:00:00Z",
      "updated_at": "2026-06-22T10:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "page_size": 20,
    "total": 156
  }
}
```

#### GET /api/files/{file_id}

获取文件详情。

**响应**：

```json
{
  "success": true,
  "data": {
    "id": "f8e7d6c5b4a3",
    "slug": "frontend-developer-agent",
    "name": "Frontend Developer Agent",
    "content": "# Frontend Developer Agent\n\nYou are...",
    "content_hash": "sha256:abc123...",
    "format": "markdown",
    "source": {
      "type": "public_repo",
      "repo_name": "agency-agents",
      "repo_url": "https://github.com/example/agency-agents",
      "repo_license": "MIT",
      "author": "msitarzewski",
      "author_url": "https://github.com/msitarzewski",
      "file_path": "engineering/frontend-developer.md",
      "commit_hash": "48b5225",
      "fetched_at": "2026-06-22T10:00:00Z"
    },
    "license": "MIT",
    "license_url": "https://opensource.org/licenses/MIT",
    "tags": {
      "tool": [
        {"value": "claude-code", "confidence": "full"},
        {"value": "cursor", "confidence": "full"},
        {"value": "coze", "confidence": "partial"}
      ],
      "role": "agent",
      "domain": ["engineering", "frontend"],
      "language": "en",
      "quality": "verified",
      "source_type": "public_repo"
    },
    "version": 1,
    "install_count": 2341,
    "rating": 4.8,
    "created_at": "2026-06-22T10:00:00Z",
    "updated_at": "2026-06-22T10:00:00Z",
    "deployments": [
      {
        "tool_id": "claude-code",
        "status": "success",
        "last_deployed_at": "2026-01-10T08:00:00Z"
      }
    ]
  }
}
```

#### POST /api/files

创建文件。

**请求体**：

```json
{
  "name": "My Custom Agent",
  "content": "# My Custom Agent\n\nYou are...",
  "format": "markdown",
  "license": "MIT",
  "tags": {
    "tool": [{"value": "claude-code", "confidence": "full"}],
    "role": "agent",
    "domain": ["general"],
    "language": "en",
    "quality": "community"
  }
}
```

#### PUT /api/files/{file_id}

更新文件。

**请求体**：

```json
{
  "name": "Updated Agent Name",
  "content": "# Updated Content\n\n...",
  "tags": { ... }
}
```

### 7.5 标签管理 API

#### POST /api/files/{file_id}/tags

添加标签。

**请求体**：

```json
{
  "dimension": "tool",
  "value": "cursor",
  "confidence": "full"
}
```

#### DELETE /api/files/{file_id}/tags/{dimension}/{value}

删除标签。

### 7.6 搜索 API

#### POST /api/files/search

标签组合查询。

**请求体**：

```json
{
  "query": "frontend developer",
  "tags": {
    "tool": ["claude-code", "cursor"],
    "role": "agent",
    "domain": ["engineering"],
    "language": ["en", "zh"],
    "quality": ["verified", "official"]
  },
  "must_have_all_tags": false,
  "page": 1,
  "page_size": 20
}
```

### 7.7 格式转换 API

#### POST /api/convert

格式转换。

**请求体**：

```json
{
  "file_id": "f8e7d6c5b4a3",
  "target_format": "to_cursor"
}
```

**响应**：

```json
{
  "success": true,
  "data": {
    "converted_content": "---\nname: Frontend Developer Agent\n...\n---\n\n# Frontend Developer Agent\n\n...",
    "format": "mdc",
    "preview": true
  }
}
```

### 7.8 部署 API

#### POST /api/deploy

发起部署。

**请求体**：

```json
{
  "file_id": "f8e7d6c5b4a3",
  "tool_id": "cursor",
  "mode": "customized",
  "custom_content": "# Custom Instructions\n\nAdditional rules..."
}
```

**响应**：

```json
{
  "success": true,
  "data": {
    "deploy_id": "deploy_xyz789",
    "status": "success",
    "target_path": "~/.cursor/prompts/frontend-developer.mdc",
    "deployed_at": "2026-01-15T10:30:00Z"
  }
}
```

#### GET /api/deploy/{deploy_id}

获取部署结果。

### 7.9 同步 API

#### POST /api/sync

同步更新。

**请求体**：

```json
{
  "direction": "to_tool",          // to_tool | from_tool
  "file_id": "f8e7d6c5b4a3",
  "tool_id": "claude-code"
}
```

### 7.10 公共库 API

#### GET /api/public-sources

获取公共库数据源列表。

#### POST /api/public-sources/{source_id}/sync

同步指定公共库。

---

## 8. UI/UX 设计要点

### 8.1 设计原则

1. **简洁高效**：信息密度适中，操作路径短
2. **视觉一致**：遵循统一的设计语言
3. **无差别体验**：国产与国际工具界面一致
4. **渐进式披露**：复杂功能分层展示

### 8.2 整体布局

```
┌──────────────────────────────────────────────────────────────────┐
│  Logo  PromptBridge007 v1.0                    [搜索框]  [设置] [帮助]  │
├────────────────┬─────────────────────────────────────────────────┤
│                │                                                 │
│  环境扫描      │                                                 │
│  ──────────    │              主内容区域                         │
│  提示词库      │                                                 │
│    ├ 私有库    │           (文件列表/详情/编辑器)                │
│    └ 公共库    │                                                 │
│  ──────────    │                                                 │
│  部署中心      │                                                 │
│  同步管理      │                                                 │
│  ──────────    │                                                 │
│  设置          │                                                 │
│                │                                                 │
└────────────────┴─────────────────────────────────────────────────┘
```

### 8.3 侧边栏设计

| 菜单项 | 功能 | 图标 |
|--------|------|------|
| 环境扫描 | 启动环境扫描向导 | 🔍 |
| 私有库 | 管理私有提示词 | 📁 |
| 公共库 | 浏览社区资源 | 🌐 |
| 部署中心 | 管理部署关系 | 🚀 |
| 同步管理 | 查看同步状态 | 🔄 |
| 设置 | 应用配置 | ⚙️ |

### 8.4 公共库浏览页

**布局**：

```
┌──────────────────────────────────────────────────────────────────┐
│  公共库                                              [同步] [刷新]│
├──────────────────────────────────────────────────────────────────┤
│  [搜索框: 输入关键词搜索...]                                      │
├────────────┬─────────────────────────────────────────────────────┤
│  筛选面板   │                                                     │
│  ───────   │   文件卡片列表                                       │
│  工具      │   ┌─────────┐ ┌─────────┐ ┌─────────┐              │
│  □ Claude  │   │ 卡片1   │ │ 卡片2   │ │ 卡片3   │              │
│  □ Cursor  │   └─────────┘ └─────────┘ └─────────┘              │
│  □ Coze    │                                                     │
│  ───────   │   ┌─────────┐ ┌─────────┐ ┌─────────┐              │
│  角色      │   │ 卡片4   │ │ 卡片5   │ │ 卡片6   │              │
│  ○ 全部    │   └─────────┘ └─────────┘ └─────────┘              │
│  ○ Agent   │                                                     │
│  ○ Skill   │   [加载更多...]                                      │
│  ───────   │                                                     │
│  领域      │                                                     │
│  □ 前端    │                                                     │
│  □ 后端    │                                                     │
│  ───────   │                                                     │
│  语言      │                                                     │
│  ○ 全部    │                                                     │
│  ○ 中文    │                                                     │
│  ○ 英文    │                                                     │
└────────────┴─────────────────────────────────────────────────────┘
```

### 8.5 文件详情页

**布局**：

```
┌──────────────────────────────────────────────────────────────────┐
│  ← 返回   Frontend Developer Agent                    [编辑][部署]│
├────────────────────────────────┬─────────────────────────────────┤
│  标签面板                       │   内容预览                       │
│  ─────────                     │   ───────                       │
│  工具兼容性                     │                                 │
│  [Claude Code ✓] [Cursor ✓]    │   # Frontend Developer Agent    │
│  [Coze ⚠️]                     │                                 │
│  ─────────                     │   You are an expert frontend... │
│  角色: Agent                   │                                 │
│  ─────────                     │                                 │
│  领域                          │                                 │
│  [engineering] [frontend]     │                                 │
│  ─────────                     │                                 │
│  语言: 英文                     │                                 │
│  ─────────                     │                                 │
│  质量: 已验证                   │                                 │
│  ─────────                     │                                 │
│  来源信息                       │                                 │
│  仓库: agency-agents            │                                 │
│  作者: username                │                                 │
│  许可证: MIT                   │                                 │
│  ─────────                     │                                 │
│  部署状态                       │                                 │
│  Claude Code ✓ 已部署           │                                 │
│  Cursor ✓ 已部署                │                                 │
└────────────────────────────────┴─────────────────────────────────┘
```

### 8.6 部署向导

**步骤 1：选择文件**

- 文件列表 + 搜索
- 支持多选

**步骤 2：选择工具**

- 工具网格卡片展示
- 显示兼容性状态

**步骤 3：选择模式**

- 原版部署：直接使用
- 定制部署：双栏编辑 + diff
- 增量部署：追加自定义指令

**步骤 4：确认部署**

- 预览部署效果
- 确认目标路径
- 确认后执行

### 8.7 项目介绍页（Landing Page）

项目介绍页与 Web 管理界面共用一套 Next.js 应用，通过路由区分：

- `/` → 项目介绍页（Landing Page），SSG 静态生成，SEO 友好
- `/app` → 管理界面，SPA 模式

#### 页面结构

| 板块 | 内容 | 设计要点 |
|------|------|----------|
| **Hero 区** | 产品名 + 一句话定位 + 安装命令 | 大字标题 "PromptBridge007"，副标题 "你的提示词，007号特工全权管理"，安装命令 `npx promptbridge007 init` |
| **核心特性** | 5 大核心能力 | 环境扫描 / 一键部署 / 格式转换 / 公共库 / MCP 接入，每项配图标 + 3 行描述 |
| **支持工具墙** | 20+ 工具 logo 网格 | 国际工具 + 国产工具混排，hover 显示工具名称，已支持标绿色边框 |
| **架构图** | PIF 统一格式 → 多工具输出 | 可视化流程图，突出"一次创建，处处部署" |
| **MCP 集成** | AI Agent 直接调用演示 | 代码块展示 MCP 配置 + 调用示例 |
| **快速开始** | 3 步上手 | 1.安装 → 2.扫描 → 3.部署，每步配命令行示例 |
| **开源社区 CTA** | GitHub Star + 贡献引导 | GitHub 链接、贡献指南链接、MIT 许可证标识 |

#### 设计风格

- **深色主题为主**：匹配开发者工具调性（VS Code / Cursor 风格）
- **007 彩蛋**：微妙的特工元素（如安装命令后的 "Licensed to prompt" 提示）
- **动画**：滚动渐入效果，工具墙 hover 缩放

---

## 9. 技术架构建议

### 9.1 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        用户界面层 (UI)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  Web UI    │  │   CLI       │  │  MCP        │             │
│  │  (Next.js) │  │  (Commander)│  │  Server     │             │
│  │  / → 介绍页│  │             │  │  (Agent接入) │             │
│  │  /app → 管理│  │             │  │             │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
├─────────────────────────────────────────────────────────────────┤
│                        API 层                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  Hono (轻量 API，CLI 内嵌)               │   │
│  │  /api/scan  /api/files  /api/deploy  /api/sync          │   │
│  └─────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│                        服务层                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ ScanService  │  │ FileService  │  │DeployService │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ TagService   │  │ConvertService│  │ SyncService  │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
├─────────────────────────────────────────────────────────────────┤
│                        核心引擎                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ToolRegistry │  │FormatMatrix  │  │DeployEngine  │         │
│  │ (工具注册)   │  │ (格式转换)   │  │  (部署引擎)  │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
├─────────────────────────────────────────────────────────────────┤
│                        数据层                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │            SQLite (默认) / PostgreSQL (可选)             │   │
│  │  tools | files | tags | file_versions | deployments     │   │
│  └─────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│                        工具层                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │Claude Code  │  │   Cursor     │  │   Coze      │         │
│  │  CLI集成     │  │   集成       │  │   API集成    │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

### 9.2 技术选型

| 层级 | 技术栈 | 说明 | 选型理由 |
|------|--------|------|----------|
| **运行时** | Bun | CLI 启动速度比 Node.js 快 3-5x | 2026年CLI工具主流选择，Ollama/PromptHub等均已迁移 |
| **语言** | TypeScript 5+ | 类型安全，全栈统一 | AI工具生态第一语言，LLM代码生成准确率最高 |
| **Web 框架** | Next.js 15 + React 19 | SSG项目介绍页 + SPA管理界面 | 一套代码覆盖Landing Page（/）和Web UI（/app） |
| **API 层** | Hono | 轻量、CLI内嵌、Bun原生支持 | 替代Express，启动快、体积小，适合CLI内嵌API |
| **UI 组件** | shadcn/ui | 复制式组件，100k+ star | 2026前端标配，Tailwind原生，无运行时依赖 |
| **样式** | Tailwind CSS v4 | 原子化CSS | 与shadcn/ui配合，零配置 |
| **数据库** | SQLite (默认) / PostgreSQL (可选) | 本地优先，企业版可扩展 | 开源工具零依赖首选 |
| **ORM** | Drizzle ORM | 轻量、TypeScript原生、无运行时开销 | 比Prisma更轻，类型推断更精确 |
| **CLI 框架** | Commander + Ink | 命令式 + 交互式界面 | Commander处理命令解析，Ink处理交互式UI |
| **AI 集成** | MCP Server (Model Context Protocol) | 暴露提示词查询/部署接口 | 2026年AI工具标配协议，缺失则Agent无法调用 |
| **文件监控** | chokidar | 跨平台文件变更检测 | 成熟稳定 |
| **ID 生成** | nanoid | 短ID生成 | 轻量 |
| **HTTP 客户端** | ky | 基于fetch的现代HTTP客户端 | 比axios更轻，Bun原生fetch |
| **日志** | pino | 高性能结构化日志 | Node/Bun生态标准 |

### 9.3 核心模块设计

#### 9.3.1 ToolRegistry

```typescript
interface ToolRegistry {
  // 注册工具
  register(tool: ToolDefinition): void;
  
  // 检测工具是否安装
  detect(toolId: string): Promise<boolean>;
  
  // 获取工具信息
  get(toolId: string): ToolDefinition | null;
  
  // 获取所有工具
  getAll(): ToolDefinition[];
  
  // 按类别获取工具
  getByCategory(category: 'international' | 'domestic'): ToolDefinition[];
}
```

#### 9.3.2 FormatMatrix

```typescript
interface FormatMatrix {
  // 注册转换器
  registerConverter(format: string, converter: FormatConverter): void;
  
  // PIF 转换为目标格式
  toFormat(pif: FileEntity, targetFormat: string): string;
  
  // 源格式转换为 PIF
  fromFormat(content: string, sourceFormat: string): Partial<FileEntity>;
  
  // 获取支持的目标格式列表
  getSupportedFormats(): string[];
}
```

#### 9.3.3 DeployEngine

```typescript
interface DeployEngine {
  // 部署文件
  deploy(request: DeployRequest): Promise<DeployResult>;
  
  // 同步到工具
  syncToTool(fileId: string, toolId: string): Promise<SyncResult>;
  
  // 从工具同步
  syncFromTool(toolId: string): Promise<SyncResult>;
  
  // 获取部署状态
  getDeploymentStatus(fileId: string, toolId: string): Deployment | null;
  
  // 回滚部署
  rollback(deployId: string): Promise<void>;
}
```

### 9.4 目录结构建议

```
promptms/
├── src/
│   ├── cli/                    # CLI 入口
│   │   ├── index.ts
│   │   └── commands/
│   ├── api/                    # API 服务
│   │   ├── server.ts
│   │   └── routes/
│   ├── core/                   # 核心引擎
│   │   ├── ToolRegistry.ts
│   │   ├── FormatMatrix.ts
│   │   ├── DeployEngine.ts
│   │   └── ScanEngine.ts
│   ├── services/               # 业务服务
│   │   ├── FileService.ts
│   │   ├── TagService.ts
│   │   ├── SyncService.ts
│   │   └── PublicSourceService.ts
│   ├── db/                     # 数据层
│   │   ├── schema.ts
│   │   ├── migrations/
│   │   └── repositories/
│   ├── tools/                  # 工具集成
│   │   ├── claude-code.ts
│   │   ├── cursor.ts
│   │   └── coze.ts
│   ├── converters/            # 格式转换器
│   │   ├── to-claude-code.ts
│   │   ├── to-cursor.ts
│   │   └── to-coze.ts
│   ├── mcp/                    # MCP Server
│   │   ├── server.ts           # MCP Server 入口
│   │   ├── tools.ts            # MCP Tools 定义
│   │   └── resources.ts        # MCP Resources 定义
│   ├── types/                  # 类型定义
│   │   ├── FileEntity.ts
│   │   ├── Tag.ts
│   │   └── Tool.ts
│   └── utils/                  # 工具函数
│       ├── hash.ts
│       ├── nanoid.ts
│       └── path.ts
├── web/                        # Web 应用（Next.js）
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx        # / 介绍页（Landing Page）
│   │   │   ├── layout.tsx      # 根布局
│   │   │   └── app/            # /app 管理界面
│   │   │       ├── page.tsx
│   │   │       └── layout.tsx
│   │   ├── components/
│   │   │   ├── landing/        # 介绍页组件
│   │   │   │   ├── Hero.tsx
│   │   │   │   ├── Features.tsx
│   │   │   │   ├── ToolWall.tsx
│   │   │   │   ├── Architecture.tsx
│   │   │   │   └── QuickStart.tsx
│   │   │   └── ui/            # shadcn/ui 组件
│   │   ├── hooks/
│   │   └── lib/
│   ├── public/
│   └── package.json
├── data/                       # 数据目录
│   ├── promptbridge007.db
│   └── public-sources/
├── tests/                      # 测试
├── package.json
├── tsconfig.json
└── README.md
```

---

## 10. 合规方案（开源版）

### 10.1 合规原则

PromptBridge007 作为开源工具，遵循**简单、透明、信任**的合规原则。

### 10.2 公共库文件合规

#### 来源标注

每个公共库文件必须包含完整的来源信息：

```yaml
source:
  type: "public_repo"
  repo_name: "agency-agents"
  repo_url: "https://github.com/example/agency-agents"
  repo_license: "MIT"
  author: "username"
  author_url: "https://github.com/username"
  file_path: "path/to/file.md"
  commit_hash: "48b5225"
  fetched_at: "2026-01-15T10:00:00Z"
```

#### 许可证字段

- **必填字段**：`license` 字段不可为空
- **许可证列表**：MIT、Apache-2.0、GPL-3.0、BSD 等开源许可证
- **未知许可证**：标记为 `unknown`，默认不允许导入

### 10.3 逆向工程内容处理

对于通过逆向提取获取的内容（`source_type: reverse_engineered`）：

1. **界面警示**：显示 ⚠️ 图标和提示文字
2. **免责声明**：提示"第三方逆向提取，仅供学习参考"
3. **功能限制**：不支持直接部署，仅供浏览

### 10.4 用户协议

#### README 免责声明

在项目 README 中添加免责声明：

```markdown
## 免责声明

PromptBridge007 尊重开源许可证和知识产权：

1. **公共库内容**：来自第三方仓库，使用前请自行确认目标仓库的许可证
2. **逆向内容**：标识为"逆向提取"的内容仅供学习参考，使用前请自行评估
3. **用户责任**：用户对提示词的使用方式承担全部责任
4. **无担保**：PromptBridge007 对内容准确性、合法性不做任何保证
```

### 10.5 许可证管理

| 许可证类型 | 处理方式 |
|------------|----------|
| MIT、Apache-2.0、BSD | 正常导入和使用 |
| GPL-3.0 | 提示 GPL 传染性，商用需注意 |
| CC 系列 | 标注归属，商用需确认具体条款 |
| Proprietary | 拒绝导入 |
| Unknown | 拒绝导入 |

### 10.6 开源版 vs SaaS 版差异

| 功能 | 开源版 | SaaS 版 |
|------|--------|---------|
| 来源标注 | ✅ 必需 | ✅ 必需 |
| 许可证字段 | ✅ 必需 | ✅ 必需 |
| 逆向内容警示 | ✅ 显示提示 | ✅ 显示提示 |
| 免责声明 | ✅ README | ✅ 用户协议 |
| CLA 签署 | ❌ 不支持 | ✅ 可选 |
| DMCA 处理 | ❌ 不支持 | ✅ 自动响应 |
| 许可证审计 | ❌ 不支持 | ✅ 可选 |
| 三级隔离 | ❌ 不支持 | ✅ 支持 |

---

## 11. 开发路线图

### 11.1 整体规划

```
Phase 1 ─────────────────────────────────────▶
核心基础 + MCP Server（7周）

Phase 2 ─────────────────────────────────────────────────────▶
公共库+定制部署+项目介绍页（5周）

Phase 3 ──────────────────────────────────────────────────────────────────▶
Web UI+体验优化（4周）

Phase 4 ───────────────────────────────────────────────────────────────────────────────▶
生态建设（持续）
```

### 11.2 Phase 1：核心基础 + MCP Server

**目标**：完成数据层、CLI 核心功能、MCP Server 基础接口

**时间**：7 周

| 周次 | 任务 | 交付物 |
|------|------|--------|
| Week 1 | 项目初始化、数据库 Schema | 项目框架（Bun + TS）、数据库表 |
| Week 2 | ToolRegistry 实现 | 工具注册表、10+ 工具配置 |
| Week 3 | 环境扫描引擎 Phase 1-2（两级优先策略） | 工具检测、已知路径优先扫描 |
| Week 4 | 文件 CRUD API（Hono） | REST API 基础 |
| Week 5 | 多维标签体系 | 标签管理 API |
| Week 6 | CLI 基础命令 | `scan`、`list`、`search`、`view` 命令 |
| Week 7 | MCP Server 基础 | search_prompts、get_prompt、list_tools 三个核心 Tool |

**验收标准**：
- [ ] 数据库 8 张表创建完成
- [ ] 支持 10+ 工具的环境检测（优先扫描已知路径）
- [ ] 文件增删改查功能可用
- [ ] 7 维标签体系完整实现
- [ ] CLI 基础命令可用
- [ ] MCP Server 可被 Claude Code / Cursor 调用

### 11.3 Phase 2：公共库 + 定制部署 + 项目介绍页

**目标**：数据同步、格式转换、部署功能、项目官网

**时间**：5 周

| 周次 | 任务 | 交付物 |
|------|------|--------|
| Week 8 | 公共库同步 | 5+ 数据源同步能力 |
| Week 9 | FormatMatrix 实现 | 格式转换引擎 |
| Week 10 | 基础部署 + 定制部署 | 原版部署 + 双栏编辑器 |
| Week 11 | 同步引擎 + MCP 完善 | 双向同步 + deploy_prompt、scan_environment |
| Week 12 | 项目介绍页（Landing Page） | Next.js / 路由，Hero+Features+ToolWall+QuickStart |

**验收标准**：
- [ ] 支持 5+ 公共库数据源同步
- [ ] 支持 15+ 格式的相互转换
- [ ] 三种部署模式完整实现
- [ ] 同步引擎双向同步可用
- [ ] 项目介绍页在线可访问
- [ ] MCP Server 支持 7 个 Tool

### 11.4 Phase 3：Web UI + 体验优化

**目标**：管理界面、国产工具适配

**时间**：4 周

| 周次 | 任务 | 交付物 |
|------|------|--------|
| Week 13 | Web 管理界面框架 | Next.js /app 路由、shadcn/ui 集成 |
| Week 14 | 核心管理页面 | 侧边栏、公共库浏览、文件详情、标签管理 |
| Week 15 | 部署向导 | 可视化部署流程、diff 预览 |
| Week 16 | 国产工具适配 | 10+ 国产工具支持 |

**验收标准**：
- [ ] Web 管理界面完整可用
- [ ] 5 个核心页面实现
- [ ] 部署向导完整可用
- [ ] 国产工具检测和部署支持

### 11.5 Phase 4：生态建设（持续）

**目标**：插件市场、工作流编排、社区系统

| 功能 | 优先级 | 说明 |
|------|--------|------|
| 插件市场 | P1 | 工具格式插件 |
| 工作流编排 | P1 | 多个提示词组合 |
| MCP Resources 完整实现 | P1 | promptbridge:// 资源协议，支持所有 Resource 定义 |
| 数据感知 | P2 | 使用情况分析 |
| 社区系统 | P2 | 用户贡献和评分 |
| VSCode 插件 | P2 | IDE 内集成 |

---

## 12. 成功指标

### 12.1 产品指标

| 指标 | 目标 | 衡量方式 |
|------|------|----------|
| 工具支持数 | 20+ | 工具注册表数量 |
| 格式支持数 | 15+ | 转换矩阵覆盖 |
| 公共库文件数 | 500+ | 同步后的文件数 |
| 用户满意度 | 4.5/5 | 用户调研 |

### 12.2 技术指标

| 指标 | 目标 | 衡量方式 |
|------|------|----------|
| 首次扫描时间 | < 30s | 性能测试 |
| 文件转换时间 | < 500ms | 性能测试 |
| 搜索响应时间 | < 200ms | 性能测试 |
| 部署成功率 | > 99% | 部署日志统计 |
| 系统稳定性 | MTBF > 7 天 | 故障统计 |

### 12.3 社区指标

| 指标 | 目标 | 衡量方式 |
|------|------|----------|
| GitHub Stars | 1,000+ | 6 个月 |
| 贡献者数 | 50+ | PR 统计 |
| 工具适配提交 | 100+ | Issue/PR |
| 社区讨论 | 活跃 | 论坛活跃度 |

---

## 13. 风险与应对

### 13.1 技术风险

| 风险 | 影响 | 概率 | 应对措施 |
|------|------|------|----------|
| 工具路径变更 | 高 | 中 | Tool Registry 配置化，支持用户自定义 |
| 格式规范不兼容 | 中 | 中 | 实验性标签 + 用户反馈机制 |
| 大文件性能问题 | 中 | 低 | 分页加载 + 流式处理 |

### 13.2 法律风险

| 风险 | 影响 | 概率 | 应对措施 |
|------|------|------|----------|
| 许可证侵权 | 高 | 低 | 强制许可证字段 + README 免责 |
| 逆向内容争议 | 中 | 中 | 明确标识 + 使用限制 |
| 数据跨境合规 | 中 | 低 | 本地存储优先（企业版可选） |

### 13.3 市场风险

| 风险 | 影响 | 概率 | 应对措施 |
|------|------|------|----------|
| 竞品追赶 | 中 | 中 | 快速迭代 + 差异化功能 |
| 工具停止维护 | 中 | 中 | 多工具支持 + 社区替代 |
| 用户需求变化 | 低 | 中 | 持续用户调研 + 敏捷开发 |

### 13.4 运营风险

| 风险 | 影响 | 概率 | 应对措施 |
|------|------|------|----------|
| 社区活跃度不足 | 中 | 中 | 早期核心用户邀请 + 激励计划 |
| PR 质量参差 | 低 | 低 | 代码审查 + CLA |
| 文档不完善 | 低 | 中 | 文档即代码 + 自动生成 |

---

## 14. 附录

### 14.1 术语表

| 术语 | 英文 | 定义 |
|------|------|------|
| 提示词 | Prompt | 与 AI 模型交互的文本指令 |
| 提示词管理系统 | PromptBridge007 | Prompt Management System |
| 内部统一格式 | PIF | Prompt Internal Format |
| 工具兼容性 | Tool Compatibility | 提示词在不同 AI 工具上的适配程度 |
| 标签维度 | Tag Dimension | 标签的分类维度 |
| 置信度 | Confidence | 工具兼容性的可信程度 |
| 原版部署 | Original Deploy | 直接使用提示词原文部署 |
| 定制部署 | Customized Deploy | 在原版基础上定制后部署 |
| 增量部署 | Incremental Deploy | 在原版基础上追加指令部署 |
| 环境扫描 | Environment Scan | 自动发现本机 AI 工具的过程 |

### 14.2 参考项目

| 项目 | URL | 说明 |
|------|-----|------|
| agency-agents | https://github.com/agency-agents/agency-agents | 主要英文 Agent 集合 |
| system-prompts-and-models-of-ai-tools | https://github.com/example/system-prompts | 逆向提取的系统提示词 |
| awesome-openclaw-agents | https://github.com/example/awesome-openclaw | OpenClaw 生态 |
| Cursor | https://cursor.sh | AI 代码编辑器 |
| Claude Code | https://docs.anthropic.com/claude-code | Claude 官方 CLI |
| Coze | https://www.coze.cn | 扣子平台 |

### 14.3 工具注册表示例

```typescript
const toolRegistry: ToolDefinition[] = [
  {
    id: 'claude-code',
    name: 'claude-code',
    displayName: 'Claude Code',
    category: 'international',
    detectCommands: ['which claude', 'claude --version'],
    promptPaths: ['~/.claude/projects/*/prompts/'],
    formatSpec: {
      extension: '.md',
      hasFrontmatter: false,
    },
    deployConfig: {
      targetDir: '~/.claude/projects/{project}/prompts/',
    },
  },
  {
    id: 'cursor',
    name: 'cursor',
    displayName: 'Cursor',
    category: 'international',
    detectCommands: ['cursor --version'],
    promptPaths: ['~/.cursor/prompts/'],
    formatSpec: {
      extension: '.mdc',
      hasFrontmatter: true,
    },
    deployConfig: {
      targetDir: '~/.cursor/prompts/',
    },
  },
  // ... 其他工具
];
```

### 14.4 格式转换示例

```typescript
// PIF 转 Cursor .mdc 格式
function toCursor(pif: FileEntity): string {
  return `---
name: ${pif.name}
description: Generated by PromptBridge007
source: ${pif.source.repo_name}
license: ${pif.license}
---

${pif.content}`;
}

// PIF 转 Coze skill_md 格式
function toCoze(pif: FileEntity): string {
  return `# Skill: ${pif.name}

## Metadata
- License: ${pif.license}
- Source: ${pif.source.repo_url}

## Content
${pif.content}`;
}
```

---

## 15. 文档签收

| 角色 | 姓名 | 日期 | 签名 |
|------|------|------|------|
| 产品负责人 | | | |
| 技术负责人 | | | |
| 设计负责人 | | | |
| 项目经理 | | | |

---

**文档结束**

*本文档为 PromptBridge007 v1.0 产品需求文档，如有问题请联系产品团队。*

---

> 本内容由 Coze AI 生成，请遵循相关法律法规及《人工智能生成合成内容标识办法》使用与传播。
