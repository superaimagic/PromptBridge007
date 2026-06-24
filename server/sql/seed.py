#!/usr/bin/env python3
"""PromptMS Seed Data Script - Insert initial data into MySQL"""
import mysql.connector
import hashlib

conn = mysql.connector.connect(
    host='localhost',
    user='root',
    password='root',
    database='promptms',
    charset='utf8mb4'
)
cursor = conn.cursor()

# Roles
roles = [
    ('r10000000001', 'SYSTEM_ADMIN', '系统管理员', '拥有系统全部权限', '["*"]'),
    ('r10000000002', 'WORKFLOW_EDITOR', '工作流编辑者', '可创建/编辑工作流', '["workflow:read","workflow:write","workflow:execute","prompt:read","prompt:write","execution:read"]'),
    ('r10000000003', 'PROMPT_EDITOR', '提示词编辑者', '可创建/编辑提示词', '["prompt:read","prompt:write","workflow:read","execution:read"]'),
    ('r10000000004', 'VIEWER', '查看者', '只读权限', '["prompt:read","workflow:read","execution:read","monitor:read"]'),
]
cursor.executemany("INSERT INTO roles (id, name, display_name, description, permissions) VALUES (%s, %s, %s, %s, %s)", roles)

# Admin user (password: admin123)
# bcrypt hash generated separately
admin_hash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'
users = [
    ('u10000000001', 'admin', 'admin@promptms.com', admin_hash, '系统管理员', None, 1),
]
cursor.executemany("INSERT INTO users (id, username, email, password_hash, nickname, avatar, status) VALUES (%s, %s, %s, %s, %s, %s, %s)", users)

# User roles
user_roles = [
    ('ur1000000001', 'u10000000001', 'r10000000001'),
]
cursor.executemany("INSERT INTO user_roles (id, user_id, role_id) VALUES (%s, %s, %s)", user_roles)

# Categories (root)
categories_root = [
    ('c10000000001', '产品管理', None, 1, 'project'),
    ('c10000000002', '运营推广', None, 2, 'bulb'),
    ('c10000000003', '客户服务', None, 3, 'customer-service'),
    ('c10000000004', '人力资源', None, 4, 'team'),
    ('c10000000005', '研发开发', None, 5, 'code'),
    ('c10000000006', '设计创意', None, 6, 'palette'),
]
cursor.executemany("INSERT INTO categories (id, name, parent_id, sort_order, icon) VALUES (%s, %s, %s, %s, %s)", categories_root)

# Categories (children)
categories_child = [
    ('c20000000001', '需求分析', 'c10000000001', 1, 'search'),
    ('c20000000002', 'PRD生成', 'c10000000001', 2, 'file-text'),
    ('c20000000003', '内容撰写', 'c10000000002', 1, 'edit'),
    ('c20000000004', '数据分析', 'c10000000002', 2, 'bar-chart'),
    ('c20000000005', '工单处理', 'c10000000003', 1, 'message'),
    ('c20000000006', '情绪安抚', 'c10000000003', 2, 'smile'),
    ('c20000000007', '简历筛选', 'c10000000004', 1, 'user'),
    ('c20000000008', '代码审查', 'c10000000005', 1, 'code'),
    ('c20000000009', '设计需求', 'c10000000006', 1, 'picture'),
]
cursor.executemany("INSERT INTO categories (id, name, parent_id, sort_order, icon) VALUES (%s, %s, %s, %s, %s)", categories_child)

# Tags
tags = [
    ('t10000000001', 'GPT-4', '#52c41a'),
    ('t10000000002', 'GPT-3.5', '#1890ff'),
    ('t10000000003', 'Claude', '#722ed1'),
    ('t10000000004', '通用', '#faad14'),
    ('t10000000005', '高优先级', '#f5222d'),
    ('t10000000006', '已验证', '#13c2c2'),
    ('t10000000007', '实验中', '#eb2f96'),
    ('t10000000008', 'Few-shot', '#2f54eb'),
]
cursor.executemany("INSERT INTO tags (id, name, color) VALUES (%s, %s, %s)", tags)

