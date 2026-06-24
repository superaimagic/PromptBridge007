import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Descriptions, Tabs, Table, Button, Tag, Space, Popconfirm, message, Spin } from 'antd';
import { EditOutlined, PlayCircleOutlined, UndoOutlined } from '@ant-design/icons';
import { usePromptStore } from '@/stores/usePromptStore';
import { promptAPI } from '@/services/prompt';
import type { PromptVersion } from '@/types/prompt';
import type { ColumnsType } from 'antd/es/table';

const visibilityMap: Record<string, { label: string; color: string }> = {
  private: { label: '私有', color: 'default' },
  workspace: { label: '工作区', color: 'blue' },
  public: { label: '公开', color: 'green' },
};

export default function PromptDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentPrompt, loading, fetchPromptById } = usePromptStore();
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);

  useEffect(() => {
    if (id) fetchPromptById(id);
  }, [id, fetchPromptById]);

  const handleRestore = async (version: number) => {
    if (!id) return;
    try {
      await promptAPI.restoreVersion(id, version);
      message.success('版本已恢复');
      fetchPromptById(id);
      loadVersions();
    } catch {
      message.error('恢复失败');
    }
  };

  const loadVersions = async () => {
    if (!id) return;
    setVersionsLoading(true);
    try {
      const res = await promptAPI.getVersions(id);
      setVersions(res.data);
    } catch {
      // ignore
    } finally {
      setVersionsLoading(false);
    }
  };

  const versionColumns: ColumnsType<PromptVersion> = [
    { title: '版本', dataIndex: 'version', key: 'version', width: 80 },
    { title: '标签', dataIndex: 'version_tag', key: 'version_tag', width: 120 },
    { title: '变更类型', dataIndex: 'change_type', key: 'change_type', width: 100 },
    { title: '变更说明', dataIndex: 'change_log', key: 'change_log', ellipsis: true },
    { title: '执行次数', dataIndex: 'execution_count', key: 'execution_count', width: 100, align: 'center' },
    { title: '评分', dataIndex: 'avg_score', key: 'avg_score', width: 80, align: 'center', render: (v: number) => v?.toFixed(1) ?? '-' },
    {
      title: '状态',
      key: 'status',
      width: 120,
      render: (_, record) => (
        <Space>
          {record.is_current === 1 && <Tag color="blue">当前</Tag>}
          {record.is_stable === 1 && <Tag color="green">稳定</Tag>}
        </Space>
      ),
    },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at', width: 180, render: (v: string) => v ? new Date(v).toLocaleString() : '-' },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        record.is_current !== 1 ? (
          <Popconfirm title="确定恢复此版本？" onConfirm={() => handleRestore(record.version)}>
            <Button type="link" icon={<UndoOutlined />} size="small">恢复</Button>
          </Popconfirm>
        ) : null
      ),
    },
  ];

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (!currentPrompt) return <div>Prompt不存在</div>;

  const prompt = currentPrompt;

  const tabItems = [
    {
      key: 'content',
      label: '内容',
      children: (
        <div style={{ whiteSpace: 'pre-wrap', background: '#f5f5f5', padding: 16, borderRadius: 8 }}>
          {prompt.content}
        </div>
      ),
    },
    {
      key: 'versions',
      label: '版本历史',
      children: (
        <Table<PromptVersion>
          rowKey="id"
          columns={versionColumns}
          dataSource={versions}
          loading={versionsLoading}
          pagination={false}
        />
      ),
    },
    {
      key: 'metrics',
      label: '指标',
      children: (
        <Descriptions bordered column={3}>
          <Descriptions.Item label="平均评分">{prompt.metrics?.avg_score?.toFixed(1) ?? '-'}</Descriptions.Item>
          <Descriptions.Item label="使用次数">{prompt.metrics?.usage_count ?? 0}</Descriptions.Item>
          <Descriptions.Item label="采纳率">{prompt.metrics ? `${(prompt.metrics.adopt_rate * 100).toFixed(1)}%` : '-'}</Descriptions.Item>
        </Descriptions>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2>{prompt.title}</h2>
        <Space>
          <Button icon={<EditOutlined />} onClick={() => navigate(`/prompts/${id}/edit`)}>编辑</Button>
          <Button type="primary" icon={<PlayCircleOutlined />}>执行</Button>
        </Space>
      </div>

      <Descriptions bordered column={3} style={{ marginBottom: 24 }}>
        <Descriptions.Item label="描述" span={3}>{prompt.description || '-'}</Descriptions.Item>
        <Descriptions.Item label="分类">{prompt.category?.name ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="可见性">
          {visibilityMap[prompt.visibility] ? <Tag color={visibilityMap[prompt.visibility].color}>{visibilityMap[prompt.visibility].label}</Tag> : prompt.visibility}
        </Descriptions.Item>
        <Descriptions.Item label="当前版本">v{prompt.current_version}</Descriptions.Item>
        <Descriptions.Item label="标签" span={2}>
          {prompt.tags?.map((t) => <Tag key={t.id} color={t.color}>{t.name}</Tag>) ?? '-'}
        </Descriptions.Item>
        <Descriptions.Item label="模型">{prompt.model_config?.model ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="Provider">{prompt.model_config?.provider ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="Temperature">{prompt.model_config?.temperature ?? '-'}</Descriptions.Item>
      </Descriptions>

      {prompt.variables?.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h4>变量</h4>
          <Table
            rowKey="name"
            size="small"
            pagination={false}
            dataSource={prompt.variables}
            columns={[
              { title: '名称', dataIndex: 'name' },
              { title: '类型', dataIndex: 'type' },
              { title: '必填', dataIndex: 'required', render: (v: boolean) => v ? '是' : '否' },
              { title: '默认值', dataIndex: 'default' },
              { title: '描述', dataIndex: 'description' },
            ]}
          />
        </div>
      )}

      <Tabs items={tabItems} onChange={(key) => key === 'versions' && loadVersions()} />
    </div>
  );
}
