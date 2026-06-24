export type ToolCategory = 'international' | 'domestic';

export interface ToolDefinition {
  id: string;
  name: string;
  displayName: string;
  category: ToolCategory;
  detectCommands: string[];
  promptPaths: string[];
  formatSpec: {
    extension: string;
    hasFrontmatter: boolean;
  };
  deployConfig: {
    targetDir: string;
  };
  projectDir?: string;
}

export const toolRegistry: ToolDefinition[] = [
  // ===== 国际工具 =====
  {
    id: 'claude-code',
    name: 'claude-code',
    displayName: 'Claude Code',
    category: 'international',
    detectCommands: ['claude --version'],
    promptPaths: ['~/.claude/CLAUDE.md', './CLAUDE.md'],
    formatSpec: { extension: '.md', hasFrontmatter: false },
    deployConfig: { targetDir: './' },
  },
  {
    id: 'cursor',
    name: 'cursor',
    displayName: 'Cursor',
    category: 'international',
    detectCommands: ['cursor --version'],
    promptPaths: ['./.cursor/rules/', './.cursorrules'],
    formatSpec: { extension: '.mdc', hasFrontmatter: true },
    deployConfig: { targetDir: './.cursor/rules/' },
  },
  {
    id: 'github-copilot',
    name: 'github-copilot',
    displayName: 'GitHub Copilot',
    category: 'international',
    detectCommands: ['gh copilot --version'],
    promptPaths: ['./.github/copilot-instructions.md'],
    formatSpec: { extension: '.md', hasFrontmatter: false },
    deployConfig: { targetDir: './.github/' },
  },
  {
    id: 'windsurf',
    name: 'windsurf',
    displayName: 'Windsurf',
    category: 'international',
    detectCommands: ['windsurf --version'],
    promptPaths: ['./.windsurfrules', './.windsurf/rules/'],
    formatSpec: { extension: '.md', hasFrontmatter: false },
    deployConfig: { targetDir: './' },
  },
  {
    id: 'aider',
    name: 'aider',
    displayName: 'Aider',
    category: 'international',
    detectCommands: ['aider --version'],
    promptPaths: ['./.aider.conf.yml', './CONVENTIONS.md'],
    formatSpec: { extension: '.md', hasFrontmatter: false },
    deployConfig: { targetDir: './' },
  },
  {
    id: 'gemini-cli',
    name: 'gemini-cli',
    displayName: 'Gemini CLI',
    category: 'international',
    detectCommands: ['gemini --version'],
    promptPaths: ['./GEMINI.md'],
    formatSpec: { extension: '.md', hasFrontmatter: false },
    deployConfig: { targetDir: './' },
  },
  {
    id: 'codex',
    name: 'codex',
    displayName: 'Codex (OpenAI)',
    category: 'international',
    detectCommands: ['codex --version'],
    promptPaths: ['./CODEX.md', './codex.md'],
    formatSpec: { extension: '.md', hasFrontmatter: false },
    deployConfig: { targetDir: './' },
  },
  {
    id: 'opencode',
    name: 'opencode',
    displayName: 'OpenCode',
    category: 'international',
    detectCommands: ['opencode --version'],
    promptPaths: ['./OPENCODE.md'],
    formatSpec: { extension: '.md', hasFrontmatter: false },
    deployConfig: { targetDir: './' },
  },
  {
    id: 'openclaw',
    name: 'openclaw',
    displayName: 'OpenClaw',
    category: 'international',
    detectCommands: ['openclaw --version'],
    promptPaths: ['./.openclaw/agents/'],
    formatSpec: { extension: '.md', hasFrontmatter: true },
    deployConfig: { targetDir: './.openclaw/agents/' },
  },
  {
    id: 'trae',
    name: 'trae',
    displayName: 'Trae',
    category: 'international',
    detectCommands: ['trae --version'],
    promptPaths: ['./.trae/rules/'],
    formatSpec: { extension: '.md', hasFrontmatter: false },
    deployConfig: { targetDir: './.trae/rules/' },
  },
  {
    id: 'amp',
    name: 'amp',
    displayName: 'Amp',
    category: 'international',
    detectCommands: ['amp --version'],
    promptPaths: ['./AMP.md'],
    formatSpec: { extension: '.md', hasFrontmatter: false },
    deployConfig: { targetDir: './' },
  },
  {
    id: 'kiro',
    name: 'kiro',
    displayName: 'Kiro',
    category: 'international',
    detectCommands: ['kiro --version'],
    promptPaths: ['./.kiro/'],
    formatSpec: { extension: '.md', hasFrontmatter: false },
    deployConfig: { targetDir: './.kiro/' },
  },
  {
    id: 'replit',
    name: 'replit',
    displayName: 'Replit',
    category: 'international',
    detectCommands: ['replit --version'],
    promptPaths: ['./.replit/prompts/'],
    formatSpec: { extension: '.md', hasFrontmatter: false },
    deployConfig: { targetDir: './.replit/prompts/' },
  },
  {
    id: 'warp',
    name: 'warp',
    displayName: 'Warp',
    category: 'international',
    detectCommands: ['warp --version'],
    promptPaths: ['./.warp/prompts/'],
    formatSpec: { extension: '.md', hasFrontmatter: false },
    deployConfig: { targetDir: './.warp/prompts/' },
  },

  // ===== 国产工具 =====
  {
    id: 'kimi-code',
    name: 'kimi-code',
    displayName: 'Kimi Code',
    category: 'domestic',
    detectCommands: ['kimi-code --version'],
    promptPaths: ['./.kimi/'],
    formatSpec: { extension: '.yaml', hasFrontmatter: false },
    deployConfig: { targetDir: './.kimi/' },
  },
  {
    id: 'coze',
    name: 'coze',
    displayName: '扣子 Coze',
    category: 'domestic',
    detectCommands: ['coze --version'],
    promptPaths: ['./.coze/bots/'],
    formatSpec: { extension: '.md', hasFrontmatter: true },
    deployConfig: { targetDir: './.coze/bots/' },
  },
  {
    id: 'glm',
    name: 'glm',
    displayName: '智谱 GLM',
    category: 'domestic',
    detectCommands: ['glm --version'],
    promptPaths: ['./.glm/'],
    formatSpec: { extension: '.md', hasFrontmatter: false },
    deployConfig: { targetDir: './.glm/' },
  },
  {
    id: 'doubao',
    name: 'doubao',
    displayName: '豆包',
    category: 'domestic',
    detectCommands: ['doubao --version'],
    promptPaths: ['./.doubao/'],
    formatSpec: { extension: '.yaml', hasFrontmatter: false },
    deployConfig: { targetDir: './.doubao/' },
  },
  {
    id: 'tongyi-lingma',
    name: 'tongyi-lingma',
    displayName: '通义灵码',
    category: 'domestic',
    detectCommands: ['tongyi-lingma --version'],
    promptPaths: ['./.tongyi/'],
    formatSpec: { extension: '.md', hasFrontmatter: false },
    deployConfig: { targetDir: './.tongyi/' },
  },
  {
    id: 'tiangong',
    name: 'tiangong',
    displayName: '天工 AI',
    category: 'domestic',
    detectCommands: ['tiangong --version'],
    promptPaths: ['./.tiangong/'],
    formatSpec: { extension: '.md', hasFrontmatter: false },
    deployConfig: { targetDir: './.tiangong/' },
  },
  {
    id: 'qwen-code',
    name: 'qwen-code',
    displayName: 'Qwen Code',
    category: 'domestic',
    detectCommands: ['qwen-code --version'],
    promptPaths: ['./.qwen-code/'],
    formatSpec: { extension: '.yaml', hasFrontmatter: false },
    deployConfig: { targetDir: './.qwen-code/' },
  },
  {
    id: 'deepseek-coder',
    name: 'deepseek-coder',
    displayName: 'DeepSeek Coder',
    category: 'domestic',
    detectCommands: ['deepseek-coder --version'],
    promptPaths: ['./.deepseek/'],
    formatSpec: { extension: '.md', hasFrontmatter: false },
    deployConfig: { targetDir: './.deepseek/' },
  },
  {
    id: 'spark-code',
    name: 'spark-code',
    displayName: '星火代码',
    category: 'domestic',
    detectCommands: ['spark-code --version'],
    promptPaths: ['./.spark-code/'],
    formatSpec: { extension: '.md', hasFrontmatter: false },
    deployConfig: { targetDir: './.spark-code/' },
  },
  {
    id: 'yuanbao',
    name: 'yuanbao',
    displayName: '腾讯元宝',
    category: 'domestic',
    detectCommands: ['yuanbao --version'],
    promptPaths: ['./.yuanbao/'],
    formatSpec: { extension: '.json', hasFrontmatter: false },
    deployConfig: { targetDir: './.yuanbao/' },
  },
];

export function getToolById(id: string): ToolDefinition | undefined {
  return toolRegistry.find((tool) => tool.id === id);
}

export function getToolsByCategory(category: ToolCategory): ToolDefinition[] {
  return toolRegistry.filter((tool) => tool.category === category);
}

export function getAllTools(): ToolDefinition[] {
  return toolRegistry;
}

/**
 * 解析项目根目录
 */
export function resolveProjectDir(projectPath?: string): string {
  return projectPath || process.cwd();
}