# Role templates
role_templates = [
    ('rt0000000001', 'pm', '产品经理', '产品管理工作流：需求分析、PRD生成、竞品研究', 'project', '[]', '[]', '{"metrics":["prd_adoption_rate","requirement_clarification_rounds","dev_feedback_score"]}', 1, 1),
    ('rt0000000002', 'operations', '运营专员', '运营工作流：内容撰写、数据分析、活动策划', 'bulb', '[]', '[]', '{"metrics":["content_adoption_rate","engagement_improvement","user_feedback_score"]}', 1, 2),
    ('rt0000000003', 'customer_service', '客服代表', '客服工作流：工单分类、智能回复、满意度回访', 'customer-service', '[]', '[]', '{"metrics":["first_resolution_rate","customer_satisfaction","avg_handling_time"]}', 1, 3),
    ('rt0000000004', 'hr', 'HR专员', 'HR工作流：简历筛选、面试安排、员工关怀', 'team', '[]', '[]', '{"metrics":["resume_screening_accuracy","interview_score_correlation"]}', 1, 4),
    ('rt0000000005', 'developer', '开发工程师', '开发工作流：代码审查、Bug分析、技术方案', 'code', '[]', '[]', '{"metrics":["code_review_efficiency","bug_detection_rate"]}', 1, 5),
    ('rt0000000006', 'designer', '设计师', '设计工作流：需求理解、素材生成、规范更新', 'palette', '[]', '[]', '{"metrics":["revision_count","delivery_timeliness","stakeholder_satisfaction"]}', 1, 6),
]
cursor.executemany("INSERT INTO role_templates (id, name, display_name, description, icon, workflow_ids, prompt_ids, metrics_config, is_builtin, sort_order) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)", role_templates)

# Prompts
prompts = [
    ('p10000000001', '需求分析助手', '帮助产品经理理解和分析用户需求，输出结构化的需求分析报告',
     '你是一位资深产品经理，擅长需求分析和用户研究。请对以下需求进行深入分析：\n\n## 输入需求\n{{requirement}}\n\n## 分析维度\n1. **需求背景**：为什么会有这个需求？\n2. **用户画像**：目标用户是谁？\n3. **核心场景**：用户在什么场景下使用？\n4. **功能拆解**：需要哪些具体功能？\n5. **优先级评估**：各功能的优先级排序\n6. **潜在风险**：可能存在的技术或业务风险\n7. **成功指标**：如何衡量需求实现的成功\n\n请以结构化格式输出分析结果。',
     '[{"name":"requirement","type":"text","required":true,"default":"","description":"用户需求描述"}]',
     '{"model":"gpt-4","provider":"openai","temperature":0.7,"max_tokens":2000}',
     1, 'u10000000001', 'c20000000001', 'public', '{"avg_score":4.5,"usage_count":127,"adopt_rate":0.78}'),

    ('p10000000002', '内容撰写助手', '根据主题和要求生成高质量的营销内容',
     '你是一位资深内容运营专家，擅长各类营销文案撰写。请根据以下信息撰写内容：\n\n## 撰写要求\n- 主题：{{topic}}\n- 目标受众：{{audience}}\n- 内容类型：{{content_type}}\n- 语气风格：{{tone}}\n- 字数要求：{{word_count}}字左右\n\n## 输出要求\n1. 吸引眼球的标题（3个备选）\n2. 正文内容\n3. 适合不同渠道的摘要版本（微博/微信/小红书）\n4. 推荐的发布时间',
     '[{"name":"topic","type":"text","required":true,"default":"","description":"内容主题"},{"name":"audience","type":"text","required":false,"default":"通用用户","description":"目标受众"},{"name":"content_type","type":"select","required":false,"default":"文章","options":["文章","短视频脚本","社交媒体帖子","邮件"],"description":"内容类型"},{"name":"tone","type":"select","required":false,"default":"专业","options":["专业","活泼","温情","幽默"],"description":"语气风格"},{"name":"word_count","type":"number","required":false,"default":"800","description":"字数要求"}]',
     '{"model":"gpt-4","provider":"openai","temperature":0.8,"max_tokens":3000}',
     1, 'u10000000001', 'c20000000003', 'public', '{"avg_score":4.3,"usage_count":89,"adopt_rate":0.72}'),

    ('p10000000003', '客服智能回复', '根据客户问题生成专业的客服回复',
     '你是一位经验丰富的客服代表，擅长处理各类客户咨询和投诉。请根据以下信息生成回复：\n\n## 客户信息\n- 客户问题：{{customer_question}}\n- 客户情绪：{{customer_emotion}}\n- 问题分类：{{category}}\n\n## 回复要求\n1. 先表达对客户感受的理解（同理心）\n2. 给出明确的解决方案或答复\n3. 提供后续跟进建议\n4. 语气要{{tone}}，避免使用过于生硬的官方用语\n\n## 注意事项\n- 绝不透露公司内部信息\n- 涉及退款/赔偿问题，建议转交专人处理\n- 如无法确定答案，建议客户等待人工服务',
     '[{"name":"customer_question","type":"text","required":true,"description":"客户问题"},{"name":"customer_emotion","type":"select","required":false,"default":"neutral","options":["neutral","angry","anxious","confused"],"description":"客户情绪"},{"name":"category","type":"select","required":false,"default":"general","options":["general","complaint","technical","billing"],"description":"问题分类"},{"name":"tone","type":"select","required":false,"default":"温暖专业","options":["温暖专业","正式严肃","亲切随和"],"description":"回复语气"}]',
     '{"model":"gpt-3.5-turbo","provider":"openai","temperature":0.6,"max_tokens":1000}',
     1, 'u10000000001', 'c20000000005', 'public', '{"avg_score":4.2,"usage_count":256,"adopt_rate":0.82}'),
]
cursor.executemany("""INSERT INTO prompts (id, title, description, content, variables, model_config, current_version, created_by, category_id, visibility, metrics)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""", prompts)

