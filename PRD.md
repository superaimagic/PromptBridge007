# PromptBridge007 PRD：多项目API接入与Prompt分发能力

> **文档版本**: v1.0  
> **创建日期**: 2026-06-27  
> **状态**: 待评审  
> **作者**: 产品团队

---

## 1. 执行摘要

PromptBridge007 当前拥有 31 个 API 端点、200+ 系统提示词、8 个 MCP 工具，但存在三个致命短板：**零认证**、**无项目隔离**、**无外部分发机制**。本 PRD 旨在将系统从"单租户本地工具"升级为"多项目 Prompt 中枢"，使 10+ 外部已上线系统能通过 API Key 安全接入，按项目获取、搜索、订阅 Prompt 更新。

---

## 2. 问题陈述

### 谁有这个问题？
拥有 10+ 已上线项目的团队，每个项目需要 AI Prompt 能力（如系统提示词、角色设定、工具指令等），但各项目独立维护 Prompt 导致版本混乱、无法复用、更新困难。

### 问题是什么？
1. **无法安全接入**：当前 API 零认证，任何人可调用包括"拖库""写本地文件"在内的所有端点
2. **无项目隔离**：`files` 表有 `project_id` 外键但 API 层完全不消费它，所有项目的 Prompt 混在一起
3. **无分发机制**：外部系统无法按项目拉取 Prompt、无法感知更新、无法通过 MCP 按项目操作

### 为什么令人痛苦？
- **安全风险**：`POST /api/init?force=true` 可直接销毁整个数据库，当前完全开放
- **运维成本**：10+ 项目各自维护 Prompt 副本，更新需逐个修改
- **能力浪费**：200+ 系统提示词已入库，但外部系统无法安全消费

### 证据
- 代码审计：`route.ts` 全文搜索 `Authorization/Bearer/apiKey` → 0 命中
- `GET /api/files` 无 `projectId` 过滤参数 → 所有项目数据混返回
- MCP Server 8 个工具均不接受 `projectId` → 无法按项目操作
- `client.ts` 中 `getDeployments()` 调用 `/deployments`（复数），后端实际是 `/deploy`（单数）→ 前后端断链

---

## 3. 目标用户与 Personas

### 主要 Persona：平台集成工程师（张工）
- **角色**: 负责将 10+ 已上线项目接入 PromptBridge007
- **技术精通度**: 高（全栈工程师，熟悉 REST API）
- **目标**: 
  - 为每个项目分配独立 API Key
  - 通过 API 按项目拉取 Prompt 到各自系统
  - 项目间 Prompt 数据严格隔离
- **痛点**: 当前无认证、无隔离，不敢让外部系统直连

### 次要 Persona：AI 应用开发者
- **角色**: 在各项目中使用 Prompt 的开发者
- **目标**: 通过 MCP 或 REST API 搜索、获取、转换 Prompt
- **痛点**: 无法限定搜索范围到当前项目

### 次要 Persona：Prompt 管理员
- **角色**: 统一管理所有项目的 Prompt 库
- **目标**: 批量管理、版本控制、审计日志
- **痛点**: 无版本历史 API、无审计日志、无 Webhook 通知

---

## 4. 战略上下文

### 商业目标
- 将 PromptBridge007 从"开发者本地工具"升级为"团队 Prompt 中枢"
- 支撑 10+ 项目的 Prompt 统一管理和分发
- 为后续 SaaS 化（多租户）奠定基础

### 竞争格局
- **LangSmith / LangFlow**: 有 Prompt 管理但偏重 LLM 链路
- **Promptfoo**: 侧重测试，无分发能力
- **差异化**: PromptBridge007 聚焦"跨工具格式转换 + 多项目分发"，填补空白

### 为什么是现在？
- 200+ 系统提示词已入库（system_prompts_leaks 数据），数据资产已就绪
- 10+ 项目急需接入，再不做就会各项目各自维护导致混乱
- Cloudflare Workers 部署已接近完成，API 层需同步升级

---

## 5. 解决方案概述

### 5.1 三层架构升级

