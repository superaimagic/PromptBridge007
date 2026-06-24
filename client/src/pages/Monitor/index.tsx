import { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Table, Alert as AntAlert, Tag, Spin } from 'antd';
import {
  ThunderboltOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  WarningOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { monitorAPI } from '@/services/monitor';
import type { MonitorOverview, Alert } from '@/types/monitor';

const mockOverview: MonitorOverview = {
  todayExecutions: 1284,
  runningCount: 23,
  successRate: 96.8,
  avgDurationMs: 2340,
  todayCostUsd: 156.32,
  todayTokens: 2840000,
  healthTrend: Array.from({ length: 24 }, (_, i) => ({
    time: `${i.toString().padStart(2, '0')}:00`,
    value: 85 + Math.random() * 15,
  })),
};

const mockAlerts: Alert[] = [
  { id: '1', type: 'workflow', message: '工作流"数据处理流水线"平均耗时超过阈值 (5.2s > 3s)', severity: 'warning', createdAt: '2026-05-18T10:30:00Z' },
  { id: '2', type: 'prompt', message: 'Prompt"翻译助手"成功率降至 82%，低于告警线', severity: 'error', createdAt: '2026-05-18T09:15:00Z' },
  { id: '3', type: 'cost', message: '今日API调用成本已达预算的 78%', severity: 'warning', createdAt: '2026-05-18T08:00:00Z' },
  { id: '4', type: 'system', message: 'Token使用量异常增长，较昨日同期增长 45%', severity: 'warning', createdAt: '2026-05-18T07:30:00Z' },
];

const mockPromptRanking = [
  { key: '1', name: '翻译助手', score: 4.8, usageCount: 562, adoptionRate: 94.2 },
  { key: '2', name: '代码审查', score: 4.6, usageCount: 389, adoptionRate: 89.5 },
  { key: '3', name: '内容生成', score: 4.3, usageCount: 721, adoptionRate: 85.1 },
  { key: '4', name: '数据分析', score: 4.1, usageCount: 245, adoptionRate: 82.3 },
  { key: '5', name: '邮件撰写', score: 3.9, usageCount: 198, adoptionRate: 78.6 },
];

const promptColumns = [
  { title: 'Prompt名称', dataIndex: 'name', key: 'name' },
  { title: '评分', dataIndex: 'score', key: 'score', render: (v: number) => <Tag color={v >= 4.5 ? 'green' : v >= 4.0 ? 'blue' : 'orange'}>{v}</Tag> },
  { title: '使用次数', dataIndex: 'usageCount', key: 'usageCount', sorter: (a: any, b: any) => a.usageCount - b.usageCount },
  { title: '采纳率', dataIndex: 'adoptionRate', key: 'adoptionRate', render: (v: number) => `${v}%` },
];

export default function MonitorPage() {
  const [overview, setOverview] = useState<MonitorOverview>(mockOverview);
  const [alerts, setAlerts] = useState<Alert[]>(mockAlerts);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [overviewRes, alertsRes] = await Promise.all([
          monitorAPI.getOverview(),
          monitorAPI.getAlerts(),
        ]);
        setOverview(overviewRes?.data || mockOverview);
        setAlerts(alertsRes?.data || mockAlerts);
      } catch {
        // use mock data as fallback
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div>;
  }

  const stats = [
    { title: '今日执行数', value: overview.todayExecutions, icon: <ThunderboltOutlined style={{ fontSize: 28, color: '#1677ff' }} />, color: '#1677ff', bgColor: '#e6f4ff' },
    { title: '运行中工作流', value: overview.runningCount, icon: <PlayCircleOutlined style={{ fontSize: 28, color: '#52c41a' }} />, color: '#52c41a', bgColor: '#f6ffed' },
    { title: '成功率', value: overview.successRate, suffix: '%', icon: <CheckCircleOutlined style={{ fontSize: 28, color: '#faad14' }} />, color: '#faad14', bgColor: '#fffbe6' },
    { title: '今日成本', value: overview.todayCostUsd, prefix: '$', icon: <DollarOutlined style={{ fontSize: 28, color: '#ff4d4f' }} />, color: '#ff4d4f', bgColor: '#fff2f0' },
  ];

  const performanceOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['成功率 (%)', '平均耗时 (ms)'] },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'] },
    yAxis: [
      { type: 'value', name: '成功率 (%)', min: 80, max: 100 },
      { type: 'value', name: '耗时 (ms)', min: 1000, max: 5000 },
    ],
    series: [
      { name: '成功率 (%)', type: 'line', smooth: true, data: [95.2, 96.1, 94.8, 97.3, 96.5, 95.9, 96.8], itemStyle: { color: '#1677ff' } },
      { name: '平均耗时 (ms)', type: 'line', smooth: true, yAxisIndex: 1, data: [2800, 2500, 3100, 2200, 2400, 2600, 2340], itemStyle: { color: '#52c41a' } },
    ],
  };

  const costOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['Token消耗 (万)', '成本 ($)', ] },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: ['5/12', '5/13', '5/14', '5/15', '5/16', '5/17', '5/18'] },
    yAxis: [
      { type: 'value', name: 'Token (万)' },
      { type: 'value', name: '成本 ($)' },
    ],
    series: [
      { name: 'Token消耗 (万)', type: 'bar', data: [180, 220, 195, 260, 240, 210, 284], itemStyle: { color: '#1677ff' } },
      { name: '成本 ($)', type: 'bar', data: [98, 120, 106, 142, 130, 115, 156], itemStyle: { color: '#faad14' } },
    ],
  };

  const healthOption = {
    tooltip: { trigger: 'axis', formatter: '{b}<br/>健康度: {c}%' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: overview.healthTrend.map((h) => h.time) },
    yAxis: { type: 'value', min: 70, max: 100, name: '健康度 (%)' },
    series: [{
      type: 'line', smooth: true, data: overview.healthTrend.map((h) => Number(h.value.toFixed(1))),
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(82,196,26,0.3)' }, { offset: 1, color: 'rgba(82,196,26,0.02)' }] } },
      itemStyle: { color: '#52c41a' },
      markLine: { data: [{ yAxis: 90, name: '健康线', lineStyle: { color: '#faad14', type: 'dashed' } }] },
    }],
  };

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>监控看板</h2>
      <Row gutter={[24, 24]}>
        {stats.map((item) => (
          <Col xs={24} sm={12} lg={6} key={item.title}>
            <Card bordered={false} style={{ borderRadius: 8 }} styles={{ body: { padding: 24 } }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ color: '#8c8c8c', fontSize: 14, marginBottom: 8 }}>{item.title}</div>
                  <Statistic value={item.value} suffix={item.suffix} prefix={item.prefix} valueStyle={{ color: item.color, fontSize: 28, fontWeight: 600 }} />
                </div>
                <div style={{ width: 56, height: 56, borderRadius: 12, background: item.bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {item.icon}
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="性能趋势" bordered={false} style={{ borderRadius: 8 }}>
            <ReactECharts option={performanceOption} style={{ height: 300 }} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="成本追踪" bordered={false} style={{ borderRadius: 8 }}>
            <ReactECharts option={costOption} style={{ height: 300 }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="24小时健康度趋势" bordered={false} style={{ borderRadius: 8 }}>
            <ReactECharts option={healthOption} style={{ height: 300 }} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Prompt效果排行" bordered={false} style={{ borderRadius: 8 }}>
            <Table columns={promptColumns} dataSource={mockPromptRanking} pagination={false} size="small" />
          </Card>
        </Col>
      </Row>

      <Row style={{ marginTop: 24 }}>
        <Col span={24}>
          <Card title="告警列表" bordered={false} style={{ borderRadius: 8 }}>
            {alerts.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#8c8c8c', padding: 20 }}>暂无告警</div>
            ) : (
              alerts.map((alert) => (
                <AntAlert
                  key={alert.id}
                  message={alert.message}
                  type={alert.severity}
                  showIcon
                  icon={alert.severity === 'error' ? <CloseCircleOutlined /> : <WarningOutlined />}
                  style={{ marginBottom: 12 }}
                  description={new Date(alert.createdAt).toLocaleString('zh-CN')}
                />
              ))
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
