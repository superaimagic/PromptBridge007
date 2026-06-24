import { nanoid } from 'nanoid';
import { db } from './index';
import { tools, files, tags, fileVersions, deployments, publicSources, projects } from './schema';
import { toolRegistry } from '@/lib/core/ToolRegistry';
import * as crypto from 'crypto';

const NOW = new Date().toISOString();

function nid(): string {
  return nanoid(12);
}

function hash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

// ============================================================
// 0. 种子项目数据
// ============================================================

const defaultProjectId = 'default-project';

async function seedProject() {
  await db.insert(projects).values({
    id: defaultProjectId,
    name: 'Default Project',
    path: process.cwd(),
    description: 'Default project directory',
    isDefault: true,
    createdAt: NOW,
    updatedAt: NOW,
  }).onConflictDoNothing();
  console.log('Seeded default project');
}

// ============================================================
// 1. 种子工具数据
// ============================================================

async function seedTools() {
  for (const t of toolRegistry) {
    await db.insert(tools).values({
      id: t.id,
      name: t.name,
      displayName: t.displayName,
      category: t.category,
      detectCommands: JSON.stringify(t.detectCommands),
      promptPaths: JSON.stringify(t.promptPaths),
      formatSpec: JSON.stringify({
        extension: t.formatSpec.extension,
        hasFrontmatter: t.formatSpec.hasFrontmatter,
      }),
      deployConfig: JSON.stringify({
        targetDir: t.deployConfig.targetDir,
      }),
      isActive: true,
      createdAt: NOW,
      updatedAt: NOW,
    });
  }
  console.log(`Seeded ${toolRegistry.length} tools`);
}

// ============================================================
// 2. 种子公共库数据源
// ============================================================

async function seedPublicSources() {
  const sources = [
    {
      id: nid(),
      name: 'agency-agents',
      repoUrl: 'https://github.com/agency-agents/agency-agents',
      repoLicense: 'MIT',
      description: '主要英文 Agent 集合，232+ Agent',
      localPath: 'data/public-sources/agency-agents',
      lastSyncAt: NOW,
      lastCommitHash: 'a1b2c3d4e5f6',
      isActive: true,
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      id: nid(),
      name: 'system-prompts-and-models-of-ai-tools',
      repoUrl: 'https://github.com/x1xhlol/system-prompts-and-models-of-ai-tools',
      repoLicense: 'GPL-3.0',
      description: '逆向提取的 AI 工具系统提示词',
      localPath: 'data/public-sources/system-prompts',
      lastSyncAt: NOW,
      lastCommitHash: 'b2c3d4e5f6a1',
      isActive: true,
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      id: nid(),
      name: 'awesome-openclaw-agents',
      repoUrl: 'https://github.com/openclaw/awesome-openclaw-agents',
      repoLicense: 'MIT',
      description: 'OpenClaw 生态 Agent 集合',
      localPath: 'data/public-sources/awesome-openclaw-agents',
      lastSyncAt: NOW,
      lastCommitHash: 'c3d4e5f6a1b2',
      isActive: true,
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      id: nid(),
      name: 'agency-agents-zh',
      repoUrl: 'https://github.com/agency-agents/agency-agents-zh',
      repoLicense: 'MIT',
      description: '中文版 Agent 集合，46+ Agent，含中国原创',
      localPath: 'data/public-sources/agency-agents-zh',
      lastSyncAt: NOW,
      lastCommitHash: 'd4e5f6a1b2c3',
      isActive: true,
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      id: nid(),
      name: 'agency-agents-ja',
      repoUrl: 'https://github.com/agency-agents/agency-agents-ja',
      repoLicense: 'MIT',
      description: '日文版 Agent 集合，97+ Agent，含日本原创',
      localPath: 'data/public-sources/agency-agents-ja',
      lastSyncAt: NOW,
      lastCommitHash: 'e5f6a1b2c3d4',
      isActive: true,
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      id: nid(),
      name: 'official-docs',
      repoUrl: 'https://github.com/promptbridge007/official-docs',
      repoLicense: 'MIT',
      description: 'Cursor/Copilot/Coze 官方文档与格式规范',
      localPath: 'data/public-sources/official-docs',
      lastSyncAt: NOW,
      lastCommitHash: 'f6a1b2c3d4e5',
      isActive: true,
      createdAt: NOW,
      updatedAt: NOW,
    },
  ];

  await db.insert(publicSources).values(sources);
  console.log(`Seeded ${sources.length} public sources`);
}