```
┌─────────────────────────────────────────────────────────┐
│  外部系统 (10+ 项目)                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │ 项目 A    │  │ 项目 B    │  │ 项目 C    │               │
│  │ API-Key-A │  │ API-Key-B │  │ API-Key-C │               │
│  └─────┬────┘  └─────┬────┘  └─────┬────┘               │
│        │             │             │                      │
│  ┌─────▼─────────────▼─────────────▼─────┐               │
│  │     API Gateway (认证 + 限流 + CORS)    │               │
│  │  · API Key 验证 → 识别项目             │               │
│  │  · 速率限制 (100 req/min per key)      │               │
│  │  · CORS 白名单                          │               │
│  └─────────────────┬─────────────────────┘               │
│                    │                                      │
│  ┌─────────────────▼─────────────────────┐               │
│  │     项目隔离层 (Project Context)        │               │
│  │  · 所有查询自动附加 WHERE project_id=?  │               │
│  │  · 所有写入自动绑定 project_id          │               │
│  │  · 跨项目操作需管理员权限               │               │
│  └─────────────────┬─────────────────────┘               │
│                    │                                      │
│  ┌─────────────────▼─────────────────────┐               │
│  │     Prompt 分发层                       │               │
│  │  · GET /api/v1/projects/:id/prompts     │               │
│  │  · POST /api/v1/projects/:id/subscribe  │               │
│  │  · Webhook 通知 (Prompt 更新事件)       │               │
│  │  · MCP 工具支持 projectId 参数          │               │
│  └─────────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────┘
```

### 5.2 关键功能

1. **API Key 管理**
   - 每个项目分配独立 API Key（`pb_[project-id]_[random-32-chars]`）
   - 支持生成、吊销、轮换
   - API Key 绑定到项目，自动注入项目上下文

2. **项目隔离**
   - 所有 `/api/v1/*` 端点自动按 API Key 对应的 projectId 过滤
   - 文件创建/更新/删除自动绑定 projectId
   - 管理员端点（`/api/admin/*`）可跨项目操作

3. **Prompt 分发**
   - `GET /api/v1/prompts` — 按项目列出 Prompt（带分页、过滤）
   - `GET /api/v1/prompts/:id` — 获取单个 Prompt（校验项目归属）
   - `POST /api/v1/prompts/search` — 项目范围内搜索
   - `POST /api/v1/prompts/:id/deploy` — 部署到指定工具
   - Webhook 通知（Prompt 新增/更新/删除事件）

4. **MCP 增强**
   - 所有 MCP 工具支持 `projectId` 参数
   - HTTP 接入通过 API Key 自动识别项目
   - Stdio 接入通过环境变量 `PB_PROJECT_ID` 指定项目

5. **版本管理**
   - `GET /api/v1/prompts/:id/versions` — 版本历史
   - `POST /api/v1/prompts/:id/rollback/:version` — 回滚到指定版本

---

## 6. 成功指标

### 主要指标
**外部系统接入率**（10+ 项目中成功接入并通过 API 获取 Prompt 的比例）
- **当前**: 0%（无安全接入能力）
- **目标**: 80%（8+ 项目在 2 周内接入）

### 次要指标
- **API 调用量**: 目标 1000+ req/day（10+ 项目日常消费）
- **Prompt 复用率**: 目标 60%（同一 Prompt 被多个项目引用）
- **API 响应时间**: P95 < 200ms（Cloudflare Workers Edge）

### 防护指标
- **安全事件**: 0 次（无未授权访问）
- **数据泄露**: 0 次（项目间数据严格隔离）

---

## 7. 用户故事与需求

### Epic 假设
我们相信为 PromptBridge007 添加 API Key 认证、项目隔离和 Prompt 分发能力，将使 10+ 外部系统在 2 周内安全接入，因为当前各项目急需统一的 Prompt 管理而无法安全直连。我们将在接入后 30 天通过外部系统接入率来衡量成功。

### 用户故事

**故事 1：为项目分配 API Key**
作为平台集成工程师，我希望为每个项目生成独立的 API Key，以便外部系统安全认证。

