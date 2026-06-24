import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Button, Input, Tag, Empty, Spin, Popconfirm, message } from 'antd';
import { PlusOutlined, SearchOutlined, CopyOutlined, DeleteOutlined, EditOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { useWorkflowStore } from '@/stores/useWorkflowStore';
import type { Workflow } from '@/types/workflow';

const { Search } = Input;

export default function WorkflowList() {
  const navigate = useNavigate();
  const { workflows, total, loading, fetchWorkflows } = useWorkflowStore();
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);

  const loadData = useCallback(() => {
    fetchWorkflows({ page, pageSize: 12, keyword });
  }, [page, keyword, fetchWorkflows]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (id: string) => {
    try {
      const { workflowAPI } = await import('@/services/workflow');
      await workflowAPI.delete(id);
      message.success('删除成功');
      loadData();
    } catch {
      message.error('删除失败');
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const { workflowAPI } = await import('@/services/workflow');
      await workflowAPI.duplicate(id);
      message.success('复制成功');
      loadData();
    } catch {
      message.error('复制失败');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Search
          placeholder="搜索工作流"
          allowClear
          onSearch={setKeyword}
          style={{ width: 300 }}
          prefix={<SearchOutlined />}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/workflows/create')}>
          新建工作流
        </Button>
      </div>

      <Spin spinning={loading}>
        {workflows.length === 0 && !loading ? (
          <Empty description="暂无工作流" />
        ) : (
          <Row gutter={[16, 16]}>
            {workflows.map((wf: Workflow) => (
              <Col xs={24} sm={12} lg={8} xl={6} key={wf.id}>
                <Card
                  hoverable
                  onClick={() => navigate(`/workflows/${wf.id}`)}
                  styles={{ body: { padding: 20 } }}
                  actions={[
                    <EditOutlined key="edit" onClick={(e) => { e.stopPropagation(); navigate(`/workflows/${wf.id}/editor`); }} />,
                    <CopyOutlined key="copy" onClick={(e) => { e.stopPropagation(); handleDuplicate(wf.id); }} />,
                    <DeleteOutlined key="delete" onClick={(e) => { e.stopPropagation(); }} />,
                  ]}
                >
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ fontSize: 16, fontWeight: 600 }}>{wf.name}</span>
                    {wf.is_published === 1 && <Tag color="green" style={{ marginLeft: 8 }}>已发布</Tag>}
                  </div>
                  <div style={{ color: '#8c8c8c', fontSize: 13, marginBottom: 12, minHeight: 40 }}>
                    {wf.description || '暂无描述'}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#8c8c8c', fontSize: 12 }}>
                    <span>执行 {wf.execution_count ?? 0} 次</span>
                    <span>平均 {wf.avg_duration_ms ? `${(wf.avg_duration_ms / 1000).toFixed(1)}s` : '-'}</span>
                  </div>
                  {wf.tags?.length ? (
                    <div style={{ marginTop: 8 }}>
                      {wf.tags.map((t) => <Tag key={t.id} color={t.color}>{t.name}</Tag>)}
                    </div>
                  ) : null}
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Spin>

      {total > 12 && (
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Button onClick={() => setPage(page + 1)} disabled={workflows.length >= total}>
            加载更多
          </Button>
        </div>
      )}
    </div>
  );
}
