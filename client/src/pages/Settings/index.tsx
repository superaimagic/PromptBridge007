import { Tabs } from 'antd';
import { UserOutlined, ApiOutlined, SettingOutlined } from '@ant-design/icons';
import Profile from './Profile';
import ModelConfig from './ModelConfig';
import SystemSettings from './SystemSettings';

export default function Settings() {
  const items = [
    {
      key: 'profile',
      label: (
        <span>
          <UserOutlined /> 个人设置
        </span>
      ),
      children: <Profile />,
    },
    {
      key: 'model',
      label: (
        <span>
          <ApiOutlined /> 模型配置
        </span>
      ),
      children: <ModelConfig />,
    },
    {
      key: 'system',
      label: (
        <span>
          <SettingOutlined /> 系统设置
        </span>
      ),
      children: <SystemSettings />,
    },
  ];

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>设置</h2>
      <Tabs defaultActiveKey="profile" items={items} />
    </div>
  );
}