// ============================================================
// 3. 种子文件数据
// ============================================================

interface SeedFileDef {
  slug: string;
  name: string;
  content: string;
  format: string;
  sourceType: string;
  repoName: string;
  repoUrl: string;
  repoLicense: string;
  author: string;
  authorUrl: string;
  filePath: string;
  commitHash: string;
  license: string;
  licenseUrl: string;
  installCount: number;
  rating: number;
  tagData: {
    tool?: Array<{ value: string; confidence: string }>;
    role: string;
    domain: string[];
    language: string;
    quality: string;
    source_type: string;
  };
}

const sampleFiles: SeedFileDef[] = [
  {
    slug: 'frontend-developer-agent',
    name: 'Frontend Developer Agent',
    content: `# Frontend Developer Agent

You are an expert frontend developer specializing in React, TypeScript, and modern web technologies.

## Core Responsibilities

- Write clean, maintainable, and performant React components
- Implement responsive designs using Tailwind CSS
- Manage state with Zustand or React Context
- Write comprehensive tests with Vitest and Testing Library

## Code Style

- Use TypeScript for all new code
- Prefer functional components with hooks
- Use \`cn()\` utility for conditional class names
- Follow the project's ESLint configuration

## Best Practices

1. Always handle loading and error states
2. Implement proper accessibility (ARIA labels, keyboard navigation)
3. Use semantic HTML elements
4. Optimize re-renders with useMemo and useCallback where appropriate
5. Keep components small and focused`,
    format: 'markdown',
    sourceType: 'public_repo',
    repoName: 'agency-agents',
    repoUrl: 'https://github.com/agency-agents/agency-agents',
    repoLicense: 'MIT',
    author: 'msitarzewski',
    authorUrl: 'https://github.com/msitarzewski',
    filePath: 'engineering/frontend-developer.md',
    commitHash: '48b5225',
    license: 'MIT',
    licenseUrl: 'https://opensource.org/licenses/MIT',
    installCount: 2341,
    rating: 4.8,
    tagData: {
      tool: [
        { value: 'claude-code', confidence: 'full' },
        { value: 'cursor', confidence: 'full' },
        { value: 'coze', confidence: 'partial' },
      ],
      role: 'agent',
      domain: ['engineering', 'frontend'],
      language: 'en',
      quality: 'verified',
      source_type: 'public_repo',
    },
  },
  {
    slug: 'backend-engineer-agent',
    name: 'Backend Engineer Agent',
    content: `# Backend Engineer Agent

You are an expert backend engineer specializing in Node.js, Python, and distributed systems.

## Core Responsibilities

- Design and implement RESTful and GraphQL APIs
- Manage database schemas and migrations
- Implement authentication and authorization
- Write integration and unit tests

## Technology Stack

- Runtime: Node.js 22+ / Bun
- Framework: Hono / Fastify / Express
- Database: PostgreSQL / SQLite / MongoDB
- ORM: Drizzle / Prisma
- Testing: Vitest / Jest

## Code Style

- Use TypeScript strict mode
- Follow SOLID principles
- Implement proper error handling with custom error classes
- Use dependency injection for testability`,
    format: 'markdown',
    sourceType: 'public_repo',
    repoName: 'agency-agents',
    repoUrl: 'https://github.com/agency-agents/agency-agents',
    repoLicense: 'MIT',
    author: 'msitarzewski',
    authorUrl: 'https://github.com/msitarzewski',
    filePath: 'engineering/backend-engineer.md',
    commitHash: '48b5225',
    license: 'MIT',
    licenseUrl: 'https://opensource.org/licenses/MIT',
    installCount: 1892,
    rating: 4.7,
    tagData: {
      tool: [
        { value: 'claude-code', confidence: 'full' },
        { value: 'cursor', confidence: 'full' },
      ],
      role: 'agent',
      domain: ['engineering', 'backend'],
      language: 'en',
      quality: 'verified',
      source_type: 'public_repo',
    },
  },
  {
    slug: 'devops-engineer-agent',
    name: 'DevOps Engineer Agent',
    content: `# DevOps Engineer Agent

You are an expert DevOps engineer specializing in CI/CD, containerization, and cloud infrastructure.

## Core Responsibilities

- Design and maintain CI/CD pipelines
- Manage Docker containers and Kubernetes clusters
- Implement Infrastructure as Code (Terraform, Pulumi)
- Monitor and optimize system performance

## Best Practices

1. Always use infrastructure as code
2. Implement proper secret management
3. Use blue-green or canary deployments
4. Monitor everything with structured logging
5. Automate disaster recovery procedures`,
    format: 'markdown',
    sourceType: 'public_repo',
    repoName: 'agency-agents',
    repoUrl: 'https://github.com/agency-agents/agency-agents',
    repoLicense: 'MIT',
    author: 'devops-contrib',
    authorUrl: 'https://github.com/devops-contrib',
    filePath: 'engineering/devops-engineer.md',
    commitHash: '48b5225',
    license: 'MIT',
    licenseUrl: 'https://opensource.org/licenses/MIT',
    installCount: 1245,
    rating: 4.5,
    tagData: {
      tool: [
        { value: 'claude-code', confidence: 'full' },
        { value: 'windsurf', confidence: 'full' },
      ],
      role: 'agent',
      domain: ['engineering', 'devops'],
      language: 'en',
      quality: 'community',
      source_type: 'public_repo',
    },
  },
  {
    slug: 'product-manager-agent',
    name: 'Product Manager Agent',
    content: `# Product Manager Agent

You are an experienced product manager who helps define product strategy, write requirements, and prioritize features.

## Core Responsibilities

- Write clear and actionable PRDs
- Define user stories and acceptance criteria
- Prioritize features using RICE or MoSCoW framework
- Analyze market trends and competitive landscape

## Output Format

When writing PRDs, follow this structure:
1. Problem Statement
2. User Stories
3. Requirements (Must/Should/Could/Won't)
4. Success Metrics
5. Timeline and Milestones`,
    format: 'markdown',
    sourceType: 'public_repo',
    repoName: 'agency-agents',
    repoUrl: 'https://github.com/agency-agents/agency-agents',
    repoLicense: 'MIT',
    author: 'pm-contrib',
    authorUrl: 'https://github.com/pm-contrib',
    filePath: 'product/product-manager.md',
    commitHash: '48b5225',
    license: 'MIT',
    licenseUrl: 'https://opensource.org/licenses/MIT',
    installCount: 987,
    rating: 4.3,
    tagData: {
      tool: [
        { value: 'claude-code', confidence: 'full' },
        { value: 'cursor', confidence: 'partial' },
      ],
      role: 'persona',
      domain: ['product'],
      language: 'en',
      quality: 'community',
      source_type: 'public_repo',
    },
  },
  {
    slug: 'code-reviewer-skill',
    name: 'Code Reviewer Skill',
    content: `# Code Reviewer Skill

You are a meticulous code reviewer who catches bugs, suggests improvements, and enforces coding standards.

## Review Checklist

### Correctness
- [ ] Logic is correct and handles edge cases
- [ ] No off-by-one errors
- [ ] Error handling is comprehensive

### Security
- [ ] No SQL injection vulnerabilities
- [ ] Input validation is proper
- [ ] No hardcoded secrets or credentials

### Performance
- [ ] No unnecessary re-renders (React)
- [ ] Database queries are optimized
- [ ] No memory leaks

### Maintainability
- [ ] Code is self-documenting
- [ ] Functions are small and focused
- [ ] Naming is clear and consistent`,
    format: 'markdown',
    sourceType: 'public_repo',
    repoName: 'agency-agents',
    repoUrl: 'https://github.com/agency-agents/agency-agents',
    repoLicense: 'MIT',
    author: 'review-contrib',
    authorUrl: 'https://github.com/review-contrib',
    filePath: 'skills/code-reviewer.md',
    commitHash: '48b5225',
    license: 'MIT',
    licenseUrl: 'https://opensource.org/licenses/MIT',
    installCount: 3102,
    rating: 4.9,
    tagData: {
      tool: [
        { value: 'claude-code', confidence: 'full' },
        { value: 'cursor', confidence: 'full' },
        { value: 'github-copilot', confidence: 'full' },
      ],
      role: 'skill',
      domain: ['engineering'],
      language: 'en',
      quality: 'verified',
      source_type: 'public_repo',
    },
  },
  {
    slug: 'chinese-frontend-agent',
    name: '前端开发专家',
    content: `# 前端开发专家

你是一位资深的前端开发专家，精通 React、Vue、TypeScript 和现代 Web 技术栈。

## 核心职责

- 编写高质量、可维护的 React/Vue 组件
- 使用 Tailwind CSS 实现响应式设计
- 状态管理（Zustand / Pinia / React Context）
- 编写完善的单元测试和集成测试

## 代码规范

- 所有新代码使用 TypeScript
- 优先使用函数式组件和 Hooks
- 使用 \`cn()\` 工具函数处理条件类名
- 遵循项目的 ESLint 配置

## 最佳实践

1. 始终处理加载和错误状态
2. 实现无障碍访问（ARIA 标签、键盘导航）
3. 使用语义化 HTML 元素
4. 合理使用 useMemo 和 useCallback 优化渲染
5. 保持组件小而专注`,
    format: 'markdown',
    sourceType: 'public_repo',
    repoName: 'agency-agents-zh',
    repoUrl: 'https://github.com/agency-agents/agency-agents-zh',
    repoLicense: 'MIT',
    author: 'zh-contrib',
    authorUrl: 'https://github.com/zh-contrib',
    filePath: 'engineering/frontend-developer.md',
    commitHash: 'a2b3c4d5',
    license: 'MIT',
    licenseUrl: 'https://opensource.org/licenses/MIT',
    installCount: 856,
    rating: 4.6,
    tagData: {
      tool: [
        { value: 'kimi-code', confidence: 'full' },
        { value: 'coze', confidence: 'full' },
        { value: 'deepseek-coder', confidence: 'full' },
      ],
      role: 'agent',
      domain: ['engineering', 'frontend'],
      language: 'zh',
      quality: 'community',
      source_type: 'public_repo',
    },
  },
  {
    slug: 'japanese-api-designer',
    name: 'API デザインエージェント',
    content: `# API デザインエージェント

あなたは RESTful API と GraphQL の設計を専門とするバックエンドエンジニアです。

## 主な責任

- RESTful API と GraphQL の設計・実装
- データベーススキーマの管理とマイグレーション
- 認証・認可の実装
- API ドキュメントの作成

## 設計原則

1. リソース指向の URL 設計
2. 適切な HTTP メソッドの使用
3. ページネーションの実装
4. エラーレスポンスの統一
5. バージョニング戦略`,
    format: 'markdown',
    sourceType: 'public_repo',
    repoName: 'agency-agents-ja',
    repoUrl: 'https://github.com/agency-agents/agency-agents-ja',
    repoLicense: 'MIT',
    author: 'ja-contrib',
    authorUrl: 'https://github.com/ja-contrib',
    filePath: 'engineering/api-designer.md',
    commitHash: 'b3c4d5e6',
    license: 'MIT',
    licenseUrl: 'https://opensource.org/licenses/MIT',
    installCount: 432,
    rating: 4.4,
    tagData: {
      tool: [
        { value: 'claude-code', confidence: 'full' },
        { value: 'cursor', confidence: 'partial' },
      ],
      role: 'agent',
      domain: ['engineering', 'backend'],
      language: 'ja',
      quality: 'community',
      source_type: 'public_repo',
    },
  },
  {
    slug: 'system-prompt-claude-code',
    name: 'Claude Code System Prompt',
    content: `# Claude Code System Prompt

You are Claude Code, Anthropic's official CLI for Claude. You help users with software engineering tasks.

## Capabilities

- Read and write files
- Execute commands
- Search codebases
- Manage git operations
- Create and edit code

## Guidelines

1. Always explain your reasoning before making changes
2. Ask for clarification when requirements are ambiguous
3. Follow existing code patterns and conventions
4. Write tests for new functionality
5. Keep changes minimal and focused`,
    format: 'markdown',
    sourceType: 'reverse_engineered',
    repoName: 'system-prompts-and-models-of-ai-tools',
    repoUrl: 'https://github.com/x1xhlol/system-prompts-and-models-of-ai-tools',
    repoLicense: 'GPL-3.0',
    author: 'system-prompts',
    authorUrl: 'https://github.com/x1xhlol',
    filePath: 'claude-code/system-prompt.md',
    commitHash: 'c4d5e6f7',
    license: 'GPL-3.0',
    licenseUrl: 'https://www.gnu.org/licenses/gpl-3.0',
    installCount: 5678,
    rating: 4.2,
    tagData: {
      tool: [
        { value: 'claude-code', confidence: 'full' },
      ],
      role: 'system-prompt',
      domain: ['engineering'],
      language: 'en',
      quality: 'experimental',
      source_type: 'reverse_engineered',
    },
  },
  {
    slug: 'marketing-copywriter',
    name: 'Marketing Copywriter Agent',
    content: `# Marketing Copywriter Agent

You are a creative marketing copywriter who crafts compelling copy for various channels.

## Channels

- **Landing Pages**: Clear value propositions, strong CTAs
- **Email**: Subject lines that convert, concise body copy
- **Social Media**: Platform-native content, hashtag strategy
- **Ads**: Headline + body + CTA optimized for click-through

## Writing Principles

1. Lead with benefits, not features
2. Use the AIDA framework (Attention, Interest, Desire, Action)
3. Keep sentences short and punchy
4. Include social proof where possible
5. Always end with a clear call to action`,
    format: 'markdown',
    sourceType: 'public_repo',
    repoName: 'agency-agents',
    repoUrl: 'https://github.com/agency-agents/agency-agents',
    repoLicense: 'MIT',
    author: 'marketing-contrib',
    authorUrl: 'https://github.com/marketing-contrib',
    filePath: 'marketing/copywriter.md',
    commitHash: '48b5225',
    license: 'MIT',
    licenseUrl: 'https://opensource.org/licenses/MIT',
    installCount: 678,
    rating: 4.1,
    tagData: {
      tool: [
        { value: 'coze', confidence: 'full' },
        { value: 'doubao', confidence: 'partial' },
      ],
      role: 'persona',
      domain: ['marketing'],
      language: 'en',
      quality: 'community',
      source_type: 'public_repo',
    },
  },
  {
    slug: 'openclaw-workflow-builder',
    name: 'OpenClaw Workflow Builder',
    content: `# OpenClaw Workflow Builder

You are a workflow builder that helps create and manage OpenClaw agent workflows.

## Workflow Structure

\`\`\`yaml
name: workflow-name
description: Workflow description
steps:
  - id: step1
    type: prompt
    template: "Process the following: {{input}}"
  - id: step2
    type: condition
    condition: "step1.output.includes('error')"
    on_true: step3
    on_false: step4
\`\`\`

## Best Practices

1. Keep workflows focused on a single objective
2. Use descriptive step IDs
3. Handle errors at every step
4. Document expected inputs and outputs
5. Test workflows with sample data`,
    format: 'markdown',
    sourceType: 'public_repo',
    repoName: 'awesome-openclaw-agents',
    repoUrl: 'https://github.com/openclaw/awesome-openclaw-agents',
    repoLicense: 'MIT',
    author: 'openclaw-contrib',
    authorUrl: 'https://github.com/openclaw-contrib',
    filePath: 'workflows/workflow-builder.md',
    commitHash: 'd5e6f7a8',
    license: 'MIT',
    licenseUrl: 'https://opensource.org/licenses/MIT',
    installCount: 543,
    rating: 4.5,
    tagData: {
      tool: [
        { value: 'openclaw', confidence: 'full' },
      ],
      role: 'workflow',
      domain: ['engineering'],
      language: 'en',
      quality: 'verified',
      source_type: 'public_repo',
    },
  },
  {
    slug: 'korean-data-analyst',
    name: '데이터 분석 에이전트',
    content: `# 데이터 분석 에이전트

당신은 데이터 분석 및 시각화를 전문으로 하는 데이터 분석가입니다.

## 핵심 역할

- 데이터 정제 및 전처리
- 통계 분석 및 인사이트 도출
- 시각화 차트 및 대시보드 작성
- 분석 보고서 작성

## 분석 프로세스

1. 문제 정의 및 가설 설정
2. 데이터 수집 및 정제
3. 탐색적 데이터 분석 (EDA)
4. 통계 모델링 및 검증
5. 결과 해석 및 권고사항 도출`,
    format: 'markdown',
    sourceType: 'user_created',
    repoName: '',
    repoUrl: '',
    repoLicense: '',
    author: 'user',
    authorUrl: '',
    filePath: '',
    commitHash: '',
    license: 'MIT',
    licenseUrl: 'https://opensource.org/licenses/MIT',
    installCount: 234,
    rating: 4.0,
    tagData: {
      tool: [
        { value: 'deepseek-coder', confidence: 'partial' },
        { value: 'qwen-code', confidence: 'partial' },
      ],
      role: 'agent',
      domain: ['data'],
      language: 'ko',
      quality: 'community',
      source_type: 'user_created',
    },
  },
  {
    slug: 'security-auditor-rule',
    name: 'Security Auditor Rule',
    content: `# Security Auditor Rule

You are a security auditor who reviews code for vulnerabilities and compliance issues.

## Audit Categories

### OWASP Top 10
1. Broken Access Control
2. Cryptographic Failures
3. Injection
4. Insecure Design
5. Security Misconfiguration
6. Vulnerable Components
7. Authentication Failures
8. Data Integrity Failures
9. Logging Failures
10. SSRF

## Output Format

For each finding:
- **Severity**: Critical / High / Medium / Low
- **Category**: OWASP category
- **Description**: Clear explanation
- **Remediation**: Specific fix recommendation
- **Code Example**: Before/After snippet`,
    format: 'markdown',
    sourceType: 'public_repo',
    repoName: 'agency-agents',
    repoUrl: 'https://github.com/agency-agents/agency-agents',
    repoLicense: 'MIT',
    author: 'security-contrib',
    authorUrl: 'https://github.com/security-contrib',
    filePath: 'security/auditor.md',
    commitHash: '48b5225',
    license: 'MIT',
    licenseUrl: 'https://opensource.org/licenses/MIT',
    installCount: 1567,
    rating: 4.7,
    tagData: {
      tool: [
        { value: 'claude-code', confidence: 'full' },
        { value: 'cursor', confidence: 'full' },
        { value: 'github-copilot', confidence: 'full' },
        { value: 'aider', confidence: 'partial' },
      ],
      role: 'rule',
      domain: ['engineering', 'security'],
      language: 'en',
      quality: 'verified',
      source_type: 'public_repo',
    },
  },
];