验收标准：
- [ ] 管理后台可创建 API Key，格式 `pb_[project-id]_[32位随机字符]`
- [ ] API Key 绑定到特定项目，不可跨项目使用
- [ ] 支持吊销 API Key（吊销后立即失效）
- [ ] API Key 列表显示创建时间、最后使用时间、状态
- [ ] API Key 仅在创建时显示完整值，之后只显示前缀

**故事 2：外部系统通过 API Key 获取项目 Prompt**
作为外部系统开发者，我希望通过 API Key 获取当前项目的 Prompt 列表，以便在系统中使用。

验收标准：
- [ ] `GET /api/v1/prompts` 需在 Header 中携带 `X-API-Key`
- [ ] 返回结果仅包含 API Key 对应项目的 Prompt
- [ ] 支持 `page`、`page_size`、`tool`、`role`、`language` 等过滤参数
- [ ] 未携带 API Key 返回 `401 Unauthorized`
- [ ] API Key 无效返回 `403 Forbidden`
- [ ] 响应时间 P95 < 200ms

**故事 3：项目间数据严格隔离**
作为平台集成工程师，我希望项目 A 的 API Key 无法访问项目 B 的 Prompt，以确保数据安全。

验收标准：
- [ ] 使用项目 A 的 API Key 请求 `GET /api/v1/prompts` 只返回项目 A 的文件
- [ ] 使用项目 A 的 API Key 请求 `GET /api/v1/prompts/:id` 若该文件属于项目 B，返回 `404 Not Found`
- [ ] 使用项目 A 的 API Key 请求 `DELETE /api/v1/prompts/:id` 若该文件属于项目 B，返回 `404 Not Found`
- [ ] 不存在任何旁路方式跨项目访问

**故事 4：通过 MCP 按项目搜索 Prompt**
作为 AI 应用开发者，我希望 MCP 工具支持 projectId 参数，以便在指定项目范围内搜索。

验收标准：
- [ ] `search_prompts` 工具支持 `projectId` 参数
- [ ] HTTP 接入时，若携带 API Key 则自动识别项目，`projectId` 参数可省略
- [ ] Stdio 接入时，通过 `PB_PROJECT_ID` 环境变量指定项目
- [ ] 未指定项目时返回全局结果（仅管理员模式可用）

**故事 5：Prompt 更新 Webhook 通知**
作为外部系统开发者，我希望当 Prompt 更新时收到 Webhook 通知，以便同步到我的系统。

验收标准：
- [ ] 管理后台可为每个项目配置 Webhook URL
- [ ] Prompt 新增/更新/删除时触发 Webhook（POST JSON）
- [ ] Webhook 载荷包含：事件类型、Prompt ID、项目 ID、变更时间
- [ ] Webhook 失败自动重试 3 次（间隔 1min/5min/15min）
- [ ] 管理后台可查看 Webhook 发送日志

**故事 6：Prompt 版本历史查询**
作为 Prompt 管理员，我希望查看 Prompt 的版本历史，以便追踪变更和回滚。

验收标准：
- [ ] `GET /api/v1/prompts/:id/versions` 返回版本列表（含版本号、内容摘要、变更时间）
- [ ] `POST /api/v1/prompts/:id/rollback/:version` 可回滚到指定版本
- [ ] 回滚操作创建新版本（而非覆盖历史）

**故事 7：API 速率限制**
作为平台集成工程师，我希望每个 API Key 有速率限制，以防止滥用。

验收标准：
- [ ] 默认限制：100 req/min per API Key
- [ ] 超限返回 `429 Too Many Requests` + `Retry-After` Header
- [ ] 管理员可调整单个 API Key 的限流配额
- [ ] 速率限制基于 Cloudflare Workers KV 或 Durable Objects

---

## 8. API 端点分级设计

### 8.1 公开端点（无需认证）

| 端点 | 说明 |
|------|------|
| `GET /api/v1/tools` | 支持的工具列表 |
| `GET /api/v1/public-sources` | 公共 Prompt 源列表 |
| `GET /api/v1/health` | 健康检查 |

