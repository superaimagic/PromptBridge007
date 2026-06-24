import { useCallback, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ReactFlow,
  Controls,
  Background,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
  type NodeTypes,
  BackgroundVariant,
  Panel,
  Handle,
  Position,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button, Input, Select, Form, Space, Drawer, InputNumber, message, Popconfirm } from 'antd';
import {
  SaveOutlined,
  SendOutlined,
  PlayCircleOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { useWorkflowStore } from '@/stores/useWorkflowStore';
import { workflowAPI } from '@/services/workflow';
import type { WorkflowNode as WFNode } from '@/types/workflow';

// Node type definitions
const NODE_TYPES_CONFIG = [
  { type: 'startNode', label: '开始', icon: '▶', color: '#52c41a' },
  { type: 'endNode', label: '结束', icon: '⏹', color: '#ff4d4f' },
  { type: 'promptNode', label: 'Prompt', icon: '📝', color: '#1677ff' },
  { type: 'aiNode', label: 'AI处理', icon: '🤖', color: '#722ed1' },
  { type: 'humanReviewNode', label: '人工审核', icon: '👤', color: '#fa8c16' },
  { type: 'dataTransformNode', label: '数据流转', icon: '🔄', color: '#13c2c2' },
  { type: 'conditionNode', label: '条件分支', icon: '🔀', color: '#eb2f96' },
  { type: 'loopNode', label: '循环', icon: '🔁', color: '#faad14' },
  { type: 'httpRequestNode', label: 'HTTP请求', icon: '🌐', color: '#2f54eb' },
  { type: 'codeNode', label: '代码执行', icon: '⚡', color: '#f5222d' },
] as const;

const nodeTypeMap = Object.fromEntries(NODE_TYPES_CONFIG.map((n) => [n.type, n]));

// Custom node component
function CustomNode({ data, selected }: NodeProps) {
  const config = nodeTypeMap[(data as any).nodeType as string] ?? { icon: '?', label: '未知', color: '#999' };
  return (
    <div
      style={{
        padding: '10px 20px',
        borderRadius: 8,
        background: '#fff',
        border: `2px solid ${selected ? '#1677ff' : config.color}`,
        boxShadow: selected ? '0 0 8px rgba(22,119,255,0.3)' : '0 2px 6px rgba(0,0,0,0.1)',
        minWidth: 140,
        textAlign: 'center',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: config.color }} />
      <div style={{ fontSize: 20 }}>{config.icon}</div>
      <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>{(data as any).label || config.label}</div>
      <Handle type="source" position={Position.Bottom} style={{ background: config.color }} />
    </div>
  );
}

const nodeTypes: NodeTypes = {
  startNode: CustomNode,
  endNode: CustomNode,
  promptNode: CustomNode,
  aiNode: CustomNode,
  humanReviewNode: CustomNode,
  dataTransformNode: CustomNode,
  conditionNode: CustomNode,
  loopNode: CustomNode,
  httpRequestNode: CustomNode,
  codeNode: CustomNode,
};

let nodeId = 0;
const getId = () => `node_${++nodeId}`;

export default function WorkflowEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentWorkflow, fetchWorkflowById, updateWorkflow, saveVersion } = useWorkflowStore();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [workflowName, setWorkflowName] = useState('未命名工作流');
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  // Load workflow if editing
  const loadWorkflow = useCallback(async () => {
    if (!id) return;
    await fetchWorkflowById(id);
  }, [id, fetchWorkflowById]);

  // Initialize from loaded workflow
  const initFromWorkflow = useCallback(() => {
    if (!currentWorkflow) return;
    setWorkflowName(currentWorkflow.name);
    const config = currentWorkflow.config;
    if (config?.nodes) {
      const flowNodes: Node[] = config.nodes.map((n: WFNode) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: n.data,
      }));
      setNodes(flowNodes);
      if (config.edges) {
        const flowEdges: Edge[] = config.edges.map((e: any) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          type: e.type || 'default',
        }));
        setEdges(flowEdges);
      }
    } else {
      // Default start and end nodes
      setNodes([
        { id: 'start_1', type: 'startNode', position: { x: 250, y: 50 }, data: { nodeType: 'startNode', label: '开始' } },
        { id: 'end_1', type: 'endNode', position: { x: 250, y: 400 }, data: { nodeType: 'endNode', label: '结束' } },
      ]);
    }
  }, [currentWorkflow, setNodes, setEdges]);

  // Load on mount
  useState(() => {
    if (id) {
      loadWorkflow().then(() => {
        // initFromWorkflow will be called via useEffect below
      });
    } else {
      setNodes([
        { id: 'start_1', type: 'startNode', position: { x: 250, y: 50 }, data: { nodeType: 'startNode', label: '开始' } },
        { id: 'end_1', type: 'endNode', position: { x: 250, y: 400 }, data: { nodeType: 'endNode', label: '结束' } },
      ]);
    }
  });

  // Init from workflow data when loaded
  useState(() => {
    if (currentWorkflow) {
      initFromWorkflow();
    }
  });

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge({ ...connection, type: 'smoothstep' }, eds));
    },
    [setEdges],
  );

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setDrawerOpen(true);
    const nodeData = node.data as Record<string, any>;
    form.setFieldsValue({
      label: nodeData.label || '',
      ...getConfigFormValues(nodeData),
    });
  }, [form]);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setDrawerOpen(false);
  }, []);

  // Drag & drop
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      const position = {
        x: event.clientX - (reactFlowBounds?.left ?? 0) - 70,
        y: event.clientY - (reactFlowBounds?.top ?? 0) - 20,
      };

      const config = nodeTypeMap[type];
      const newNode: Node = {
        id: getId(),
        type,
        position,
        data: { nodeType: type, label: config?.label ?? type },
      };
      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes],
  );

  // Get config form initial values based on node type
  function getConfigFormValues(data: Record<string, any>) {
    const nodeType = data.nodeType;
    switch (nodeType) {
      case 'promptNode':
        return { prompt_id: data.prompt_id, prompt_version: data.prompt_version, variables: data.variables };
      case 'aiNode':
        return { model: data.model, provider: data.provider, temperature: data.temperature, max_tokens: data.max_tokens };
      case 'conditionNode':
        return { condition_expr: data.condition_expr };
      default:
        return {};
    }
  }

  // Handle node config form save
  const handleNodeConfigSave = () => {
    if (!selectedNode) return;
    const values = form.getFieldsValue();
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === selectedNode.id) {
          return { ...n, data: { ...n.data, label: values.label, ...values } };
        }
        return n;
      }),
    );
    setDrawerOpen(false);
    message.success('节点配置已更新');
  };

  // Save workflow
  const handleSave = async () => {
    const wfNodes: WFNode[] = nodes.map((n) => ({
      id: n.id,
      type: n.type ?? 'default',
      position: n.position,
      data: n.data as Record<string, any>,
    }));
    const wfEdges = edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: e.type ?? 'smoothstep',
    }));

    const data = {
      name: workflowName,
      config: { nodes: wfNodes, edges: wfEdges },
    };

    setSaving(true);
    try {
      if (id) {
        await updateWorkflow(id, data);
        message.success('保存成功');
      } else {
        const wf = await useWorkflowStore.getState().createWorkflow(data);
        message.success('创建成功');
        navigate(`/workflows/${wf.id}/editor`, { replace: true });
      }
    } catch {
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  // Publish
  const handlePublish = async () => {
    if (!id) return;
    try {
      await workflowAPI.publish(id);
      message.success('发布成功');
    } catch {
      message.error('发布失败');
    }
  };

  // Save as version
  const handleSaveVersion = async () => {
    if (!id) return;
    const wfNodes: WFNode[] = nodes.map((n) => ({
      id: n.id,
      type: n.type ?? 'default',
      position: n.position,
      data: n.data as Record<string, any>,
    }));
    const wfEdges = edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: e.type ?? 'smoothstep',
    }));
    try {
      await saveVersion(id, {
        definition: { nodes: wfNodes, edges: wfEdges },
        change_log: '手动保存版本',
      });
      message.success('版本已保存');
    } catch {
      message.error('版本保存失败');
    }
  };

  // Render config panel based on node type
  const renderNodeConfig = () => {
    if (!selectedNode) return null;
    const nodeType = (selectedNode.data as Record<string, any>).nodeType;

    return (
      <Form form={form} layout="vertical">
        <Form.Item name="label" label="节点名称">
          <Input />
        </Form.Item>
        {nodeType === 'promptNode' && (
          <>
            <Form.Item name="prompt_id" label="选择Prompt">
              <Input placeholder="Prompt ID" />
            </Form.Item>
            <Form.Item name="prompt_version" label="版本">
              <InputNumber placeholder="版本号" style={{ width: '100%' }} min={1} />
            </Form.Item>
          </>
        )}
        {nodeType === 'aiNode' && (
          <>
            <Form.Item name="provider" label="Provider">
              <Select options={[
                { label: 'OpenAI', value: 'openai' },
                { label: 'Anthropic', value: 'anthropic' },
                { label: 'Google', value: 'google' },
              ]} />
            </Form.Item>
            <Form.Item name="model" label="模型">
              <Input placeholder="如 gpt-4o" />
            </Form.Item>
            <Form.Item name="temperature" label="Temperature">
              <InputNumber min={0} max={2} step={0.1} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="max_tokens" label="Max Tokens">
              <InputNumber min={1} max={128000} style={{ width: '100%' }} />
            </Form.Item>
          </>
        )}
        {nodeType === 'conditionNode' && (
          <Form.Item name="condition_expr" label="条件表达式">
            <Input.TextArea rows={3} placeholder="如: input.score > 0.8" />
          </Form.Item>
        )}
        {nodeType === 'httpRequestNode' && (
          <>
            <Form.Item name="url" label="URL">
              <Input placeholder="https://api.example.com" />
            </Form.Item>
            <Form.Item name="method" label="Method">
              <Select options={[
                { label: 'GET', value: 'GET' },
                { label: 'POST', value: 'POST' },
                { label: 'PUT', value: 'PUT' },
                { label: 'DELETE', value: 'DELETE' },
              ]} />
            </Form.Item>
          </>
        )}
        {nodeType === 'codeNode' && (
          <Form.Item name="code" label="代码">
            <Input.TextArea rows={8} placeholder="// 输入执行代码" style={{ fontFamily: 'monospace' }} />
          </Form.Item>
        )}
        {nodeType === 'loopNode' && (
          <Form.Item name="loop_count" label="循环次数">
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
        )}
        <Form.Item>
          <Button type="primary" onClick={handleNodeConfigSave} style={{ width: '100%' }}>
            保存配置
          </Button>
        </Form.Item>
      </Form>
    );
  };

  return (
    <div style={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          background: '#fff',
          borderBottom: '1px solid #f0f0f0',
          flexShrink: 0,
        }}
      >
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/workflows')}>返回</Button>
          <Input
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            style={{ width: 250, fontWeight: 600 }}
            bordered={false}
          />
        </Space>
        <Space>
          <Button icon={<SaveOutlined />} loading={saving} onClick={handleSave}>保存</Button>
          <Button onClick={handleSaveVersion}>保存版本</Button>
          {id && <Button type="primary" icon={<SendOutlined />} onClick={handlePublish}>发布</Button>}
          <Button icon={<PlayCircleOutlined />}>运行</Button>
        </Space>
      </div>

      {/* Canvas */}
      <div ref={reactFlowWrapper} style={{ flex: 1 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          fitView
        >
          <Controls />
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} />

          {/* Left panel: node types */}
          <Panel position="top-left" style={{ padding: 8 }}>
            <div
              style={{
                background: '#fff',
                borderRadius: 8,
                padding: 12,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                width: 160,
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13 }}>节点面板</div>
              {NODE_TYPES_CONFIG.map((item) => (
                <div
                  key={item.type}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/reactflow', item.type);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  style={{
                    padding: '6px 8px',
                    marginBottom: 4,
                    borderRadius: 4,
                    background: '#fafafa',
                    border: '1px solid #f0f0f0',
                    cursor: 'grab',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 13,
                  }}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </Panel>
        </ReactFlow>
      </div>

      {/* Right config drawer */}
      <Drawer
        title="节点配置"
        placement="right"
        width={360}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        mask={false}
      >
        {renderNodeConfig()}
      </Drawer>
    </div>
  );
}
