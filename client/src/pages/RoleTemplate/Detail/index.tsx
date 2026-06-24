import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Table, Tag, Button, Spin, Modal, Form, Input, message } from 'antd';
import { ArrowLeftOutlined, ThunderboltOutlined, AppstoreOutlined } from '@ant-design/icons';
import { roleTemplateAPI } from '@/services/roleTemplate';
import type { RoleTemplate } from '@/types/roleTemplate';
import dayjs from 'dayjs';

const mockTemplate: RoleTemplate = {
  id: '1',
  name: 'code-reviewer',
  display_name: '代码审查员',
  description: '自动审查代码质量、安全性和最佳实践，提供改进建议。支持多种编程语言，可自定义审查规则和标准。',
  icon: 'code',
  workflow_ids: ['w1', 'w2'],
  prompt_ids: ['p1', 'p2'],
  metrics_config: { success_rate: { threshold: 0.9, weight: 0.4 }, user_rating: { threshold: 4.0, weight: 0.3 }, adoption_rate: { threshold: 0.8, weight: 0.3 } },
  is_builtin: 1,
  sort_order: 1,
  created_at: '2026-01-01T00:00:00Z',
};

const mockWorkflows = [
  { id: 'w1', name: '代码审查流水线', status: 'active', description: '自动化代码审查流程' },
  { id: 'w2', name: '安全检查流水线', status: 'active', description: '代码安全漏洞检查' },
];

const mockPrompts = [
  { id: 'p1', name: '代码质量检查', version: 3, type: 'system' },
  { id: 'p2', name: '安全漏洞检测', version: 2, type: 'system' },
];

export default function RoleTemplateDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [template, setTemplate] = useState<RoleTemplate>(mockTemplate);
  const [loading, setLoading] = useState(true);
  const [instantiateOpen, setInstantiateOpen] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await roleTemplateAPI.getById(id!);
        if (res?.data) setTemplate(res.data);
      } catch {
        // use mock
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div>;
  }

  const handleInstantiate = async () => {
    try {
      const values = await form.validateFields();
      await roleTemplateAPI.instantiate(id!, values);
      message.success('实例化成功');
      setInstantiateOpen(false);
      form.resetFields();
    } catch {
      message.error('实例化失败');
    }
  };

  const workflowColumns = [
    { title: 'ID', dataIndex: 'id', key: 'id' },
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '状态', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={s === 'active' ? 'green' : 'default'}>{s === 'active' ? '活跃' : s}</Tag> },
    { title: '描述', dataIndex: 'description', key: 'description' },
  ];

  const promptColumns = [
    { title: 'ID', dataIndex: 'id', key: 'id' },
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '版本', dataIndex: 'version', key: 'version', render: (v: number) => `v${v}` },
    { title: '类型', dataIndex: 'type', key: 'type', render: (t: string) => <Tag>{t}</Tag> },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/templates')}>返回</Button>
        <h2 style={{ margin: 0 }}>{template.display_name}</h2>
        {template.is_builtin ? <Tag color="blue">内置模板</Tag> : <Tag>自定义</Tag>}
      </div>

      <Card title="基本信息" bordered={false} style={{ borderRadius: 8, marginBottom: 24 }} extra={
        <Button type="primary" icon={<ThunderboltOutlined />} onClick={() => setInstantiateOpen(true)}>从模板创建</Button>
      }>
        <Descriptions column={2}>
          <Descriptions.Item label="模板名称">{template.name}</Descriptions.Item>
          <Descriptions.Item label="显示名称">{template.display_name}</Descriptions.Item>
          <Descriptions.Item label="描述" span={2}>{template.description}</Descriptions.Item>
          <Descriptions.Item label="创建时间">{dayjs(template.created_at).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
          <Descriptions.Item label="排序">{template.sort_order}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title={`关联工作流 (${template.workflow_ids.length})`} bordered={false} style={{ borderRadius: 8, marginBottom: 24 }}>
        <Table columns={workflowColumns} dataSource={mockWorkflows} rowKey="id" pagination={false} size="small" />
      </Card>

      <Card title={`关联Prompt (${template.prompt_ids.length})`} bordered={false} style={{ borderRadius: 8, marginBottom: 24 }}>
        <Table columns={promptColumns} dataSource={mockPrompts} rowKey="id" pagination={false} size="small" />
      </Card>

      <Card title="追踪指标配置" bordered={false} style={{ borderRadius: 8 }}>
        {template.metrics_config && Object.keys(template.metrics_config).length > 0 ? (
          <Table
            columns={[
              { title: '指标', dataIndex: 'metric', key: 'metric' },
              { title: '阈值', dataIndex: 'threshold', key: 'threshold', render: (v: number) => typeof v === 'number' && v < 1 ? `${(v * 100).toFixed(0)}%` : v },
              { title: '权重', dataIndex: 'weight', key: 'weight', render: (v: number) => `${(v * 100).toFixed(0)}%` },
            ]}
            dataSource={Object.entries(template.metrics_config).map(([key, val]: [string, any]) => ({
              key,
              metric: key,
              threshold: val.threshold,
              weight: val.weight,
            }))}
            pagination={false}
            size="small"
          />
        ) : (
          <div style={{ textAlign: 'center', color: '#8c8c8c', padding: 20 }}>暂无指标配置</div>
        )}
      </Card>

      <Modal
        title="从模板创建工作流"
        open={instantiateOpen}
        onOk={handleInstantiate}
        onCancel={() => { setInstantiateOpen(false); form.resetFields(); }}
        okText="创建"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="工作流名称" rules={[{ required: true, message: '请输入工作流名称' }]}>
            <Input placeholder="请输入工作流名称" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="请输入描述" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
