import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Descriptions, Steps, Table, Tag, Button, Space, Card, Spin, message } from 'antd';
import { ArrowLeftOutlined, RedoOutlined, StopOutlined } from '@ant-design/icons';
import { executionAPI } from '@/services/execution';
import type { Execution, NodeExecution } from '@/types/execution';
import type { ColumnsType } from 'antd/es/table';

const statusConfig: Record<string, { color: string; label: string }> = {
  pending: { color: 'default', label: '等待中' },
  running: { color: 'processing', label: '运行中' },
  completed: { color: 'success', label: '已完成' },
  failed: { color: 'error', label: '失败' },
  paused: { color: 'warning', label: '已暂停' },
  cancelled: { color: 'default', label: '已取消' },
};

const nodeTypeMap: Record<string, string> = {
  startNode: '开始',
  endNode: '结束',
  promptNode: 'Prompt',
  aiNode: 'AI处理',
  humanReviewNode: '人工审核',
  dataTransformNode: '数据流转',
  conditionNode: '条件分支',
  loopNode: '循环',
  httpRequestNode: 'HTTP请求',
  codeNode: '代码执行',
};

export default function ExecutionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [execution, setExecution] = useState<Execution | null>(null);
  const [nodeExecutions, setNodeExecutions] = useState<NodeExecution[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState<string[]>([]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      executionAPI.getById(id),
      executionAPI.getNodeExecutions(id),
    ])
      .then(([execRes, nodeRes]) => {
        setExecution(execRes.data);
        setNodeExecutions(nodeRes.data);
      })
      .catch(() => {
        // ignore
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleCancel = async () => {
    if (!id) return;
    try {
      await executionAPI.cancel(id);
      message.success('已取消');
      const res = await executionAPI.getById(id);
      setExecution(res.data);
    } catch {
      message.error('取消失败');
    }
  };

  const handleRetry = async () => {
    if (!id) return;
    try {
      await executionAPI.retry(id);
      message.success('已重试');
      const res = await executionAPI.getById(id);
      setExecution(res.data);
    } catch {
      message.error('重试失败');
    }
  };

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (!execution) return <div>执行记录不存在</div>;

  const nodeColumns: ColumnsType<NodeExecution> = [
    {
      title: '节点',
      dataIndex: 'node_type',
      key: 'node_type',
      width: 120,
      render: (v: string) => nodeTypeMap[v] ?? v,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (v: string) => {
        const cfg = statusConfig[v];
        return cfg ? <Tag color={cfg.color}>{cfg.label}</Tag> : v;
      },
    },
    {
      title: '开始时间',
      dataIndex: 'started_at',
      key: 'started_at',
      width: 180,
      render: (v: string) => v ? new Date(v).toLocaleString() : '-',
    },
    {
      title: '耗时',
      dataIndex: 'duration_ms',
      key: 'duration_ms',
      width: 100,
      render: (v: number) => v != null ? `${(v / 1000).toFixed(2)}s` : '-',
    },
    {
      title: '模型',
      dataIndex: 'model_id',
      key: 'model_id',
      width: 120,
      render: (v: string) => v || '-',
    },
    {
      title: 'Token',
      key: 'tokens',
      width: 120,
      render: (_, record) => {
        const total = (record.input_tokens ?? 0) + (record.output_tokens ?? 0);
        return total > 0 ? `${record.input_tokens}/${record.output_tokens}` : '-';
      },
    },
    {
      title: '成本',
      dataIndex: 'cost_usd',
      key: 'cost_usd',
      width: 100,
      render: (v: number) => v != null ? `$${v.toFixed(4)}` : '-',
    },
  ];

  // Build steps for timeline
  const steps = nodeExecutions.map((ne) => ({
    title: nodeTypeMap[ne.node_type] ?? ne.node_type,
    status: ne.status === 'completed' ? 'finish' : ne.status === 'running' ? 'process' : ne.status === 'failed' ? 'error' : 'wait',
    description: ne.duration_ms != null ? `${(ne.duration_ms / 1000).toFixed(2)}s` : undefined,
  }));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/executions')}>返回</Button>
          <h2 style={{ margin: 0 }}>执行详情</h2>
        </Space>
        <Space>
          {execution.status === 'running' && (
            <Button danger icon={<StopOutlined />} onClick={handleCancel}>取消</Button>
          )}
          {(execution.status === 'failed' || execution.status === 'cancelled') && (
            <Button icon={<RedoOutlined />} onClick={handleRetry}>重试</Button>
          )}
        </Space>
      </div>

      <Descriptions bordered column={3} style={{ marginBottom: 24 }}>
        <Descriptions.Item label="执行ID">{execution.id}</Descriptions.Item>
        <Descriptions.Item label="工作流ID">{execution.workflow_id}</Descriptions.Item>
        <Descriptions.Item label="状态">
          {(() => {
            const cfg = statusConfig[execution.status];
            return cfg ? <Tag color={cfg.color}>{cfg.label}</Tag> : execution.status;
          })()}
        </Descriptions.Item>
        <Descriptions.Item label="触发类型">{execution.trigger_type}</Descriptions.Item>
        <Descriptions.Item label="触发者">{execution.triggered_by || '-'}</Descriptions.Item>
        <Descriptions.Item label="版本">v{execution.workflow_version}</Descriptions.Item>
        <Descriptions.Item label="开始时间">{execution.started_at ? new Date(execution.started_at).toLocaleString() : '-'}</Descriptions.Item>
        <Descriptions.Item label="结束时间">{execution.finished_at ? new Date(execution.finished_at).toLocaleString() : '-'}</Descriptions.Item>
        <Descriptions.Item label="耗时">{execution.total_duration_ms ? `${(execution.total_duration_ms / 1000).toFixed(2)}s` : '-'}</Descriptions.Item>
        <Descriptions.Item label="Token消耗">{execution.token_consumed ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="成本">{execution.cost_usd != null ? `$${execution.cost_usd.toFixed(4)}` : '-'}</Descriptions.Item>
        <Descriptions.Item label="节点数">{execution.node_count ?? '-'}</Descriptions.Item>
      </Descriptions>

      {execution.error_message && (
        <Card size="small" style={{ marginBottom: 24, borderColor: '#ff4d4f' }}>
          <div style={{ color: '#ff4d4f', fontWeight: 600, marginBottom: 4 }}>错误信息</div>
          <div style={{ whiteSpace: 'pre-wrap' }}>{execution.error_message}</div>
        </Card>
      )}

      {/* Timeline */}
      {steps.length > 0 && (
        <Card title="执行时间线" style={{ marginBottom: 24 }}>
          <Steps current={steps.findIndex((s) => s.status === 'process') || steps.length} items={steps} size="small" />
        </Card>
      )}

      {/* Node executions table */}
      <Card title="节点执行详情">
        <Table<NodeExecution>
          rowKey="id"
          columns={nodeColumns}
          dataSource={nodeExecutions}
          pagination={false}
          expandable={{
            expandedRowKeys: expandedRows,
            onExpandedRowsChange: (keys) => setExpandedRows(keys as string[]),
            expandedRowRender: (record) => (
              <div style={{ display: 'flex', gap: 24 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>输入</div>
                  <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, fontSize: 12, maxHeight: 200, overflow: 'auto' }}>
                    {record.input_data ? JSON.stringify(record.input_data, null, 2) : '-'}
                  </pre>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>输出</div>
                  <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, fontSize: 12, maxHeight: 200, overflow: 'auto' }}>
                    {record.output_data ? JSON.stringify(record.output_data, null, 2) : '-'}
                  </pre>
                </div>
              </div>
            ),
          }}
        />
      </Card>
    </div>
  );
}
