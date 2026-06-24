import { Card, Descriptions, Statistic, Row, Col } from 'antd';
import {
  CloudServerOutlined,
  DatabaseOutlined,
  TeamOutlined,
  ApiOutlined,
} from '@ant-design/icons';

export default function SystemSettings() {
  return (
    <div style={{ maxWidth: 900 }}>
      <Card title="系统信息" bordered={false} style={{ borderRadius: 8, marginBottom: 24 }}>
        <Descriptions column={2}>
          <Descriptions.Item label="系统版本">1.0.0</Descriptions.Item>
          <Descriptions.Item label="运行环境">Production</Descriptions.Item>
          <Descriptions.Item label="数据库">PostgreSQL 16</Descriptions.Item>
          <Descriptions.Item label="缓存">Redis 7</Descriptions.Item>
          <Descriptions.Item label="服务器时间">{new Date().toLocaleString('zh-CN')}</Descriptions.Item>
          <Descriptions.Item label="运行时长">45 天</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="数据统计" bordered={false} style={{ borderRadius: 8 }}>
        <Row gutter={[24, 24]}>
          <Col xs={12} sm={6}>
            <Statistic title="用户总数" value={128} prefix={<TeamOutlined />} valueStyle={{ color: '#1677ff' }} />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic title="Prompt总数" value={1847} prefix={<CloudServerOutlined />} valueStyle={{ color: '#52c41a' }} />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic title="工作流总数" value={342} prefix={<DatabaseOutlined />} valueStyle={{ color: '#722ed1' }} />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic title="今日API调用" value={15632} prefix={<ApiOutlined />} valueStyle={{ color: '#fa8c16' }} />
          </Col>
        </Row>
      </Card>
    </div>
  );
}
