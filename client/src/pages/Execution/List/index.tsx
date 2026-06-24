import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Tag, Select, Button, Space } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { executionAPI } from '@/services/execution';
import type { Execution } from '@/types/execution';
import type { ColumnsType } from 'antd/es/table';

const statusConfig: Record<string, { color: string; label: string }> = {
  pending: { color: 'default', label: '等待中' },
  running: { color: 'processing', label: '运行中' },
  completed: { color: 'success', label: '已完成' },
  failed: { color: 'error', label: '失败' },
  paused: { color: 'warning', label: '已暂停' },
  cancelled: { color: 'default', label: '已取消' },
};

const triggerTypeMap: Record<string, string> = {
  manual: '手动',
  api: 'API',
  schedule: '定时',
  webhook: 'Webhook',
};

export default function ExecutionList() {
  const navigate = useNavigate();
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [status, setStatus] = useState<string | undefined>();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await executionAPI.list({ page, pageSize, status });
      const data = res.data;
      setExecutions(data.list);
      setTotal(data.total);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, status]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const columns: ColumnsType<Execution> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      ellipsis: true,
      render: (id: string) => <a onClick={() => navigate(`/executions/${id}`)}>{id.slice(0, 8)}</a>,
    },
    {
      title: '工作流',
      dataIndex: 'workflow_id',
      key: 'workflow_id',
      width: 150,
      ellipsis: true,
    },
    {
      title: '触发类型',
      dataIndex: 'trigger_type',
      key: 'trigger_type',
      width: 100,
      render: (v: string) => triggerTypeMap[v] ?? v,
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
      dataIndex: 'total_duration_ms',
      key: 'total_duration_ms',
      width: 100,
      render: (v: number) => v != null ? `${(v / 1000).toFixed(1)}s` : '-',
    },
    {
      title: 'Token消耗',
      dataIndex: 'token_consumed',
      key: 'token_consumed',
      width: 120,
      render: (v: number) => v ?? '-',
    },
    {
      title: '成本',
      dataIndex: 'cost_usd',
      key: 'cost_usd',
      width: 100,
      render: (v: number) => v != null ? `$${v.toFixed(4)}` : '-',
    },
    {
      title: '操作',
      key: 'actions',
      width: 80,
      render: (_, record) => (
        <Button type="link" icon={<EyeOutlined />} onClick={() => navigate(`/executions/${record.id}`)} />
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Space>
          <Select
            placeholder="状态筛选"
            allowClear
            style={{ width: 140 }}
            value={status}
            onChange={setStatus}
            options={Object.entries(statusConfig).map(([k, v]) => ({ label: v.label, value: k }))}
          />
        </Space>
      </div>

      <Table<Execution>
        rowKey="id"
        columns={columns}
        dataSource={executions}
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
        }}
      />
    </div>
  );
}