# Prompt versions
prompt_versions = [
    ('pv0000000001', 'p10000000001', 1, 'v1.0',
     '你是一位资深产品经理，擅长需求分析和用户研究。请对以下需求进行深入分析：\n\n## 输入需求\n{{requirement}}\n\n## 分析维度\n1. **需求背景**：为什么会有这个需求？\n2. **用户画像**：目标用户是谁？\n3. **核心场景**：用户在什么场景下使用？\n4. **功能拆解**：需要哪些具体功能？\n5. **优先级评估**：各功能的优先级排序\n6. **潜在风险**：可能存在的技术或业务风险\n7. **成功指标**：如何衡量需求实现的成功\n\n请以结构化格式输出分析结果。',
     '[{"name":"requirement","type":"text","required":true,"default":"","description":"用户需求描述"}]',
     '{"model":"gpt-4","provider":"openai","temperature":0.7,"max_tokens":2000}',
     'create', '初始版本', 127, 4.50, 1, 1, 'u10000000001'),

    ('pv0000000002', 'p10000000002', 1, 'v1.0',
     '你是一位资深内容运营专家，擅长各类营销文案撰写。请根据以下信息撰写内容：\n\n## 撰写要求\n- 主题：{{topic}}\n- 目标受众：{{audience}}\n- 内容类型：{{content_type}}\n- 语气风格：{{tone}}\n- 字数要求：{{word_count}}字左右\n\n## 输出要求\n1. 吸引眼球的标题（3个备选）\n2. 正文内容\n3. 适合不同渠道的摘要版本（微博/微信/小红书）\n4. 推荐的发布时间',
     '[{"name":"topic","type":"text","required":true,"default":"","description":"内容主题"},{"name":"audience","type":"text","required":false,"default":"通用用户","description":"目标受众"},{"name":"content_type","type":"select","required":false,"default":"文章","options":["文章","短视频脚本","社交媒体帖子","邮件"],"description":"内容类型"},{"name":"tone","type":"select","required":false,"default":"专业","options":["专业","活泼","温情","幽默"],"description":"语气风格"},{"name":"word_count","type":"number","required":false,"default":"800","description":"字数要求"}]',
     '{"model":"gpt-4","provider":"openai","temperature":0.8,"max_tokens":3000}',
     'create', '初始版本', 89, 4.30, 1, 1, 'u10000000001'),

    ('pv0000000003', 'p10000000003', 1, 'v1.0',
     '你是一位经验丰富的客服代表，擅长处理各类客户咨询和投诉。请根据以下信息生成回复：\n\n## 客户信息\n- 客户问题：{{customer_question}}\n- 客户情绪：{{customer_emotion}}\n- 问题分类：{{category}}\n\n## 回复要求\n1. 先表达对客户感受的理解（同理心）\n2. 给出明确的解决方案或答复\n3. 提供后续跟进建议\n4. 语气要{{tone}}，避免使用过于生硬的官方用语\n\n## 注意事项\n- 绝不透露公司内部信息\n- 涉及退款/赔偿问题，建议转交专人处理\n- 如无法确定答案，建议客户等待人工服务',
     '[{"name":"customer_question","type":"text","required":true,"description":"客户问题"},{"name":"customer_emotion","type":"select","required":false,"default":"neutral","options":["neutral","angry","anxious","confused"],"description":"客户情绪"},{"name":"category","type":"select","required":false,"default":"general","options":["general","complaint","technical","billing"],"description":"问题分类"},{"name":"tone","type":"select","required":false,"default":"温暖专业","options":["温暖专业","正式严肃","亲切随和"],"description":"回复语气"}]',
     '{"model":"gpt-3.5-turbo","provider":"openai","temperature":0.6,"max_tokens":1000}',
     'create', '初始版本', 256, 4.20, 1, 1, 'u10000000001'),
]
cursor.executemany("""INSERT INTO prompt_versions (id, prompt_id, version, version_tag, content, variables, model_config, change_type, change_log, execution_count, avg_score, is_stable, is_current, created_by)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""", prompt_versions)

