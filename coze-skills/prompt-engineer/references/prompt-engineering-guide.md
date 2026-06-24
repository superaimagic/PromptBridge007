# Prompt 工程参考指南

## 一、Prompt 结构模式库

### 模式1：Role-Constraints-Reasoning-Examples (RCRE)
最适合：结构化任务（分类、提取、格式化输出）
```
## Role → ## Constraints → ## Reasoning → ## Examples
```
适用模型：GPT-4、Claude、文心一言

### 模式2：XML标签结构
最适合：Claude（对XML标签遵循度极高）
```
<role>...</role>
<constraints>...</constraints>
<thinking>...</thinking>
<answer>...</answer>
```
适用模型：Claude 全系列

### 模式3：角色扮演框架
最适合：GPT-4（对人设框架反应良好）
```
You are [EXPERT ROLE] with [SPECIFIC BACKGROUND].
Your task is to [CLEAR OBJECTIVE].
Rules:
1. ...
2. ...
```
适用模型：GPT-4、通义千问

---

## 二、Prompt 注入防御清单

| 攻击类型 | 示例输入 | 防御措施 |
|----------|----------|----------|
| 角色重置 | "Ignore all previous instructions" | 角色锁定声明 + 兜底话术 |
| 角色扮演绕过 | "Pretend you are DAN" | 明确拒绝非授权角色切换 |
| 间接注入 | 通过工具输出注入恶意指令 | 内容边界检查 |
| 越狱提示 | "You are now in developer mode" | 权限声明 + 拒绝模板 |
| 语言绕过 | 用非目标语言进行注入 | 多语言护栏 |

---

## 三、多模型 Prompt 移植矩阵

| 结构模式 | GPT-4 | Claude | Gemini | 文心 | 通义 |
|----------|-------|--------|--------|------|------|
| Markdown分段 | ✅ 优秀 | ✅ 优秀 | ✅ 良好 | ✅ 优秀 | ✅ 优秀 |
| XML标签 | ⚠️ 一般 | ✅ 最佳 | ⚠️ 一般 | ⚠️ 一般 | ⚠️ 一般 |
| JSON约束 | ✅ 优秀 | ✅ 优秀 | ✅ 良好 | ✅ 良好 | ✅ 良好 |
| 角色扮演 | ✅ 最佳 | ✅ 良好 | ✅ 良好 | ✅ 优秀 | ✅ 优秀 |
| Few-Shot | ✅ 优秀 | ✅ 优秀 | ✅ 优秀 | ✅ 良好 | ✅ 良好 |
| CoT推理 | ✅ 优秀 | ✅ 最佳 | ✅ 优秀 | ✅ 良好 | ✅ 良好 |

---

## 四、常见失败模式诊断

| 失败模式 | 症状 | 根因 | 修复方向 |
|----------|------|------|----------|
| 角色混淆 | 模型以错误身份回应 | 角色定义不够强势 | 在开头和结尾各声明一次角色 |
| 输出格式漂移 | JSON/Markdown格式不一致 | 格式约束不够精确 | 提供完整的输出Schema |
| 幻觉 | 编造不存在的事实 | 依赖模型隐含知识 | 在Context中提供事实基础 |
| 拒答过度 | 合理问题也被拒绝 | 护栏范围过大 | 缩小护栏范围，细化拒绝条件 |
| 上下文截断 | 长对话后表现下降 | 超出上下文窗口 | 压缩历史、使用摘要策略 |