### 8.2 项目级端点（需 API Key，自动隔离）

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/v1/prompts` | GET | 列出当前项目的 Prompt |
| `/api/v1/prompts` | POST | 在当前项目创建 Prompt |
| `/api/v1/prompts/:id` | GET | 获取 Prompt（校验项目归属） |
| `/api/v1/prompts/:id` | PUT | 更新 Prompt |
| `/api/v1/prompts/:id` | DELETE | 删除 Prompt |
| `/api/v1/prompts/search` | POST | 项目内搜索 |
| `/api/v1/prompts/:id/versions` | GET | 版本历史 |
| `/api/v1/prompts/:id/rollback/:version` | POST | 回滚版本 |
| `/api/v1/prompts/:id/deploy` | POST | 部署到工具 |
| `/api/v1/prompts/:id/convert` | POST | 格式转换 |
| `/api/v1/prompts/similar/:id` | GET | 相似推荐 |
| `/api/v1/mcp/execute` | POST | MCP 工具执行（带项目上下文） |

### 8.3 管理员端点（需管理员 Token）

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/admin/projects` | GET/POST | 项目管理 |
| `/api/admin/projects/:id` | GET/PUT/DELETE | 项目详情/更新/删除 |
| `/api/admin/api-keys` | GET/POST | API Key 管理 |
| `/api/admin/api-keys/:id` | DELETE | 吊销 API Key |
| `/api/admin/webhooks` | GET/POST | Webhook 配置 |
| `/api/admin/audit-logs` | GET | 审计日志 |
| `/api/admin/init` | POST | 系统初始化（移除 force 参数） |

### 8.4 内部端点（仅本地开发，生产环境禁用）

| 端点 | 说明 |
|------|------|
| `/api/scan` | 环境扫描（依赖 Node.js fs，Workers 不可用） |
| `/api/sync` | 文件同步（依赖 Node.js fs，Workers 不可用） |
| `/api/sync/watch/*` | 文件监听（依赖 Node.js fs，Workers 不可用） |

---

## 9. 范围外

**此版本不包括：**
- **多租户 SaaS 化**（组织/团队层级）— 先实现项目级隔离，SaaS 化是下一阶段
- **Prompt A/B 测试** — 增加复杂性，先验证基础分发能力
- **Prompt 效果分析**（点击率、转化率）— 需要前端埋点，暂不涉及
- **细粒度 RBAC**（角色权限管理）— 先用 API Key 做项目级隔离，RBAC 后续迭代
- **Prompt 审批工作流** — 先支持直接发布，审批流后续迭代

---

## 10. 依赖与风险

### 依赖
- **Cloudflare Workers 部署**：当前部署失败需先修复（CI/CD 构建问题）
- **D1 数据库迁移**：需新增 `api_keys`、`webhooks`、`audit_logs` 表
- **Cloudflare KV**：速率限制需要 KV 或 Durable Objects 支持

### 风险与缓解措施

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| Workers 部署不成功 | 高 | 高 | 优先修复 CI/CD，必要时回退到 Vercel |
| API Key 泄露 | 中 | 高 | 支持快速吊销 + 轮换；传输全程 HTTPS |
| 项目隔离不彻底 | 中 | 高 | 代码审查 + 自动化测试覆盖所有跨项目场景 |
| 速率限制误伤 | 低 | 中 | 可配置配额 + 白名单机制 |
| Webhook 队列积压 | 低 | 中 | 失败重试 + 死信队列 |

---

## 11. 未解决的问题

1. **API 版本策略**：v1 路径前缀 `/api/v1/` 还是 Header `Accept-Version: 1`？（建议：URL 前缀，更直观）
2. **API Key 存储**：明文存 D1 还是哈希存储？（建议：SHA-256 哈希存储，创建时仅展示一次）
3. **管理员认证方式**：单独的管理员 Token 还是复用 Cloudflare Access？（建议：先实现管理员 Token，后续接 Cloudflare Access）
4. **旧 API 兼容**：是否保留 `/api/*`（无版本前缀）作为兼容入口？（建议：保留但标记 deprecated，6 个月后移除）
5. **Scan/Sync 在 Workers 的替代方案**：是否提供 CLI-only 模式？（建议：是，Scan/Sync 仅通过本地 CLI 可用，API 层不暴露）

