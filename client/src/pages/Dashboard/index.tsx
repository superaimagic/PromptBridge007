import { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Table, Button, Tag, Spin, Timeline, Typography, Avatar, Space, Divider } from 'antd';
import {
  FormOutlined,
  ApartmentOutlined,
  ProfileOutlined,
  ExperimentOutlined,
  PlusOutlined,
  RightOutlined,
  ClockCircleOutlined,
  RocketOutlined,
  StarOutlined,
  ThunderboltOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import { promptAPI } from '@/services/prompt';
import { workflowAPI } from '@/services/workflow';
import { roleTemplateAPI } from '@/services/roleTemplate';
import { abtestAPI } from '@/services/abtest';
import { executionAPI } from '@/services/execution';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const { Text, Title } = Typography;

interface DashboardStats {
  promptCount: number;
  workflowCount: number;
  templateCount: number;
  abTestCount: number;
}

interface ActivityItem {
  id: string;
  type: 'prompt' | 'workflow' | 'execution' | 'abtest' | 'template';
  action: string;
  title: string;
  time: string;
  status?: string;
}

const mockStats: DashboardStats = {
  promptCount: 42,
  workflowCount: 18,
  templateCount: 6,
  abTestCount: 4,
};

const mockActivities: ActivityItem[] = [
  { id: '1', type: 'prompt', action: '创建了', title: '代码审查助手 v3', time: '2026-05-19T09:20:00Z', status: 'active' },
  { id: '2', type: 'execution', action: '执行了', title: '翻译助手-文档翻译', time: '2026-05-19T09:15:00Z', status: 'success' },
  { id: '3', type: 'workflow', action: '更新了', title: '数据处理流水线', time: '2026-05-19T09:00:00Z', status: 'active' },
  { id: '4', type: 'abtest', action: '启动了', title: '翻译助手优化 A/B测试', time: '2026-05-19T08:45:00Z', status: 'running' },
  { id: '5', type: 'prompt', action: '更新了', title: '邮件撰写助手', time: '2026-05-19T08:30:00Z', status: 'active' },
  { id: '6', type: 'execution', action: '执行了', title: '内容生成-博客', time: '2026-05-19T08:15:00Z', status: 'failed' },
  { id: '7', type: 'template', action: '实例化了', title: '代码审查员模板', time: '2026-05-19T08:00:00Z' },
  { id: '8', type: 'workflow', action: '发布了', title: '安全检查流水线 v2', time: '2026-05-19T07:45:00Z', status: 'published' },
];

const mockCategoryData = [
  { name: '代码开发', value: 12 },
  { name: '文本翻译', value: 8 },
  { name: '数据分析', value: 7 },
  { name: '内容创作', value: 6 },
  { name: '邮件助手', value: 5 },
  { name: '客户服务', value: 4 },
];

const mockRecentPrompts = [
  { key: '1', name: '代码审查助手', category: '代码开发', visibility: 'team', updatedAt: '2026-05-19 09:20' },
  { key: '2', name: '邮件撰写助手', category: '邮件助手', visibility: 'private', updatedAt: '2026-05-19 08:30' },
  { key: '3', name: '翻译助手', category: '文本翻译', visibility: 'public', updatedAt: '2026-05-18 16:45' },
  { key: '4', name: '数据分析报告', category: '数据分析', visibility: 'team', updatedAt: '2026-05-18 14:20' },
  { key: '5', name: '博客内容生成', category: '内容创作', visibility: 'public', updatedAt: '2026-05-18 11:00' },
];

const typeIconMap: Record<string, { icon: React.ReactNode; color: string; bgColor: string }> = {
  prompt: { icon: <FormOutlined />, color: '#1677ff', bgColor: '#e6f4ff' },
  workflow: { icon: <ApartmentOutlined />, color: '#722ed1', bgColor: '#f9f0ff' },
  execution: { icon: <ThunderboltOutlined />, color: '#52c41a', bgColor: '#f6ffed' },
  abtest: { icon: <ExperimentOutlined />, color: '#fa8c16', bgColor: '#fff7e6' },
  template: { icon: <ProfileOutlined />, color: '#13c2c2', bgColor: '#e6fffb' },
};

const visibilityMap: Record<string, { color: string; label: string }> = {
  private: { color: 'default', label: '私有' },
  team: { color: 'blue', label: '团队' },
  public: { color: 'green', label: '公开' },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>(mockStats);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [promptsRes, workflowsRes, templatesRes, abtestsRes] = await Promise.allSettled([
          promptAPI.list({ page: 1, pageSize: 1 }),
          workflowAPI.list({ page: 1, pageSize: 1 }),
          roleTemplateAPI.list(),
          abtestAPI.list(),
        ]);

        const newStats = { ...mockStats };
        if (promptsRes.status === 'fulfilled' && promptsRes.value?.data?.total) {
          newStats.promptCount = promptsRes.value.data.total;
        }
        if (workflowsRes.status === 'fulfilled' && workflowsRes.value?.data?.total) {
          newStats.workflowCount = workflowsRes.value.data.total;
        }
        if (templatesRes.status === 'fulfilled' && Array.isArray(templatesRes.value?.data)) {
          newStats.templateCount = templatesRes.value.data.length;
        }
        if (abtestsRes.status === 'fulfilled' && Array.isArray(abtestsRes.value?.data?.list)) {
          newStats.abTestCount = abtestsRes.value.data.list.length;
        }
        setStats(newStats);
      } catch {
        // use mock
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div>;
  }

  // 资源统计卡片
  const resourceCards = [
    {
      title: 'Prompt数量',
      value: stats.promptCount,
      icon: <FormOutlined style={{ fontSize: 28, color: '#1677ff' }} />,
      color: '#1677ff',
      bgColor: '#e6f4ff',
      path: '/prompts',
      action: '管理Prompt',
    },
    {
      title: '工作流数量',
      value: stats.workflowCount,
      icon: <ApartmentOutlined style={{ fontSize: 28, color: '#722ed1' }} />,
      color: '#722ed1',
      bgColor: '#f9f0ff',
      path: '/workflows',
      action: '管理工作流',
    },
    {
      title: '岗位模板',
      value: stats.templateCount,
      icon: <ProfileOutlined style={{ fontSize: 28, color: '#13c2c2' }} />,
      color: '#13c2c2',
      bgColor: '#e6fffb',
      path: '/role-templates',
      action: '查看模板',
    },
    {
      title: 'A/B测试',
      value: stats.abTestCount,
      icon: <ExperimentOutlined style={{ fontSize: 28, color: '#fa8c16' }} />,
      color: '#fa8c16',
      bgColor: '#fff7e6',
      path: '/ab-tests',
      action: '查看测试',
    },
  ];

  // 分类分布饼图
  const categoryPieOption = {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { orient: 'vertical', right: 10, top: 'center', textStyle: { fontSize: 13 } },
    series: [{
      type: 'pie',
      radius: ['45%', '70%'],
      center: ['35%', '50%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
      label: { show: false },
      emphasis: { label: { show: true, fontSize: 16, fontWeight: 'bold' } },
      data: mockCategoryData,
      color: ['#1677ff', '#722ed1', '#52c41a', '#fa8c16', '#eb2f96', '#13c2c2'],
    }],
  };

  // Prompt增长趋势
  const growthOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['新增Prompt', '新增工作流'] },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: ['5/13', '5/14', '5/15', '5/16', '5/17', '5/18', '5/19'] },
    yAxis: { type: 'value', name: '数量' },
    series: [
      {
        name: '新增Prompt',
        type: 'bar',
        data: [3, 5, 2, 6, 4, 3, 5],
        itemStyle: { color: '#1677ff', borderRadius: [4, 4, 0, 0] },
        barWidth: '30%',
      },
      {
        name: '新增工作流',
        type: 'bar',
        data: [1, 2, 1, 3, 2, 1, 2],
        itemStyle: { color: '#722ed1', borderRadius: [4, 4, 0, 0] },
        barWidth: '30%',
      },
    ],
  };

  // 最近Prompt表格列
  const recentPromptColumns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <a onClick={() => navigate('/prompts')}>{text}</a>,
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      render: (text: string) => <Tag>{text}</Tag>,
    },
    {
      title: '可见性',
      dataIndex: 'visibility',
      key: 'visibility',
      render: (v: string) => {
        const item = visibilityMap[v] || visibilityMap.private;
        return <Tag color={item.color}>{item.label}</Tag>;
      },
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (v: string) => <Text type="secondary">{v}</Text>,
    },
  ];

  return (
    <div>
      {/* 页头 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>工作台</Title>
          <Text type="secondary">PromptMS 提示词管理系统概览</Text>
        </div>
        <Space>
          <Button icon={<PlusOutlined />} onClick={() => navigate('/prompts/create')}>创建Prompt</Button>
          <Button type="primary" icon={<ApartmentOutlined />} onClick={() => navigate('/workflows/create')}>创建工作流</Button>
        </Space>
      </div>

      {/* 资源统计卡片 */}
      <Row gutter={[24, 24]}>
        {resourceCards.map((item) => (
          <Col xs={24} sm={12} lg={6} key={item.title}>
            <Card
              bordered={false}
              hoverable
              style={{ borderRadius: 8, cursor: 'pointer' }}
              styles={{ body: { padding: 24 } }}
              onClick={() => navigate(item.path)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ color: '#8c8c8c', fontSize: 14, marginBottom: 8 }}>{item.title}</div>
                  <Statistic value={item.value} valueStyle={{ color: item.color, fontSize: 32, fontWeight: 700 }} />
                </div>
                <div style={{
                  width: 56, height: 56, borderRadius: 12, background: item.bgColor,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {item.icon}
                </div>
              </div>
              <Divider style={{ margin: '12px 0 8px' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text type="secondary" style={{ fontSize: 13 }}>{item.action}</Text>
                <RightOutlined style={{ color: item.color, fontSize: 12 }} />
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        {/* 左侧：资源增长趋势 + 最近Prompt */}
        <Col xs={24} lg={14}>
          <Card title="近7天资源增长" bordered={false} style={{ borderRadius: 8, marginBottom: 24 }}>
            <ReactECharts option={growthOption} style={{ height: 260 }} />
          </Card>

          <Card
            title="最近更新的Prompt"
            bordered={false}
            style={{ borderRadius: 8 }}
            extra={<Button type="link" onClick={() => navigate('/prompts')}>查看全部</Button>}
          >
            <Table columns={recentPromptColumns} dataSource={mockRecentPrompts} pagination={false} size="small" />
          </Card>
        </Col>

        {/* 右侧：分类分布 + 活动流 */}
        <Col xs={24} lg={10}>
          <Card title="Prompt分类分布" bordered={false} style={{ borderRadius: 8, marginBottom: 24 }}>
            <ReactECharts option={categoryPieOption} style={{ height: 260 }} />
          </Card>

          <Card title="最近活动" bordered={false} style={{ borderRadius: 8 }}>
            <Timeline
              items={mockActivities.map((activity) => {
                const typeInfo = typeIconMap[activity.type] || typeIconMap.prompt;
                return {
                  color: activity.status === 'failed' ? 'red' : activity.status === 'running' ? 'blue' : 'green',
                  dot: activity.status === 'running'
                    ? <ClockCircleOutlined style={{ fontSize: 14, color: '#1677ff' }} />
                    : undefined,
                  children: (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <Avatar
                        size={28}
                        style={{ backgroundColor: typeInfo.bgColor, flexShrink: 0 }}
                        icon={<span style={{ color: typeInfo.color, fontSize: 14 }}>{typeInfo.icon}</span>}
                      />
                      <div style={{ flex: 1 }}>
                        <div>
                          <Text style={{ fontWeight: 500 }}>{activity.action}</Text>
                          {' '}
                          <a onClick={() => {
                            const pathMap: Record<string, string> = {
                              prompt: '/prompts',
                              workflow: '/workflows',
                              execution: '/executions',
                              abtest: '/ab-tests',
                              template: '/role-templates',
                            };
                            navigate(pathMap[activity.type] || '/');
                          }}>
                            {activity.title}
                          </a>
                          {activity.status === 'failed' && <Tag color="red" style={{ marginLeft: 6 }}>失败</Tag>}
                          {activity.status === 'running' && <Tag color="blue" style={{ marginLeft: 6 }}>运行中</Tag>}
                        </div>
                        <Text type="secondary" style={{ fontSize: 12 }}>{dayjs(activity.time).fromNow()}</Text>
                      </div>
                    </div>
                  ),
                };
              })}
            />
          </Card>
        </Col>
      </Row>

      {/* 快捷入口 */}
      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        <Col span={24}>
          <Card title="快捷入口" bordered={false} style={{ borderRadius: 8 }}>
            <Row gutter={[16, 16]}>
              {[
                { title: '创建Prompt', desc: '编写新的提示词模板', icon: <FormOutlined />, color: '#1677ff', bgColor: '#e6f4ff', path: '/prompts/create' },
                { title: '创建工作流', desc: '编排自动化工作流', icon: <ApartmentOutlined />, color: '#722ed1', bgColor: '#f9f0ff', path: '/workflows/create' },
                { title: '查看执行记录', desc: '追踪工作流运行状态', icon: <EyeOutlined />, color: '#52c41a', bgColor: '#f6ffed', path: '/executions' },
                { title: '监控看板', desc: '实时监控系统运行', icon: <RocketOutlined />, color: '#fa8c16', bgColor: '#fff7e6', path: '/monitor' },
                { title: 'A/B测试', desc: '对比不同版本效果', icon: <ExperimentOutlined />, color: '#eb2f96', bgColor: '#fff0f6', path: '/ab-tests' },
                { title: '岗位模板', desc: '从模板快速创建', icon: <ProfileOutlined />, color: '#13c2c2', bgColor: '#e6fffb', path: '/role-templates' },
              ].map((item) => (
                <Col xs={12} sm={8} lg={4} key={item.title}>
                  <Card
                    hoverable
                    bordered={false}
                    style={{ borderRadius: 8, textAlign: 'center', cursor: 'pointer' }}
                    styles={{ body: { padding: '20px 16px' } }}
                    onClick={() => navigate(item.path)}
                  >
                    <div style={{
                      width: 48, height: 48, borderRadius: 12, background: item.bgColor,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      margin: '0 auto 12px', fontSize: 22, color: item.color,
                    }}>
                      {item.icon}
                    </div>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{item.title}</div>
                    <Text type="secondary" style={{ fontSize: 12 }}>{item.desc}</Text>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
