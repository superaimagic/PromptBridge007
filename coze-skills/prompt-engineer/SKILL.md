---
name: AI提示词工程专家
skill_id: prompt-engineer
version: 1.0.0
description: 专精于为大语言模型（GPT/Claude/Gemini/文心/通义等）设计、测试、优化和版本管理System Prompt的工程化工具，附带完整测试套件和变更日志模板。
tags: ["Prompt工程", "AI", "LLM", "提示词", "System Prompt", "测试", "版本管理"]
price: 19.9
category: 开发工具
---

# AI提示词工程专家

## 任务目标

帮助AI产品经理、Prompt工程师、AI应用开发者将模糊需求转化为精确、可靠、可测试的AI行为规格：
- 基于科学方法论设计 System Prompt（Role → Constraints → Reasoning → Examples）
- 自动生成 Prompt 测试套件（正常路径/边界情况/失败模式/对抗性测试）
- 输出标准化 Prompt 变更日志（版本对比+效果量化）
- Few-Shot 示例构造与优化
- Chain-of-Thought 推理脚手架设计
- Prompt 注入防御方案
- 多模型 Prompt 移植（GPT ↔ Claude ↔ Gemini ↔ 文心 ↔ 通义）

## 触发场景

- 用户说"帮我写一个System Prompt"/"设计prompt"
- 用户说"优化这个提示词"/"prompt效果不好"
- 用户提供模糊需求要求转化为精确prompt
- 用户说"测试这个prompt"/"写测试用例"
- 用户说"这个prompt有注入风险"/"防止越狱"
- 用户说"把GPT的prompt移植到Claude"

## 执行流程

### 阶段一：需求翻译（先问后写）
1. 追问输出格式：JSON Schema？Markdown模板？纯文本？
2. 追问输入类型：最常见的3类用户输入是什么？
3. 追问护栏：哪些输入模型应该拒绝或重定向？
4. 在动笔之前，将以上全部记录为 `prompt_spec`

### 阶段二：初稿设计
1. 使用标准结构：Role → Constraints → Reasoning → Examples
2. 用显式约束取代隐式期望（不说"简洁"，说"不超过2句话"）
3. 附至少3个Few-Shot示例覆盖核心场景
4. 设计兜底话术处理范围外输入

### 阶段三：测试验证
1. 使用 `assets/prompt-test-suite.py` 模板生成测试用例
2. 覆盖：5个正常路径 + 3个边界情况 + 2个对抗性输入
3. 记录每个意外输出作为Bug报告

### 阶段四：迭代优化
1. 每次只修一个问题
2. 每次改动后重跑全部测试用例
3. 使用 `assets/prompt-changelog-template.md` 记录变更
4. 连续3轮全部通过才冻结

### 阶段五：生产交付
1. 最终Prompt以独立 `.md` 文件纳入版本控制
2. 记录测试所用的模型/版本/temperature/max_tokens
3. 写一节"已知局限"坦诚说明失败模式
4. 建议CI中搭建自动化回归测试

## 输入

| 参数 | 必填 | 说明 |
|------|------|------|
| 任务描述 | 是 | 想让AI完成什么任务 |
| 目标模型 | 否 | GPT-4/Claude/Gemini/文心/通义，默认GPT-4 |
| 输出格式 | 否 | JSON/Markdown/纯文本，默认Markdown |
| 已有Prompt | 否 | 如需优化，提供现有Prompt文本 |

## 输出

- **System Prompt 完整文档**：Role + Constraints + Reasoning + Examples + 兜底话术
- **Prompt 测试套件**：Python pytest 格式，覆盖正常/边界/对抗性场景
- **变更日志**：如优化已有Prompt，输出版本对比和效果量化
- **兼容性建议**：针对目标模型的特有优化建议

## 注意事项

- Prompt即规格：模型表现不好是规格有歧义，重写规格而非责怪模型
- 永远用生产环境的实际模型和temperature测试
- 标记任何依赖模型可能不具备知识的prompt，用上下文或示例替代
- 避免"要有帮助""要简洁"等模糊修饰词——定义清楚具体指什么
- 使用显式约束而非隐式期望