# Prompt tags
prompt_tags = [
    ('p10000000001', 't10000000001'),
    ('p10000000001', 't10000000006'),
    ('p10000000002', 't10000000001'),
    ('p10000000002', 't10000000004'),
    ('p10000000003', 't10000000002'),
    ('p10000000003', 't10000000006'),
]
cursor.executemany("INSERT INTO prompt_tags (prompt_id, tag_id) VALUES (%s, %s)", prompt_tags)

# Workflows
workflows = [
    ('w10000000001', 'PM需求→PRD自动生成', '从需求输入到PRD文档生成的完整工作流', 'u10000000001',
     '{"type":"object","properties":{"requirement":{"type":"string","title":"需求描述"},"product_name":{"type":"string","title":"产品名称"},"target_users":{"type":"string","title":"目标用户"}}}',
     '{"type":"object","properties":{"prd_document":{"type":"string","title":"PRD文档"}}}',
     1, 1, '产品管理', 45, 12000),

    ('w10000000002', '内容运营全流程', '从选题到发布的完整内容运营流程', 'u10000000001',
     '{"type":"object","properties":{"topic":{"type":"string","title":"内容主题"},"channel":{"type":"string","title":"发布渠道"}}}',
     '{"type":"object","properties":{"content":{"type":"string","title":"最终内容"},"schedule":{"type":"string","title":"发布计划"}}}',
     1, 1, '运营推广', 32, 8500),
]
cursor.executemany("""INSERT INTO workflows (id, name, description, created_by, input_schema, output_schema, current_version, is_published, category, execution_count, avg_duration_ms)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""", workflows)