async function seedFileData(): Promise<string[]> {
  const fileIds: string[] = [];
  const tagRows: typeof tags.$inferInsert[] = [];
  const versionRows: typeof fileVersions.$inferInsert[] = [];

  for (const sf of sampleFiles) {
    const fileId = nid();
    fileIds.push(fileId);
    const contentHash = hash(sf.content);

    await db.insert(files).values({
      id: fileId,
      slug: sf.slug,
      name: sf.name,
      content: sf.content,
      contentHash,
      format: sf.format,
      projectId: defaultProjectId,
      sourceType: sf.sourceType,
      repoName: sf.repoName || null,
      repoUrl: sf.repoUrl || null,
      repoLicense: sf.repoLicense || null,
      author: sf.author || null,
      authorUrl: sf.authorUrl || null,
      filePath: sf.filePath || null,
      commitHash: sf.commitHash || null,
      fetchedAt: sf.sourceType === 'public_repo' ? NOW : null,
      license: sf.license,
      licenseUrl: sf.licenseUrl || null,
      version: 1,
      installCount: sf.installCount,
      rating: sf.rating,
      createdAt: NOW,
      updatedAt: NOW,
      deletedAt: null,
    });

    // 版本记录
    versionRows.push({
      id: nid(),
      fileId,
      version: 1,
      content: sf.content,
      contentHash,
      changeSummary: 'Initial import',
      createdAt: NOW,
    });

    // 标签 - 7 维
    const td = sf.tagData;

    // tool 标签（可多值，带 confidence）
    if (td.tool) {
      for (const t of td.tool) {
        tagRows.push({
          id: nid(),
          fileId,
          dimension: 'tool',
          value: t.value,
          confidence: t.confidence as 'full' | 'partial' | 'experimental' | 'incompatible',
          createdAt: NOW,
        });
      }
    }

    // role 标签
    tagRows.push({
      id: nid(),
      fileId,
      dimension: 'role',
      value: td.role,
      confidence: null,
      createdAt: NOW,
    });

    // domain 标签（可多值）
    for (const d of td.domain) {
      tagRows.push({
        id: nid(),
        fileId,
        dimension: 'domain',
        value: d,
        confidence: null,
        createdAt: NOW,
      });
    }

    // language 标签
    tagRows.push({
      id: nid(),
      fileId,
      dimension: 'language',
      value: td.language,
      confidence: null,
      createdAt: NOW,
    });

    // quality 标签
    tagRows.push({
      id: nid(),
      fileId,
      dimension: 'quality',
      value: td.quality,
      confidence: null,
      createdAt: NOW,
    });

    // source_type 标签
    tagRows.push({
      id: nid(),
      fileId,
      dimension: 'source_type',
      value: td.source_type,
      confidence: null,
      createdAt: NOW,
    });
  }

  await db.insert(fileVersions).values(versionRows);
  console.log(`Seeded ${versionRows.length} file versions`);

  await db.insert(tags).values(tagRows);
  console.log(`Seeded ${tagRows.length} tags`);

  console.log(`Seeded ${fileIds.length} files`);
  return fileIds;
}

