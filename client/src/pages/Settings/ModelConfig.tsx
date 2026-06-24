import { useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, Tag, Space, message, Popconfirm } from 'antd';
import { PlusOutlined, ApiOutlined, DeleteOutlined, CheckCircleOutlined } from '@ant-design/icons';

interface Provider {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  status: 'active' | 'inactive';
}

const mockProviders: Provider[] = [
  { id: '1', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-****abcd', status: 'active' },
  { id: '2', name: 'Anthropic', baseUrl: 'https://api.anthropic.com/v1', apiKey: 'sk-ant-****efgh', status: 'active' },
  { id: '3', name: 'Azure OpenAI', baseUrl: 'https://myresource.openai.azure.com/openai', apiKey: '****ijkl', status: 'inactive' },
];

export default function ModelConfig() {
  const [providers, setProviders] = useState<Provider[]>(mockProviders);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [form] = Form.useForm();
  const [testLoading, setTestLoading] = useState<string | null>(null);

  const handleAdd = () => {
    setEditingProvider(null);
    form.resetFields();
    setModalOpen(true);
  };

  const handleEdit = (record: Provider) => {
    setEditingProvider(record);
    form.setFieldsValue({ name: record.name, baseUrl: record.baseUrl, apiKey: record.apiKey });
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editingProvider) {
        setProviders(providers.map((p) => (p.id === editingProvider.id ? { ...p, ...values } : p)));
        message.success('Provider更新成功');
      } else {
        const newProvider: Provider = { id: Date.now().toString(), ...values, status: 'active' };
        setProviders([...providers, newProvider]);
        message.success('Provider添加成功');
      }
      setModalOpen(false);
      form.resetFields();
    } catch {
      // validation error
    }
  };

  const handleDelete = (id: string) => {
    setProviders(providers.filter((p) => p.id !== id));
    message.success('Provider已删除');
  };

  const handleTest = async (id: string) => {
    setTestLoading(id);
    // Simulate connection test
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setTestLoading(null);
    message.success('连接测试成功');
  };

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name', render: (text: string) => <span style={{ fontWeight: 500 }}>{text}</span> },
    { title: 'Base URL', dataIndex: 'baseUrl', key: 'baseUrl', render: (text: string) => <code style={{ fontSize: 12 }}>{text}</code> },
    { title: 'API Key', dataIndex: 'apiKey', key: 'apiKey', render: (text: string) => <code style={{ fontSize: 12 }}>{text}</code> },
    {
      title: '状态', dataIndex: 'status', key: 'status',
      render: (status: string) => <Tag color={status === 'active' ? 'green' : 'default'}>{status === 'active' ? '已启用' : '未启用'}</Tag>,
    },
    {
      title: '操作', key: 'action',
      render: (_: any, record: Provider) => (
        <Space>
          <Button type="link" size="small" onClick={() => handleEdit(record)}>编辑</Button>
          <Button type="link" size="small" icon={<CheckCircleOutlined />} loading={testLoading === record.id} onClick={() => handleTest(record.id)}>测试</Button>
          <Popconfirm title="确定删除此Provider吗？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 900 }}>
      <Card title="API Provider 管理" bordered={false} style={{ borderRadius: 8 }} extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>添加 Provider</Button>
      }>
        <Table columns={columns} dataSource={providers} rowKey="id" pagination={false} />
      </Card>

      <Modal
        title={editingProvider ? '编辑 Provider' : '添加 Provider'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        okText="保存"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入Provider名称' }]}>
            <Input placeholder="例如: OpenAI, Anthropic" />
          </Form.Item>
          <Form.Item name="baseUrl" label="Base URL" rules={[{ required: true, message: '请输入Base URL' }]}>
            <Input placeholder="https://api.openai.com/v1" />
          </Form.Item>
          <Form.Item name="apiKey" label="API Key" rules={[{ required: true, message: '请输入API Key' }]}>
            <Input.Password placeholder="请输入API Key" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