# Workflow versions
import json
wf1_def = json.dumps({
    "nodes": [
        {"id": "start_1", "type": "startNode", "position": {"x": 100, "y": 300}, "data": {"label": "开始"}},
        {"id": "node_1", "type": "promptNode", "position": {"x": 300, "y": 300}, "data": {"label": "需求分析", "promptId": "p10000000001", "promptVersion": 1, "variables": {"requirement": "{{workflow.input.requirement}}"}, "outputKey": "analysis_result"}},
        {"id": "node_2", "type": "aiNode", "position": {"x": 550, "y": 300}, "data": {"label": "PRD大纲生成", "model": "gpt-4", "provider": "openai", "promptTemplate": "根据分析结果生成PRD大纲：{{analysis_result}}", "outputKey": "prd_outline"}},
        {"id": "node_3", "type": "aiNode", "position": {"x": 800, "y": 300}, "data": {"label": "PRD详细撰写", "model": "gpt-4", "provider": "openai", "promptTemplate": "根据大纲撰写完整PRD：{{prd_outline}}", "outputKey": "prd_document"}},
        {"id": "end_1", "type": "endNode", "position": {"x": 1050, "y": 300}, "data": {"label": "结束"}}
    ],
    "edges": [
        {"id": "e1", "source": "start_1", "target": "node_1", "type": "default"},
        {"id": "e2", "source": "node_1", "target": "node_2", "type": "default"},
        {"id": "e3", "source": "node_2", "target": "node_3", "type": "default"},
        {"id": "e4", "source": "node_3", "target": "end_1", "type": "default"}
    ]
}, ensure_ascii=False)

wf2_def = json.dumps({
    "nodes": [
        {"id": "start_1", "type": "startNode", "position": {"x": 100, "y": 300}, "data": {"label": "开始"}},
        {"id": "node_1", "type": "promptNode", "position": {"x": 300, "y": 300}, "data": {"label": "内容撰写", "promptId": "p10000000002", "promptVersion": 1, "variables": {"topic": "{{workflow.input.topic}}"}, "outputKey": "content"}},
        {"id": "node_2", "type": "dataTransformNode", "position": {"x": 550, "y": 300}, "data": {"label": "多渠道适配", "inputMapping": {"content": "{{content}}"}, "transform": "formatForChannels", "outputKey": "adapted_content"}},
        {"id": "end_1", "type": "endNode", "position": {"x": 800, "y": 300}, "data": {"label": "结束"}}
    ],
    "edges": [
        {"id": "e1", "source": "start_1", "target": "node_1", "type": "default"},
        {"id": "e2", "source": "node_1", "target": "node_2", "type": "default"},
        {"id": "e3", "source": "node_2", "target": "end_1", "type": "default"}
    ]
}, ensure_ascii=False)

workflow_versions = [
    ('wv0000000001', 'w10000000001', 1, wf1_def, '初始版本', 'u10000000001'),
    ('wv0000000002', 'w10000000002', 1, wf2_def, '初始版本', 'u10000000001'),
]
cursor.executemany("""INSERT INTO workflow_versions (id, workflow_id, version, definition, change_log, created_by)
    VALUES (%s, %s, %s, %s, %s, %s)""", workflow_versions)

# Workflow tags
workflow_tags = [
    ('w10000000001', 't10000000001'),
    ('w10000000001', 't10000000006'),
    ('w10000000002', 't10000000001'),
]
cursor.executemany("INSERT INTO workflow_tags (workflow_id, tag_id) VALUES (%s, %s)", workflow_tags)

conn.commit()
print("Seed data inserted successfully!")

# Verify
cursor.execute("SELECT COUNT(*) FROM users")
print(f"Users: {cursor.fetchone()[0]}")
cursor.execute("SELECT COUNT(*) FROM roles")
print(f"Roles: {cursor.fetchone()[0]}")
cursor.execute("SELECT COUNT(*) FROM categories")
print(f"Categories: {cursor.fetchone()[0]}")
cursor.execute("SELECT COUNT(*) FROM prompts")
print(f"Prompts: {cursor.fetchone()[0]}")
cursor.execute("SELECT COUNT(*) FROM workflows")
print(f"Workflows: {cursor.fetchone()[0]}")
cursor.execute("SELECT COUNT(*) FROM role_templates")
print(f"Role Templates: {cursor.fetchone()[0]}")

cursor.close()
conn.close()
