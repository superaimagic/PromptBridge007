import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Tag, Button, Row, Col, Progress, Space, Spin, Modal, message } from 'antd';
import { ArrowLeftOutlined, PlayCircleOutlined, PauseCircleOutlined, TrophyOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { abtestAPI } from '@/services/abtest';
import type { ABTest, ABTestResult } from '@/types/abtest';
import dayjs from 'dayjs';

const statusMap: Record<string, { color: string; label: string }> = {
  draft: { color: 'default', label: '草稿' },
  running: { color: 'blue', label: '运行中' },
  completed: { color: 'green', label: '已完成' },
  stopped: { color: 'red', label: '已停止' },
};

const mockTest: ABTest = {
  id: '1',
  name: '翻译助手优化',
  description: '对比v2和v3版本翻译效果，评估用户满意度提升',
  target_id: 'p1',
  target_type: 'prompt',
  variants: [
    { id: 'v1', prompt_version: 2, label: 'A组 (v2)' },
    { id: 'v2', prompt_version: 3, label: 'B组 (v3)' },
  ],
  traffic_split: { v1: 50, v2: 50 },
  split_strategy: 'random',
  primary_metric: 'user_rating',
  min_sample_size: 200,
  status: 'running',
  started_at: '2026-05-15T08:00:00Z',
  ended_at: '',
  winner: '',
  created_at: '2026-05-14T10:00:00Z',
};

const mockResults: ABTestResult[] = [
  { id: 'r1', test_id: '1', variant_id: 'v1', sample_size: 95, metric_results: { user_rating: { value: 4.2, ci_lower: 3.9, ci_upper: 4.5 }, adoption_rate: { value: 82, ci_lower: 76, ci_upper: 88 } }, p_value: 0.032, is_significant: true },
  { id: 'r2', test_id: '1', variant_id: 'v2', sample_size: 105, metric_results: { user_rating: { value: 4.6, ci_lower: 4.3, ci_upper: 4.9 }, adoption_rate: { value: 91, ci_lower: 85, ci_upper: 97 } }, p_value: 0.032, is_significant: true },
];

export default function ABTestDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [test, setTest] = useState<ABTest>(mockTest);
  const [results, setResults] = useState<ABTestResult[]>(mockResults);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [testRes, resultsRes] = await Promise.all([
          abtestAPI.getById(id!),
          abtestAPI.getResults(id!),
        ]);
        if (testRes?.data) setTest(testRes.data);
        if (resultsRes?.data) setResults(resultsRes.data);
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

  const totalSample = results.reduce((sum, r) => sum + r.sample_size, 0);
  const sampleProgress = Math.min(100, Math.round((totalSample / test.min_sample_size) * 100));

  const handleStart = async () => {
    try {
      await abtestAPI.start(id!);
      setTest({ ...test, status: 'running' });
      message.success('测试已启动');
    } catch {
      message.error('启动失败');
    }
  };

  const handleStop = async () => {
    Modal.confirm({
      title: '确认停止',
      content: '确定要停止此测试吗？',
      onOk: async () => {
        try {
          await abtestAPI.stop(id!);
          setTest({ ...test, status: 'stopped' });
          message.success('测试已停止');
        } catch {
          message.error('停止失败');
        }
      },
    });
  };

  const handlePromote = async () => {
    const winnerVariant = test.variants.find((v) => v.id === test.winner) || test.variants[1];
    Modal.confirm({
      title: '推广胜出方案',
      content: `确定要将 ${winnerVariant.label} (版本 ${winnerVariant.prompt_version}) 推广为正式版本吗？`,
      onOk: async () => {
        try {
          await abtestAPI.promote(id!);
          message.success('推广成功');
        } catch {
          message.error('推广失败');
        }
      },
    });
  };

  const comparisonOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: test.variants.map((v) => v.label) },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: ['用户评分', '采纳率 (%)'] },
    yAxis: { type: 'value' },
    series: test.variants.map((v, i) => {
      const result = results.find((r) => r.variant_id === v.id);
      const values = result
        ? [result.metric_results.user_rating?.value || 0, result.metric_results.adoption_rate?.value || 0]
        : [0, 0];
      return {
        name: v.label,
        type: 'bar',
        data: values,
        itemStyle: { color: i === 0 ? '#1677ff' : '#52c41a' },
        barWidth: '30%',
      };
    }),
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/ab-testing')}>返回</Button>
        <h2 style={{ margin: 0 }}>{test.name}</h2>
        <Tag color={statusMap[test.status]?.color}>{statusMap[test.status]?.label}</Tag>
      </div>

      <Card title="测试配置" bordered={false} style={{ borderRadius: 8, marginBottom: 24 }} extra={
        <Space>
          {test.status === 'draft' && <Button type="primary" icon={<PlayCircleOutlined />} onClick={handleStart}>启动测试</Button>}
          {test.status === 'running' && <Button danger icon={<PauseCircleOutlined />} onClick={handleStop}>停止测试</Button>}
          {(test.status === 'completed' || test.winner) && <Button type="primary" icon={<TrophyOutlined />} onClick={handlePromote}>推广胜出方案</Button>}
        </Space>
      }>
        <Descriptions column={3}>
          <Descriptions.Item label="描述">{test.description}</Descriptions.Item>
          <Descriptions.Item label="目标类型">{test.target_type}</Descriptions.Item>
          <Descriptions.Item label="目标ID">{test.target_id}</Descriptions.Item>
          <Descriptions.Item label="流量分配策略">{test.split_strategy === 'random' ? '随机分配' : test.split_strategy}</Descriptions.Item>
          <Descriptions.Item label="主要指标">{test.primary_metric}</Descriptions.Item>
          <Descriptions.Item label="最小样本量">{test.min_sample_size}</Descriptions.Item>
          <Descriptions.Item label="开始时间">{test.started_at ? dayjs(test.started_at).format('YYYY-MM-DD HH:mm') : '-'}</Descriptions.Item>
          <Descriptions.Item label="结束时间">{test.ended_at ? dayjs(test.ended_at).format('YYYY-MM-DD HH:mm') : '-'}</Descriptions.Item>
          <Descriptions.Item label="胜出方案">{test.winner || '-'}</Descriptions.Item>
        </Descriptions>
        <div style={{ marginTop: 16 }}>
          <span style={{ marginRight: 12 }}>样本量进度:</span>
          <Progress percent={sampleProgress} style={{ maxWidth: 400, display: 'inline-block' }} status={sampleProgress >= 100 ? 'success' : 'active'} />
          <span style={{ marginLeft: 12, color: '#8c8c8c' }}>{totalSample} / {test.min_sample_size}</span>
        </div>
      </Card>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
          <Card title="变体对比" bordered={false} style={{ borderRadius: 8 }}>
            <Row gutter={24}>
              {test.variants.map((v, i) => {
                const result = results.find((r) => r.variant_id === v.id);
                return (
                  <Col span={12} key={v.id}>
                    <Card size="small" title={v.label} style={{ textAlign: 'center', border: i === 1 && test.winner === v.id ? '2px solid #52c41a' : undefined, borderRadius: 8 }}>
                      <Descriptions column={1} size="small">
                        <Descriptions.Item label="Prompt版本">v{v.prompt_version}</Descriptions.Item>
                        <Descriptions.Item label="流量占比">{test.traffic_split[v.id] || 50}%</Descriptions.Item>
                        <Descriptions.Item label="样本量">{result?.sample_size || 0}</Descriptions.Item>
                        <Descriptions.Item label="用户评分">{result?.metric_results.user_rating?.value.toFixed(1) || '-'}</Descriptions.Item>
                        <Descriptions.Item label="采纳率">{result?.metric_results.adoption_rate ? `${result.metric_results.adoption_rate.value}%` : '-'}</Descriptions.Item>
                        <Descriptions.Item label="统计显著">{result?.is_significant ? <Tag color="green">是</Tag> : <Tag>否</Tag>}</Descriptions.Item>
                        <Descriptions.Item label="P值">{result?.p_value ? result.p_value.toFixed(4) : '-'}</Descriptions.Item>
                      </Descriptions>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="指标对比图" bordered={false} style={{ borderRadius: 8 }}>
            <ReactECharts option={comparisonOption} style={{ height: 300 }} />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
