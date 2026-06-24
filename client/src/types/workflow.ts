import type { Tag } from './prompt';

export interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, any>;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  data?: Record<string, any>;
}

export interface WorkflowDefinition {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  created_by: string;
  config: any;
  input_schema: any;
  output_schema: any;
  current_version: number;
  is_published: number;
  category: string;
  execution_count: number;
  avg_duration_ms: number;
  created_at: string;
  updated_at: string;
  tags?: Tag[];
}

export interface WorkflowVersion {
  id: string;
  workflow_id: string;
  version: number;
  definition: WorkflowDefinition;
  change_log: string;
  created_by: string;
  created_at: string;
}
