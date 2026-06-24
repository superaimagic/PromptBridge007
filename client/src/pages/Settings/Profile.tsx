import { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Upload, Avatar, message, Divider } from 'antd';
import { UserOutlined, UploadOutlined } from '@ant-design/icons';
import { authAPI } from '@/services/auth';
import { useAuthStore } from '@/stores/useAuthStore';

export default function Profile() {
  const { user, fetchUser } = useAuthStore();
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    if (user) {
      profileForm.setFieldsValue({ name: user.name, email: user.email });
    }
  }, [user, profileForm]);

  const handleProfileUpdate = async (values: { name: string }) => {
    setProfileLoading(true);
    try {
      await authAPI.updateMe(values);
      await fetchUser();
      message.success('个人信息更新成功');
    } catch {
      message.error('更新失败');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordChange = async (values: { oldPassword: string; newPassword: string }) => {
    setPasswordLoading(true);
    try {
      await authAPI.changePassword({ oldPassword: values.oldPassword, newPassword: values.newPassword });
      message.success('密码修改成功');
      passwordForm.resetFields();
    } catch {
      message.error('密码修改失败');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 600 }}>
      <Card title="个人信息" bordered={false} style={{ borderRadius: 8, marginBottom: 24 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Avatar size={80} src={user?.avatar} icon={!user?.avatar && <UserOutlined />} style={{ marginBottom: 12 }} />
          <div>
            <Upload showUploadList={false} accept="image/*" beforeUpload={() => { message.info('头像上传功能开发中'); return false; }}>
              <Button size="small" icon={<UploadOutlined />}>更换头像</Button>
            </Upload>
          </div>
        </div>
        <Form form={profileForm} layout="vertical" onFinish={handleProfileUpdate}>
          <Form.Item label="邮箱" name="email">
            <Input disabled />
          </Form.Item>
          <Form.Item label="昵称" name="name" rules={[{ required: true, message: '请输入昵称' }]}>
            <Input placeholder="请输入昵称" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={profileLoading}>保存修改</Button>
          </Form.Item>
        </Form>
      </Card>

      <Card title="修改密码" bordered={false} style={{ borderRadius: 8 }}>
        <Form form={passwordForm} layout="vertical" onFinish={handlePasswordChange}>
          <Form.Item label="旧密码" name="oldPassword" rules={[{ required: true, message: '请输入旧密码' }]}>
            <Input.Password placeholder="请输入旧密码" />
          </Form.Item>
          <Form.Item label="新密码" name="newPassword" rules={[
            { required: true, message: '请输入新密码' },
            { min: 8, message: '密码至少8个字符' },
          ]}>
            <Input.Password placeholder="请输入新密码" />
          </Form.Item>
          <Form.Item label="确认新密码" name="confirmPassword" dependencies={['newPassword']} rules={[
            { required: true, message: '请确认新密码' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) return Promise.resolve();
                return Promise.reject(new Error('两次输入的密码不一致'));
              },
            }),
          ]}>
            <Input.Password placeholder="请再次输入新密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={passwordLoading}>修改密码</Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
