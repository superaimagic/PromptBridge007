import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Tag, Space, Card, Modal, message } from 'antd';
import { PlusOutlined, PlayCircleOutlined, PauseCircleOutlined, EyeOutlined } from '@ant-design/icons';
import { abtestAPI } from '@/services/abtest';
import type { ABTest } from '@/types/abtest';
import dayjs from 'dayjs';

const statusMap: Record<string, { color: string; label: string }> = {
  draft: { color: 'default', label: '草稿' },
  running: { color: 'blue', label: '运行中' },
  completed: { color: 'green', label: '已完成' },
  stopped: { color: 'red', label: '已停止' },
};

const mockData: ABTest[] = [
  { id: '1', name: '翻译助手优化', description: '对比v2和v3版本翻译效果', target_id: 'p1', target_type: 'prompt', variants: [{ id: 'v1', prompt_version: 2, label: 'A组' }, { id: 'v2', prompt_version: 3, label: 'B组' }], traffic_split: { v1: 50, v2: 50 }, split_strategy: 'random', primary_metric: 'user_rating', min_sample_size: 200, status: 'running', started_at: '2026-05-15T08:00:00Z', ended_at: '', winner: '', created_at: '2026-05-14T10:00:00Z' },
  { id: '2', name: '代码审查效果', description: '测试新的代码审查提示词', target_id: 'p2', target_type: 'prompt', variants: [{ id: 'v3', prompt_version: 1, label: 'A组' }, { id: 'v4', prompt_version: 2, label: 'B组' }], traffic_split: { v3: 70, v3: 30 }, split_strategy: 'random', primary_metric: 'adoption_rate', min_sample_size: 500, status: 'completed', started_at: '2026-05-10T08:00:00Z', ended_at: '2026-05-17T08:00:00Z', winner: 'v4', created_at: '2026-05-09T10:00:00Z' },
  { id: '3', name: '数据提取准确率', description: '对比不同提取策略', target_id: 'p3', target_type: 'prompt', variants: [{ id: 'v5', prompt_version: 1, label: 'A组' }, { id: 'v6', prompt_version: 2, label: 'B组' }], traffic_split: { v5: 50, v6: 50 }, split_strategy: 'random', primary_metric: 'accuracy', min_sample_size: 300, status: 'draft', started_at: '', ended_at: '', winner: '', created_at: '2026-05-18T09:00:00Z' },
  { id: '4', name: '邮件撰写风格', description: '正式vs非正式风格', target_id: 'p4', target_type: 'prompt', variants: [{ id: 'v7', prompt_version: 1, label: '正式' }, { id: 'v8', prompt_version: 2, label: '非正式' }], traffic_split: { v7: 50, v8: 50 }, split_strategy: 'random', primary_metric: 'user_rating', min_sample_size: 100, status: 'stopped', started_at: '2026-05-12T08:00:00Z', ended_at: '2026-05-16T08:00:00Z', winner: '', created_at: '2026-05-11T10:00:00Z' },
];

export default function ABTestList() {
  const navigate = useNavigate();
  const [data, setData] = useState<ABTest[]>(mockData);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await abtestAPI.list();
        if (res?.data?.list) setData(res.data.list);
      } catch {
        // use mock
      }
    };
    fetchData();
  }, []);

  const handleStart = async (id: string) => {
    try {
      await abtestAPI.start(id);
      message.success('测试已启动');
      setData(data.map((t) => (t.id === id ? { ...t, status: 'running' } : t)));
    } catch {
      message.error('启动失败');
    }
  };

  const handleStop = async (id: string) => {
    Modal.confirm({
      title: '确认停止',
      content: '停止后正在进行的测试将被中断，确定要停止吗？',
      onOk: async () => {
        try {
          await abtestAPI.stop(id);
          message.success('测试已停止');
          setData(data.map((t) => (t.id === id ? { ...t, status: 'stopped' } : t)));
        } catch {
          message.error('停止失败');
        }
      },
    });
  };

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name', render: (text: string, record: ABTest) => <a onClick={() => navigate(`/ab-testing/${record.id}`)}>{text}</a> },
    { title: '目标Prompt', dataIndex: 'target_id', key: 'target_id' },
    { title: '状态', dataIndex: 'status', key: 'status', render: (status: string) => { const s = statusMap[status] || statusMap.draft; return <Tag color={s.color}>{s.label}</Tag>; } },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at', render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm') },
    {
      title: '操作', key: 'action', render: (_: any, record: ABTest) => (
        <Space>
          <Button type="link" icon={<EyeOutlined />} onClick={() => navigate(`/ab-testing/${record.id}`)}>详情</Button>
          {record.status === 'draft' && <Button type="link" icon={<PlayCircleOutlined />} onClick={() => handleStart(record.id)}>启动</Button>}
          {record.status === 'running' && <Button type="link" danger icon={<PauseCircleOutlined />} onClick={() => handleStop(record.id)}>停止</Button>}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>A/B测试</h2>
        <Button type="primary" icon={<PlusOutlined />}>新建测试</Button>
      </div>
      <Card bordered={false} style={{ borderRadius: 8 }}>
        <Table columns={columns} dataSource={data} rowKey="id" loading={loading} />
      </Card>
    </div>
  );
}
