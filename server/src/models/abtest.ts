import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';

export interface ABTest {
  id: string;
  name: string;
  description: string | null;
  target_id: string;
  target_type: string;
  variants: any[];
  traffic_split: any;
  split_strategy: string;
  primary_metric: string;
  secondary_metrics: any | null;
  min_sample_size: number;
  max_duration_days: number | null;
  significance_level: number;
  status: string;
  started_at: Date | null;
  ended_at: Date | null;
  winner: string | null;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface ABTestResult {
  id: string;
  test_id: string;
  variant_id: string;
  sample_size: number;
  metric_results: any;
  p_value: number | null;
  is_significant: number | null;
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

const ABTEST_JSON_FIELDS = ['variants', 'traffic_split', 'secondary_metrics'];
const RESULT_JSON_FIELDS = ['metric_results'];

export const findById = async (id: string): Promise<ABTest | null> => {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM ab_test_configs WHERE id = ?',
    [id]
  );
  if (rows.length === 0) return null;
  return parseJson(rows[0], ABTEST_JSON_FIELDS) as ABTest;
};

export const create = async (data: {
  id: string;
  name: string;
  description?: string;
  target_id: string;
  variants: any[];
  traffic_split?: any;
  split_strategy?: string;
  primary_metric: string;
  secondary_metrics?: any;
  min_sample_size?: number;
  max_duration_days?: number;
  significance_level?: number;
  created_by?: string;
}): Promise<ABTest> => {
  const variantsJson = JSON.stringify(data.variants);
  const trafficSplitJson = data.traffic_split ? JSON.stringify(data.traffic_split) : JSON.stringify(data.variants.reduce((acc: any, v: any, i: number) => { acc[v.id] = 1 / data.variants.length; return acc; }, {}));
  const secondaryMetricsJson = data.secondary_metrics ? JSON.stringify(data.secondary_metrics) : null;

  await pool.execute(
    `INSERT INTO ab_test_configs (id, name, description, target_id, variants, traffic_split, split_strategy, primary_metric, secondary_metrics, min_sample_size, max_duration_days, significance_level, status, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)`,
    [data.id, data.name, data.description || null, data.target_id, variantsJson, trafficSplitJson,
     data.split_strategy || 'random', data.primary_metric, secondaryMetricsJson,
     data.min_sample_size || 30, data.max_duration_days || null, data.significance_level || 0.05,
     data.created_by || null]
  );

  return (await findById(data.id))!;
};

export const update = async (id: string, data: Partial<ABTest>): Promise<ABTest | null> => {
  const fields: string[] = [];
  const values: any[] = [];

  const allowedFields = ['name', 'description', 'variants', 'traffic_split', 'secondary_metrics', 'winner'];
  const jsonFields = ['variants', 'traffic_split', 'secondary_metrics'];
  for (const field of allowedFields) {
    if ((data as any)[field] !== undefined) {
      fields.push(`${field} = ?`);
      const val = (data as any)[field];
      values.push(jsonFields.includes(field) && typeof val === 'object' ? JSON.stringify(val) : val);
    }
  }

  if (fields.length === 0) return findById(id);

  values.push(id);
  await pool.execute(
    `UPDATE ab_test_configs SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
  return findById(id);
};

export const start = async (id: string): Promise<ABTest | null> => {
  await pool.execute(
    "UPDATE ab_test_configs SET status = 'running', started_at = NOW() WHERE id = ?",
    [id]
  );
  return findById(id);
};

export const stop = async (id: string, winner?: string): Promise<ABTest | null> => {
  if (winner) {
    await pool.execute(
      "UPDATE ab_test_configs SET status = 'stopped', winner = ?, ended_at = NOW() WHERE id = ?",
      [winner, id]
    );
  } else {
    await pool.execute(
      "UPDATE ab_test_configs SET status = 'stopped', ended_at = NOW() WHERE id = ?",
      [id]
    );
  }
  return findById(id);
};

export const deleteById = async (id: string): Promise<boolean> => {
  await pool.execute('DELETE FROM ab_test_assignments WHERE test_id = ?', [id]);
  await pool.execute('DELETE FROM ab_test_results WHERE test_id = ?', [id]);
  const [result] = await pool.execute<ResultSetHeader>(
    'DELETE FROM ab_test_configs WHERE id = ?',
    [id]
  );
  return result.affectedRows > 0;
};

export const list = async (
  filters: { status?: string; target_id?: string },
  page: number,
  pageSize: number
): Promise<{ list: ABTest[]; total: number }> => {
  const conditions: string[] = [];
  const params: any[] = [];

  if (filters.status) {
    conditions.push('status = ?');
    params.push(filters.status);
  }
  if (filters.target_id) {
    conditions.push('target_id = ?');
    params.push(filters.target_id);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * pageSize;

  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) as total FROM ab_test_configs ${whereClause}`,
    params
  );
  const total = countRows[0].total;

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM ab_test_configs ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  rows.forEach((row: any) => parseJson(row, ABTEST_JSON_FIELDS));

  return { list: rows as ABTest[], total };
};

export const addResult = async (data: {
  id: string;
  test_id: string;
  variant_id: string;
  sample_size: number;
  metric_results: any;
  p_value?: number;
  is_significant?: boolean;
}): Promise<ABTestResult> => {
  const metricResultsJson = typeof data.metric_results === 'object' ? JSON.stringify(data.metric_results) : data.metric_results;

  await pool.execute(
    'INSERT INTO ab_test_results (id, test_id, variant_id, sample_size, metric_results, p_value, is_significant) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [data.id, data.test_id, data.variant_id, data.sample_size, metricResultsJson, data.p_value || null, data.is_significant ? 1 : 0]
  );

  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM ab_test_results WHERE id = ?',
    [data.id]
  );
  return parseJson(rows[0], RESULT_JSON_FIELDS) as ABTestResult;
};

export const getResults = async (testId: string): Promise<ABTestResult[]> => {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM ab_test_results WHERE test_id = ? ORDER BY created_at ASC',
    [testId]
  );
  rows.forEach((row: any) => parseJson(row, RESULT_JSON_FIELDS));
  return rows as ABTestResult[];
};

export const getStats = async (testId: string): Promise<any> => {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT variant_id, SUM(sample_size) as total_sample, AVG(p_value) as avg_p_value FROM ab_test_results WHERE test_id = ? GROUP BY variant_id`,
    [testId]
  );
  return rows;
};
