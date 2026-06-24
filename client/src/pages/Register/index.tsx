import { useNavigate, Link } from 'react-router-dom';
import { Form, Input, Button, Card, message, Typography } from 'antd';
import { MailOutlined, LockOutlined, UserOutlined } from '@ant-design/icons';
import { useAuthStore } from '@/stores/useAuthStore';
import type { RegisterRequest } from '@/types/auth';

const { Title, Text } = Typography;

export default function Register() {
  const navigate = useNavigate();
  const { register, loading } = useAuthStore();
  const [form] = Form.useForm<RegisterRequest>();
  const [messageApi, contextHolder] = message.useMessage();

  const onFinish = async (values: RegisterRequest) => {
    try {
      await register(values);
      messageApi.success('注册成功');
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : '注册失败，请稍后重试';
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
          <Text type="secondary">创建新账号</Text>
        </div>

        <Form form={form} onFinish={onFinish} size="large" autoComplete="off">
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="用户名"
            />
          </Form.Item>

          <Form.Item
            name="nickname"
          >
            <Input
              prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="昵称（可选）"
            />
          </Form.Item>

          <Form.Item
            name="email"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input
              prefix={<MailOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="邮箱"
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
              注册
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'center' }}>
            <Text type="secondary">
              已有账号？{' '}
              <Link to="/login" style={{ color: '#1677ff' }}>
                立即登录
              </Link>
            </Text>
          </div>
        </Form>
      </Card>
    </div>
  );
}
