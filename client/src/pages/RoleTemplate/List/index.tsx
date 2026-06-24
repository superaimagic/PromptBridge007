import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Card, Tag, Button, Empty } from 'antd';
import {
  CodeOutlined,
  TranslationOutlined,
  FileTextOutlined,
  BarChartOutlined,
  MailOutlined,
  CustomerServiceOutlined,
  AppstoreOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { roleTemplateAPI } from '@/services/roleTemplate';
import type { RoleTemplate } from '@/types/roleTemplate';

const iconMap: Record<string, React.ReactNode> = {
  code: <CodeOutlined />,
  translation: <TranslationOutlined />,
  file: <FileTextOutlined />,
  chart: <BarChartOutlined />,
  mail: <MailOutlined />,
  service: <CustomerServiceOutlined />,
  app: <AppstoreOutlined />,
  setting: <SettingOutlined />,
};

const colorMap = ['#1677ff', '#52c41a', '#722ed1', '#fa8c16', '#eb2f96', '#13c2c2', '#f5222d', '#2f54eb'];

const mockData: RoleTemplate[] = [
  { id: '1', name: 'code-reviewer', display_name: '代码审查员', description: '自动审查代码质量、安全性和最佳实践，提供改进建议', icon: 'code', workflow_ids: ['w1', 'w2'], prompt_ids: ['p1', 'p2'], metrics_config: {}, is_builtin: 1, sort_order: 1, created_at: '2026-01-01T00:00:00Z' },
  { id: '2', name: 'translator', display_name: '翻译助手', description: '多语言翻译，支持上下文感知和专业术语翻译', icon: 'translation', workflow_ids: ['w3'], prompt_ids: ['p3', 'p4'], metrics_config: {}, is_builtin: 1, sort_order: 2, created_at: '2026-01-01T00:00:00Z' },
  { id: '3', name: 'data-analyst', display_name: '数据分析师', description: '自动分析数据、生成报告和可视化图表', icon: 'chart', workflow_ids: ['w4', 'w5'], prompt_ids: ['p5'], metrics_config: {}, is_builtin: 1, sort_order: 3, created_at: '2026-01-01T00:00:00Z' },
  { id: '4', name: 'content-writer', display_name: '内容创作', description: '生成文章、博客、营销文案等内容', icon: 'file', workflow_ids: ['w6'], prompt_ids: ['p6', 'p7'], metrics_config: {}, is_builtin: 1, sort_order: 4, created_at: '2026-01-01T00:00:00Z' },
  { id: '5', name: 'email-assistant', display_name: '邮件助手', description: '自动撰写、回复和分类邮件', icon: 'mail', workflow_ids: ['w7'], prompt_ids: ['p8'], metrics_config: {}, is_builtin: 0, sort_order: 5, created_at: '2026-03-15T00:00:00Z' },
  { id: '6', name: 'customer-support', display_name: '客服助手', description: '智能客服对话，自动回复常见问题', icon: 'service', workflow_ids: ['w8', 'w9'], prompt_ids: ['p9', 'p10'], metrics_config: {}, is_builtin: 0, sort_order: 6, created_at: '2026-04-01T00:00:00Z' },
];

export default function RoleTemplateList() {
  const navigate = useNavigate();
  const [data, setData] = useState<RoleTemplate[]>(mockData);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await roleTemplateAPI.list();
        if (res?.data) setData(res.data);
      } catch {
        // use mock
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>岗位模板</h2>
      <Row gutter={[24, 24]}>
        {data.map((template, index) => (
          <Col xs={24} sm={12} lg={8} xl={6} key={template.id}>
            <Card
              hoverable
              bordered={false}
              style={{ borderRadius: 8, height: '100%', borderLeft: template.is_builtin ? `3px solid ${colorMap[index % colorMap.length]}` : undefined }}
              styles={{ body: { padding: 24 } }}
              onClick={() => navigate(`/templates/${template.id}`)}
            >
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <div style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  background: `${colorMap[index % colorMap.length]}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                  fontSize: 28,
                  color: colorMap[index % colorMap.length],
                }}>
                  {iconMap[template.icon] || <AppstoreOutlined />}
                </div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{template.display_name}</div>
                <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>{template.name}</div>
              </div>
              <div style={{ color: '#595959', fontSize: 14, lineHeight: 1.6, marginBottom: 16, minHeight: 44 }}>
                {template.description}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                  {template.workflow_ids.length} 个工作流 · {template.prompt_ids.length} 个Prompt
                </div>
                {template.is_builtin ? <Tag color="blue">内置</Tag> : <Tag>自定义</Tag>}
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