---

## 12. 实施路线图

### Phase 1：安全基线（第 1 周）
- [ ] 实现 API Key 认证中间件
- [ ] 新增 `api_keys` 表和 CRUD 端点
- [ ] 所有 `/api/v1/*` 端点强制 API Key 认证
- [ ] 修复 `POST /api/init` 安全漏洞（移除 force 或限制为管理员）
- [ ] CORS 白名单配置

### Phase 2：项目隔离（第 2 周）
- [ ] `files` 查询/创建/更新/删除全部绑定 projectId
- [ ] MCP 工具支持 projectId 参数
- [ ] `client.ts` 修复前后端契约不一致
- [ ] 项目隔离自动化测试

### Phase 3：分发能力（第 3 周）
- [ ] Webhook 通知系统
- [ ] Prompt 版本历史 API
- [ ] Prompt 回滚 API
- [ ] 审计日志

### Phase 4：速率限制与运维（第 4 周）
- [ ] Cloudflare KV 速率限制
- [ ] API Key 管理后台 UI
- [ ] 审计日志查看 UI
- [ ] 清理 Hono 死代码

---

## 附录 A：当前系统 API 端点清单（31 个）

> 详细文档见 [API-REFERENCE.md](./API-REFERENCE.md)

| 分类 | 端点数 | 认证状态 | 隔离状态 |
|------|--------|----------|----------|
| 系统初始化 | 1 | ❌ 无 | N/A |
| 项目管理 | 4 | ❌ 无 | ❌ 无 |
| 文件库 | 9 | ❌ 无 | ❌ 无（不按 projectId 过滤） |
| 工具注册 | 1 | ❌ 无 | N/A |
| 环境扫描 | 2 | ❌ 无 | ❌ 无 |
| 部署 | 3 | ❌ 无 | ❌ 无 |
| 同步监听 | 5 | ❌ 无 | ❌ 无 |
| 格式转换 | 1 | ❌ 无 | ❌ 无 |
| 公共源 | 3 | ❌ 无 | N/A |
| MCP 协议 | 2 | ❌ 无 | ❌ 无（工具不支持 projectId） |
| **合计** | **31** | **0% 有认证** | **0% 有隔离** |

---

## 附录 B：前后端契约不一致清单

| 位置 | 问题 | 严重度 |
|------|------|--------|
| `client.ts: getDeployments()` | 调用 `/deployments`（复数），后端实际是 `/deploy`（单数） | 高 |
| `client.ts: sync()` | 传 `file_id`，后端不接收；少传 `sync_all` | 高 |
| `client.ts: syncPublicSource()` | 期望响应 `started_at`，后端返回 `status/files_*` | 中 |
| MCP HTTP vs REST deploy | HTTP MCP 的 deploy 不传 projectId，REST 的 deploy 传 | 中 |
| MCP HTTP vs Stdio deploy | 行为不统一 | 低 |

---

## 附录 C：缺失能力清单

### 安全类（致命）
- [ ] API Key / Token 认证
- [ ] CORS 配置
- [ ] 速率限制
- [ ] `POST /api/init` 的 force 参数防护

### 隔离类（高）
- [ ] files 查询按 projectId 过滤
- [ ] files 创建绑定 projectId
- [ ] 文件操作的项目归属校验
- [ ] MCP 工具的 projectId 参数
- [ ] projectId 字段加索引

### 分发类（高）
- [ ] 项目级 Prompt 分发端点
- [ ] Webhook 通知
- [ ] API Key 生命周期管理

### 版本管理类（中）
- [ ] 版本历史查询 API
- [ ] 版本回滚 API
- [ ] 版本对比 API

### 一致性类（中）
- [ ] 清理 Hono 死代码
- [ ] 修复 client.ts 契约不一致
- [ ] 统一 MCP HTTP / Stdio / REST 三处行为

---

*本 PRD 将随开发进展持续更新。*
