import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Input, Select, Space, Tag, Popconfirm, message } from 'antd';
import { PlusOutlined, SearchOutlined, CopyOutlined, DeleteOutlined, EditOutlined, EyeOutlined } from '@ant-design/icons';
import { usePromptStore } from '@/stores/usePromptStore';
import { categoryAPI } from '@/services/category';
import { tagAPI } from '@/services/tag';
import type { Prompt } from '@/types/prompt';
import type { Category, Tag as TagType } from '@/types/prompt';
import type { ColumnsType } from 'antd/es/table';

const { Search } = Input;

const visibilityMap: Record<string, { label: string; color: string }> = {
  private: { label: '私有', color: 'default' },
  workspace: { label: '工作区', color: 'blue' },
  public: { label: '公开', color: 'green' },
};

export default function PromptList() {
  const navigate = useNavigate();
  const { prompts, total, loading, fetchPrompts, deletePrompt } = usePromptStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<TagType[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [visibility, setVisibility] = useState<string | undefined>();

  const loadData = useCallback(() => {
    fetchPrompts({ page, pageSize, keyword, categoryId, visibility });
  }, [page, pageSize, keyword, categoryId, visibility, fetchPrompts]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    categoryAPI.list().then((res) => setCategories(res.data)).catch(() => {});
    tagAPI.list().then((res) => setTags(res.data)).catch(() => {});
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await deletePrompt(id);
      message.success('删除成功');
      loadData();
    } catch {
      message.error('删除失败');
    }
  };

  const handleDuplicate = async (record: Prompt) => {
    try {
      const { promptAPI } = await import('@/services/prompt');
      await promptAPI.duplicate(record.id);
      message.success('复制成功');
      loadData();
    } catch {
      message.error('复制失败');
    }
  };

  const columns: ColumnsType<Prompt> = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (text: string, record: Prompt) => (
        <a onClick={() => navigate(`/prompts/${record.id}`)}>{text}</a>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (cat?: Category) => cat?.name ?? '-',
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      width: 200,
      render: (tags?: TagType[]) =>
        tags?.map((t) => <Tag key={t.id} color={t.color}>{t.name}</Tag>) ?? '-',
    },
    {
      title: '可见性',
      dataIndex: 'visibility',
      key: 'visibility',
      width: 100,
      render: (v: string) => {
        const item = visibilityMap[v];
        return item ? <Tag color={item.color}>{item.label}</Tag> : v;
      },
    },
    {
      title: '版本',
      dataIndex: 'current_version',
      key: 'current_version',
      width: 80,
      align: 'center',
    },
    {
      title: '评分',
      dataIndex: ['metrics', 'avg_score'],
      key: 'avg_score',
      width: 80,
      align: 'center',
      render: (v: number) => v?.toFixed(1) ?? '-',
    },
    {
      title: '使用次数',
      dataIndex: ['metrics', 'usage_count'],
      key: 'usage_count',
      width: 100,
      align: 'center',
    },
    {
      title: '采纳率',
      dataIndex: ['metrics', 'adopt_rate'],
      key: 'adopt_rate',
      width: 100,
      align: 'center',
      render: (v: number) => v != null ? `${(v * 100).toFixed(1)}%` : '-',
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 180,
      render: (v: string) => v ? new Date(v).toLocaleString() : '-',
    },
    {
      title: '操作',
      key: 'actions',
      width: 160,
      render: (_, record) => (
        <Space size="small">
          <Button type="link" icon={<EyeOutlined />} onClick={() => navigate(`/prompts/${record.id}`)} />
          <Button type="link" icon={<EditOutlined />} onClick={() => navigate(`/prompts/${record.id}/edit`)} />
          <Button type="link" icon={<CopyOutlined />} onClick={() => handleDuplicate(record)} />
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Space wrap>
          <Search
            placeholder="搜索Prompt"
            allowClear
            onSearch={setKeyword}
            style={{ width: 250 }}
            prefix={<SearchOutlined />}
          />
          <Select
            placeholder="分类"
            allowClear
            style={{ width: 150 }}
            value={categoryId}
            onChange={setCategoryId}
            options={categories.map((c) => ({ label: c.name, value: c.id }))}
          />
          <Select
            placeholder="可见性"
            allowClear
            style={{ width: 120 }}
            value={visibility}
            onChange={setVisibility}
            options={[
              { label: '私有', value: 'private' },
              { label: '工作区', value: 'workspace' },
              { label: '公开', value: 'public' },
            ]}
          />
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/prompts/create')}>
          新建Prompt
        </Button>
      </div>

      <Table<Prompt>
        rowKey="id"
        columns={columns}
        dataSource={prompts}
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
        }}
        onRow={(record) => ({
          onClick: () => navigate(`/prompts/${record.id}`),
          style: { cursor: 'pointer' },
        })}
      />
    </div>
  );
}
