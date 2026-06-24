import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Form, Input, Select, Button, Card, Space, InputNumber, message, Divider, Empty } from 'antd';
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { usePromptStore } from '@/stores/usePromptStore';
import { categoryAPI } from '@/services/category';
import { tagAPI } from '@/services/tag';
import type { Category, Tag, Variable } from '@/types/prompt';

export default function PromptEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;
  const { currentPrompt, fetchPromptById, createPrompt, updatePrompt } = usePromptStore();
  const [form] = Form.useForm();
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    categoryAPI.list().then((res) => setCategories(res.data)).catch(() => {});
    tagAPI.list().then((res) => setTags(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (id) {
      fetchPromptById(id);
    }
  }, [id, fetchPromptById]);

  useEffect(() => {
    if (isEdit && currentPrompt) {
      form.setFieldsValue({
        title: currentPrompt.title,
        description: currentPrompt.description,
        content: currentPrompt.content,
        category_id: currentPrompt.category_id,
        visibility: currentPrompt.visibility,
        tag_ids: currentPrompt.tags?.map((t) => t.id),
        variables: currentPrompt.variables?.length ? currentPrompt.variables : undefined,
        model: currentPrompt.model_config?.model,
        provider: currentPrompt.model_config?.provider,
        temperature: currentPrompt.model_config?.temperature,
        max_tokens: currentPrompt.model_config?.max_tokens,
      });
    }
  }, [isEdit, currentPrompt, form]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const variables: Variable[] = (values.variables || []).map((v: Variable) => ({
        name: v.name,
        type: v.type || 'string',
        required: v.required ?? false,
        default: v.default || '',
        description: v.description || '',
        options: v.options,
      }));

      const data = {
        title: values.title,
        description: values.description || '',
        content: values.content,
        category_id: values.category_id,
        visibility: values.visibility,
        tags: values.tag_ids || [],
        variables,
        model_config: {
          model: values.model || '',
          provider: values.provider || '',
          temperature: values.temperature ?? 0.7,
          max_tokens: values.max_tokens ?? 2048,
        },
      };

      if (isEdit && id) {
        await updatePrompt(id, data);
        message.success('更新成功');
      } else {
        await createPrompt(data);
        message.success('创建成功');
      }
      navigate('/prompts');
    } catch {
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 900 }}>
      <h2 style={{ marginBottom: 24 }}>{isEdit ? '编辑Prompt' : '新建Prompt'}</h2>

      <Form form={form} layout="vertical" initialValues={{ visibility: 'private', temperature: 0.7, max_tokens: 2048 }}>
        <Card title="基本信息" style={{ marginBottom: 16 }}>
          <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="请输入Prompt标题" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="请输入描述" />
          </Form.Item>
          <Space style={{ width: '100%' }} size="large">
            <Form.Item name="category_id" label="分类" style={{ width: 250 }}>
              <Select placeholder="选择分类" allowClear options={categories.map((c) => ({ label: c.name, value: c.id }))} />
            </Form.Item>
            <Form.Item name="visibility" label="可见性" style={{ width: 200 }}>
              <Select options={[
                { label: '私有', value: 'private' },
                { label: '工作区', value: 'workspace' },
                { label: '公开', value: 'public' },
              ]} />
            </Form.Item>
            <Form.Item name="tag_ids" label="标签" style={{ minWidth: 250 }}>
              <Select mode="multiple" placeholder="选择标签" options={tags.map((t) => ({ label: t.name, value: t.id }))} />
            </Form.Item>
          </Space>
        </Card>

        <Card title="内容" style={{ marginBottom: 16 }}>
          <Form.Item name="content" label="Prompt内容" rules={[{ required: true, message: '请输入内容' }]}>
            <Input.TextArea
              rows={12}
              placeholder="请输入Prompt内容，使用 {{变量名}} 语法插入变量"
              style={{ fontFamily: 'monospace' }}
            />
          </Form.Item>
          <div style={{ color: '#8c8c8c', fontSize: 12 }}>
            提示：使用 {'{{变量名}}'} 语法定义变量，例如：{'{{input}}'}、{'{{context}}'}
          </div>
        </Card>

        <Card title="变量管理" style={{ marginBottom: 16 }}>
          <Form.List name="variables">
            {(fields, { add, remove }) => (
              <>
                {fields.length === 0 && <Empty description="暂无变量，点击下方按钮添加" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                    <Form.Item {...restField} name={[name, 'name']} rules={[{ required: true, message: '变量名' }]}>
                      <Input placeholder="变量名" style={{ width: 120 }} />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'type']} initialValue="string">
                      <Select style={{ width: 100 }} options={[
                        { label: '字符串', value: 'string' },
                        { label: '数字', value: 'number' },
                        { label: '布尔', value: 'boolean' },
                        { label: '数组', value: 'array' },
                      ]} />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'required']} valuePropName="checked" initialValue={false}>
                      <Select style={{ width: 80 }} options={[{ label: '必填', value: true }, { label: '选填', value: false }]} />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'default']}>
                      <Input placeholder="默认值" style={{ width: 120 }} />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'description']}>
                      <Input placeholder="描述" style={{ width: 150 }} />
                    </Form.Item>
                    <MinusCircleOutlined onClick={() => remove(name)} style={{ color: '#ff4d4f' }} />
                  </Space>
                ))}
                <Form.Item>
                  <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />} style={{ width: '100%' }}>
                    添加变量
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>
        </Card>

        <Card title="模型配置" style={{ marginBottom: 16 }}>
          <Space style={{ width: '100%' }} size="large">
            <Form.Item name="provider" label="Provider">
              <Select placeholder="选择Provider" style={{ width: 160 }} allowClear options={[
                { label: 'OpenAI', value: 'openai' },
                { label: 'Anthropic', value: 'anthropic' },
                { label: 'Google', value: 'google' },
                { label: 'Azure', value: 'azure' },
                { label: '自定义', value: 'custom' },
              ]} />
            </Form.Item>
            <Form.Item name="model" label="模型">
              <Input placeholder="如 gpt-4o" style={{ width: 200 }} />
            </Form.Item>
          </Space>
          <Space size="large">
            <Form.Item name="temperature" label="Temperature">
              <InputNumber min={0} max={2} step={0.1} style={{ width: 150 }} />
            </Form.Item>
            <Form.Item name="max_tokens" label="Max Tokens">
              <InputNumber min={1} max={128000} step={256} style={{ width: 150 }} />
            </Form.Item>
          </Space>
        </Card>

        <Divider />
        <Space>
          <Button type="primary" loading={saving} onClick={handleSave}>保存</Button>
          <Button onClick={() => navigate('/prompts')}>取消</Button>
        </Space>
      </Form>
    </div>
  );
}
