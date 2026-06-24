import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';

export interface Execution {
  id: string;
  workflow_id: string;
  workflow_version: number;
  trigger_type: string;
  triggered_by: string | null;
  trigger_context: any | null;
  status: string;
  started_at: Date;
  finished_at: Date | null;
  total_duration_ms: number | null;
  input_data: any | null;
  output_data: any | null;
  error_message: string | null;
  node_count: number | null;
  token_consumed: number;
  cost_usd: number;
  created_at: Date;
}

export interface NodeExecution {
  id: string;
  execution_id: string;
  node_id: string;
  node_type: string;
  status: string;
  started_at: Date;
  finished_at: Date | null;
  duration_ms: number | null;
  input_data: any | null;
  output_data: any | null;
  model_id: string | null;
  provider: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  latency_ms: number | null;
  cost_usd: number | null;
  error_type: string | null;
  error_message: string | null;
  retry_count: number;
  created_at: Date;
}

const parseJson = (row: any, fields: string[]) => {
  for (const field of fields) {
    if (typeof row[field] === 'string') {
      try { row[field] = JSON.parse(row[field]); } catch { /* keep as string */ }
    }
  }
  return row;
};

export const findById = async (id: string): Promise<Execution | null> => {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM workflow_executions WHERE id = ?',
    [id]
  );
  if (rows.length === 0) return null;
  return parseJson(rows[0], ['trigger_context', 'input_data', 'output_data']) as Execution;
};

export const create = async (data: {
  id: string;
  workflow_id: string;
  workflow_version?: number;
  trigger_type?: string;
  triggered_by?: string;
  input?: any;
}): Promise<Execution> => {
  const inputJson = data.input ? JSON.stringify(data.input) : null;

  await pool.execute(
    `INSERT INTO workflow_executions (id, workflow_id, workflow_version, trigger_type, triggered_by, status, started_at, input_data)
     VALUES (?, ?, ?, ?, ?, 'pending', NOW(), ?)`,
    [data.id, data.workflow_id, data.workflow_version || 1, data.trigger_type || 'manual', data.triggered_by || null, inputJson]
  );

  return (await findById(data.id))!;
};

export const updateStatus = async (
  id: string,
  status: string,
  data?: { output?: any; error_message?: string; finished_at?: Date }
): Promise<void> => {
  const outputJson = data?.output ? JSON.stringify(data.output) : null;
  const finishedAt = data?.finished_at || (['completed', 'failed', 'cancelled'].includes(status) ? new Date() : null);

  await pool.execute(
    'UPDATE workflow_executions SET status = ?, output_data = ?, error_message = ?, finished_at = ? WHERE id = ?',
    [status, outputJson, data?.error_message || null, finishedAt, id]
  );
};

export const createNodeExecution = async (data: {
  id: string;
  execution_id: string;
  node_id: string;
  node_type: string;
  input?: any;
}): Promise<NodeExecution> => {
  const inputJson = data.input ? JSON.stringify(data.input) : null;

  await pool.execute(
    `INSERT INTO node_executions (id, execution_id, node_id, node_type, status, started_at, input_data)
     VALUES (?, ?, ?, ?, 'pending', NOW(), ?)`,
    [data.id, data.execution_id, data.node_id, data.node_type, inputJson]
  );

  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM node_executions WHERE id = ?',
    [data.id]
  );
  return parseJson(rows[0], ['input_data', 'output_data']) as NodeExecution;
};

export const updateNodeExecution = async (
  id: string,
  data: { status: string; output?: any; error_message?: string; duration_ms?: number; finished_at?: Date }
): Promise<void> => {
  const outputJson = data.output ? JSON.stringify(data.output) : null;
  const finishedAt = data.finished_at || (['completed', 'failed', 'skipped'].includes(data.status) ? new Date() : null);

  await pool.execute(
    'UPDATE node_executions SET status = ?, output_data = ?, error_message = ?, duration_ms = ?, finished_at = ? WHERE id = ?',
    [data.status, outputJson, data.error_message || null, data.duration_ms || null, finishedAt, id]
  );
};

export const listByWorkflow = async (
  workflowId: string,
  page: number,
  pageSize: number
): Promise<{ list: Execution[]; total: number }> => {
  const offset = (page - 1) * pageSize;

  const [countRows] = await pool.query<RowDataPacket[]>(
    'SELECT COUNT(*) as total FROM workflow_executions WHERE workflow_id = ?',
    [workflowId]
  );
  const total = countRows[0].total;

  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM workflow_executions WHERE workflow_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [workflowId, pageSize, offset]
  );

  rows.forEach((row: any) => parseJson(row, ['trigger_context', 'input_data', 'output_data']));

  return { list: rows as Execution[], total };
};

export const getNodeExecutions = async (executionId: string): Promise<NodeExecution[]> => {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM node_executions WHERE execution_id = ? ORDER BY started_at ASC',
    [executionId]
  );
  rows.forEach((row: any) => parseJson(row, ['input_data', 'output_data']));
  return rows as NodeExecution[];
};
