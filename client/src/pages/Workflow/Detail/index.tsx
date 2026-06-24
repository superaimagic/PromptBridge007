import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Descriptions, Button, Space, Tag, Spin, message } from 'antd';
import { EditOutlined, PlayCircleOutlined, SendOutlined } from '@ant-design/icons';
import { useWorkflowStore } from '@/stores/useWorkflowStore';
import { workflowAPI } from '@/services/workflow';

export default function WorkflowDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentWorkflow, loading, fetchWorkflowById } = useWorkflowStore();

  useEffect(() => {
    if (id) fetchWorkflowById(id);
  }, [id, fetchWorkflowById]);

  const handlePublish = async () => {
    if (!id) return;
    try {
      await workflowAPI.publish(id);
      message.success('发布成功');
      fetchWorkflowById(id);
    } catch {
      message.error('发布失败');
    }
  };

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (!currentWorkflow) return <div>工作流不存在</div>;

  const wf = currentWorkflow;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2>{wf.name}</h2>
        <Space>
          <Button icon={<EditOutlined />} onClick={() => navigate(`/workflows/${id}/editor`)}>编辑</Button>
          {wf.is_published !== 1 && (
            <Button type="primary" icon={<SendOutlined />} onClick={handlePublish}>发布</Button>
          )}
          <Button type="primary" icon={<PlayCircleOutlined />}>执行</Button>
        </Space>
      </div>

      <Descriptions bordered column={2}>
        <Descriptions.Item label="描述" span={2}>{wf.description || '-'}</Descriptions.Item>
        <Descriptions.Item label="分类">{wf.category || '-'}</Descriptions.Item>
        <Descriptions.Item label="状态">
          {wf.is_published === 1 ? <Tag color="green">已发布</Tag> : <Tag color="default">未发布</Tag>}
        </Descriptions.Item>
        <Descriptions.Item label="当前版本">v{wf.current_version}</Descriptions.Item>
        <Descriptions.Item label="执行次数">{wf.execution_count ?? 0}</Descriptions.Item>
        <Descriptions.Item label="平均耗时">{wf.avg_duration_ms ? `${(wf.avg_duration_ms / 1000).toFixed(1)}s` : '-'}</Descriptions.Item>
        <Descriptions.Item label="标签">
          {wf.tags?.map((t) => <Tag key={t.id} color={t.color}>{t.name}</Tag>) ?? '-'}
        </Descriptions.Item>
        <Descriptions.Item label="创建时间">{wf.created_at ? new Date(wf.created_at).toLocaleString() : '-'}</Descriptions.Item>
        <Descriptions.Item label="更新时间">{wf.updated_at ? new Date(wf.updated_at).toLocaleString() : '-'}</Descriptions.Item>
      </Descriptions>

      <div style={{ marginTop: 24 }}>
        <h4 style={{ marginBottom: 12 }}>工作流结构</h4>
        <div style={{ background: '#f5f5f5', padding: 24, borderRadius: 8, textAlign: 'center', color: '#8c8c8c' }}>
          请在编辑器中查看工作流结构
          <br />
          <Button type="link" onClick={() => navigate(`/workflows/${id}/editor`)}>打开编辑器</Button>
        </div>
      </div>
    </div>
  );
}