// ============================================================
// 4. 种子部署数据
// ============================================================

async function seedDeployments(fileIds: string[]) {
  const deploymentRows: typeof deployments.$inferInsert[] = [
    {
      id: nid(),
      fileId: fileIds[0],
      toolId: 'claude-code',
      projectId: defaultProjectId,
      mode: 'original',
      targetPath: '~/.claude/projects/default/prompts/frontend-developer-agent.md',
      deployedContent: sampleFiles[0].content,
      status: 'success',
      errorMessage: null,
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      id: nid(),
      fileId: fileIds[0],
      toolId: 'cursor',
      projectId: defaultProjectId,
      mode: 'customized',
      targetPath: '~/.cursor/prompts/frontend-developer-agent.mdc',
      deployedContent: `---\nname: Frontend Developer Agent\ndescription: Generated by PromptBridge007\nsource: agency-agents\nlicense: MIT\n---\n\n${sampleFiles[0].content}`,
      status: 'success',
      errorMessage: null,
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      id: nid(),
      fileId: fileIds[4],
      toolId: 'claude-code',
      projectId: defaultProjectId,
      mode: 'incremental',
      targetPath: '~/.claude/projects/default/prompts/code-reviewer-skill.md',
      deployedContent: `${sampleFiles[4].content}\n\n---\n\n# Custom Instructions\n\nAlways check for TypeScript strict mode compliance.`,
      status: 'success',
      errorMessage: null,
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      id: nid(),
      fileId: fileIds[5],
      toolId: 'kimi-code',
      projectId: defaultProjectId,
      mode: 'original',
      targetPath: '~/.kimi-code/prompts/chinese-frontend-agent.yaml',
      deployedContent: `name: "前端开发专家"\nlicense: "MIT"\nsource: "agency-agents-zh"\ncontent: |\n  ${sampleFiles[5].content.split('\n').join('\n  ')}`,
      status: 'success',
      errorMessage: null,
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      id: nid(),
      fileId: fileIds[7],
      toolId: 'cursor',
      projectId: defaultProjectId,
      mode: 'original',
      targetPath: '~/.cursor/prompts/system-prompt-claude-code.mdc',
      deployedContent: '',
      status: 'failed',
      errorMessage: 'GPL-3.0 license requires user confirmation',
      createdAt: NOW,
      updatedAt: NOW,
    },
  ];

  await db.insert(deployments).values(deploymentRows);
  console.log(`Seeded ${deploymentRows.length} deployments`);
}

// ============================================================
// 主函数
// ============================================================

export async function seed() {
  console.log('Starting database seeding...');

  try {
    await seedProject();
    await seedTools();
    await seedPublicSources();
    const fileIds = await seedFileData();
    await seedDeployments(fileIds);
    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Database seeding failed:', error);
    throw error;
  }
}
