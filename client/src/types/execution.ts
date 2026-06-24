export interface Execution {
  id: string;
  workflow_id: string;
  workflow_version: number;
  trigger_type: string;
  triggered_by: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused' | 'cancelled';
  started_at: string;
  finished_at: string;
  total_duration_ms: number;
  input_data: any;
  output_data: any;
  error_message: string;
  node_count: number;
  token_consumed: number;
  cost_usd: number;
  created_at: string;
}

export interface NodeExecution {
  id: string;
  execution_id: string;
  node_id: string;
  node_type: string;
  status: string;
  started_at: string;
  finished_at: string;
  duration_ms: number;
  input_data: any;
  output_data: any;
  model_id: string;
  provider: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  error_message: string;
}
