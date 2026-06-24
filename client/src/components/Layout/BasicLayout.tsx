import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { ProLayout } from '@ant-design/pro-components';
import {
  DashboardOutlined,
  FormOutlined,
  ApartmentOutlined,
  HistoryOutlined,
  MonitorOutlined,
  ExperimentOutlined,
  ProfileOutlined,
  SettingOutlined,
  LogoutOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Dropdown, theme } from 'antd';
import type { MenuDataItem } from '@ant-design/pro-components';
import { useAuthStore } from '@/stores/useAuthStore';

const menuData: MenuDataItem[] = [
  {
    path: '/dashboard',
    name: 'Dashboard',
    icon: <DashboardOutlined />,
  },
  {
    path: '/prompts',
    name: 'Prompt管理',
    icon: <FormOutlined />,
  },
  {
    path: '/workflows',
    name: '工作流管理',
    icon: <ApartmentOutlined />,
  },
  {
    path: '/executions',
    name: '执行记录',
    icon: <HistoryOutlined />,
  },
  {
    path: '/monitor',
    name: '监控看板',
    icon: <MonitorOutlined />,
  },
  {
    path: '/ab-tests',
    name: 'A/B测试',
    icon: <ExperimentOutlined />,
  },
  {
    path: '/role-templates',
    name: '岗位模板',
    icon: <ProfileOutlined />,
  },
  {
    path: '/settings',
    name: '设置',
    icon: <SettingOutlined />,
  },
];

export default function BasicLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const { token: themeToken } = theme.useToken();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <ProLayout
      title="PromptMS"
      logo={false}
      layout="mix"
      collapsed={collapsed}
      onCollapse={setCollapsed}
      location={{ pathname: location.pathname }}
      menuDataRender={() => menuData}
      menuItemRender={(item, dom) => (
        <div onClick={() => item.path && navigate(item.path)}>{dom}</div>
      )}
      avatarProps={{
        src: user?.avatar || undefined,
        title: user?.name || '用户',
        icon: <UserOutlined />,
        size: 'small',
        render: (_, dom) => (
          <Dropdown
            menu={{
              items: [
                {
                  key: 'logout',
                  icon: <LogoutOutlined />,
                  label: '退出登录',
                  onClick: handleLogout,
                },
              ],
            }}
          >
            {dom}
          </Dropdown>
        ),
      }}
      token={{
        header: {
          colorBgHeader: themeToken.colorPrimary,
          colorHeaderTitle: '#fff',
          colorTextMenu: 'rgba(255,255,255,0.85)',
          colorTextMenuActive: '#fff',
          colorTextMenuSecondary: 'rgba(255,255,255,0.65)',
        },
        sider: {
          colorMenuBackground: '#fff',
          colorTextMenu: themeToken.colorText,
          colorTextMenuActive: themeToken.colorPrimary,
          colorBgMenuItemActive: themeToken.colorPrimaryBg,
        },
      }}
      contentStyle={{ padding: 24 }}
    >
      <Outlet />
    </ProLayout>
  );
}
