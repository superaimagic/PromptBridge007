import { useNavigate, Link } from 'react-router-dom';
import { Form, Input, Button, Card, message, Typography } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuthStore } from '@/stores/useAuthStore';
import type { LoginRequest } from '@/types/auth';

const { Title, Text } = Typography;

export default function Login() {
  const navigate = useNavigate();
  const { login, loading } = useAuthStore();
  const [form] = Form.useForm<LoginRequest>();
  const [messageApi, contextHolder] = message.useMessage();

  const onFinish = async (values: LoginRequest) => {
    try {
      await login(values);
      messageApi.success('登录成功');
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : '登录失败，请检查用户名和密码';
      messageApi.error(errorMsg);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      {contextHolder}
      <Card
        style={{
          width: 420,
          borderRadius: 12,
          boxShadow: '0 8px 40px rgba(0,0,0,0.12)',
        }}
        styles={{ body: { padding: '40px 32px' } }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title level={2} style={{ marginBottom: 8, color: '#1677ff' }}>
            PromptMS
          </Title>
          <Text type="secondary">智能提示词管理系统</Text>
        </div>

        <Form form={form} onFinish={onFinish} size="large" autoComplete="off">
          <Form.Item
            name="username"
            rules={[
              { required: true, message: '请输入用户名' },
            ]}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="用户名"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少6个字符' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="密码"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              style={{ height: 44, borderRadius: 8 }}
            >
              登录
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'center' }}>
            <Text type="secondary">
              还没有账号？{' '}
              <Link to="/register" style={{ color: '#1677ff' }}>
                立即注册
              </Link>
            </Text>
          </div>
        </Form>
      </Card>
    </div>
  );
}
