# Credits & Acknowledgments

PromptBridge007 站在开源巨人的肩膀上。以下是所有参考和引用的开源项目，感谢他们的贡献。

---

## 📚 System Prompts 数据库

### [system_prompts_leaks](https://github.com/asgeirtj/system_prompts_leaks)

**许可证**: [CC0-1.0](https://creativecommons.org/publicdomain/zero/1.0/) (Public Domain)

**描述**: 由 [@asgeirtj](https://github.com/asgeirtj) 维护的开源项目，系统性地收集整理了各大 AI 产品（Claude、ChatGPT、Gemini 等）的系统提示词。该项目采用 CC0 协议，将所有内容贡献给公共领域。

**包含内容**:
- Anthropic Claude 系列提示词（含 Claude Code）
- OpenAI ChatGPT/GPT 系列提示词（含 Codex）
- Google Gemini 系列提示词（含 Gemini CLI、Jules）
- xAI Grok 系列提示词
- Microsoft Copilot 系列提示词
- Meta、Perplexity、Mistral、Notion、Qwen 等产品提示词

**本项目使用方式**: 通过 `scripts/import-system-prompts-leaks.js` 脚本定期同步最新内容，导入到 D1 数据库中供用户搜索和使用。

**使用许可**: CC0-1.0 允许任何人自由使用、修改、商业利用，无需署名。

---

### [CL4R1T4S](https://github.com/elder-plinius/CL4R1T4S)

**许可证**: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

**描述**: "Center for the Liberation of Artifacts through Transparency in AI Systems" — AI 系统提示词透明度项目，旨在通过收集和公开 AI 系统的提示词来提高 AI 系统的透明度和可解释性。

**使用许可**: 使用时需署名（Attribution required）。

---

## 🛠️ 技术依赖

### 核心框架

| 项目 | 版本 | 许可证 | 用途 |
|------|------|--------|------|
| [Next.js](https://nextjs.org/) | 16.x | [MIT](https://github.com/vercel/next.js/blob/canary/license.md) | React 全栈框架 |
| [React](https://react.dev/) | 19.x | [MIT](https://github.com/facebook/react/blob/main/LICENSE) | UI 库 |
| [Tailwind CSS](https://tailwindcss.com/) | 4.x | [MIT](https://github.com/tailwindlabs/tailwindcss/blob/next/LICENSE) | CSS 框架 |
| [Hono](https://hono.dev/) | 4.x | [MIT](https://github.com/honojs/hono/blob/main/LICENSE) | API 框架 |

### 数据库与 ORM

| 项目 | 许可证 | 用途 |
|------|--------|------|
| [Drizzle ORM](https://orm.drizzle.team/) | [MIT](https://github.com/drizzle-team/drizzle-orm/blob/main/LICENSE) | TypeScript ORM |
| [libsql](https://github.com/tursodatabase/libsql) | [MIT](https://github.com/tursodatabase/libsql/blob/main/LICENSE) | SQLite 兼容数据库 |
| [Cloudflare D1](https://developers.cloudflare.com/d1/) | - | Serverless SQLite |

### CLI 与工具

| 项目 | 许可证 | 用途 |
|------|--------|------|
| [Commander.js](https://github.com/tj/commander.js) | [MIT](https://github.com/tj/commander.js/blob/master/LICENSE) | CLI 框架 |
| [Model Context Protocol](https://modelcontextprotocol.io/) | [MIT](https://github.com/modelcontextprotocol/specification/blob/main/LICENSE) | AI 工具协议 |

### 依赖库

| 项目 | 许可证 | 用途 |
|------|--------|------|
| [gray-matter](https://github.com/jonschlinkert/gray-matter) | [MIT](https://github.com/jonschlinkert/gray-matter/blob/master/LICENSE) | Frontmatter 解析 |
| [diff](https://github.com/kpdecker/jsdiff) | [BSD-3-Clause](https://github.com/kpdecker/jsdiff/blob/main/LICENSE) | 文本差异对比 |
| [zod](https://github.com/colinhacks/zod) | [MIT](https://github.com/colinhacks/zod/blob/master/LICENSE) | TypeScript 验证 |

---

## ☁️ 基础设施

| 服务 | 用途 | 条款 |
|------|------|------|
| [Cloudflare Workers](https://workers.cloudflare.com/) | Edge 部署 | [Free tier](https://developers.cloudflare.com/cloudflare-one/plans/) |
| [Cloudflare D1](https://developers.cloudflare.com/d1/) | 数据库 | Free tier: 500MB 存储 |
| [GitHub Actions](https://github.com/features/actions) | CI/CD | Free for public repos |

---

## 📖 文档与灵感

- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [Next.js 文档](https://nextjs.org/docs)
- [Model Context Protocol 规范](https://modelcontextprotocol.io/specification)

---

## 🤝 贡献者

感谢所有为 PromptBridge007 做出贡献的开发者！

---

## 📝 添加新项目到致谢

如果你的代码引用了新的开源项目，请在 PR 描述中包含以下信息：

```markdown
### 新增依赖
- [项目名](链接) - 用途简述 - [许可证](许可证链接)
```

更新此文件时，请确保：
1. 分类正确（System Prompts / 技术依赖 / 基础设施）
2. 包含正确的许可证信息
3. 按字母顺序排列同一类别下的条目

---

*最后更新: 2026-06-26*
