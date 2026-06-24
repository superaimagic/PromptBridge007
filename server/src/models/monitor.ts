import pool from '../config/database';
import { RowDataPacket } from 'mysql2';

// Use actual tables: metric_snapshots, workflow_executions, node_executions
// No monitor_data or monitor_alerts tables exist

export const getOverview = async (): Promise<any> => {
  // Get total prompts (non-deleted)
  const [promptRows] = await pool.query<RowDataPacket[]>(
    'SELECT COUNT(*) as total FROM prompts WHERE deleted_at IS NULL'
  );

  // Get total workflows (non-deleted)
  const [workflowRows] = await pool.query<RowDataPacket[]>(
    'SELECT COUNT(*) as total FROM workflows WHERE deleted_at IS NULL'
  );

  // Get total executions
  const [executionRows] = await pool.query<RowDataPacket[]>(
    'SELECT COUNT(*) as total FROM workflow_executions'
  );

  // Get recent executions (last 7 days)
  const [recentExecRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) as total FROM workflow_executions WHERE started_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`
  );

  // Get success rate
  const [successRows] = await pool.query<RowDataPacket[]>(
    `SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
     FROM workflow_executions WHERE started_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`
  );

  // Get avg duration
  const [durationRows] = await pool.query<RowDataPacket[]>(
    `SELECT AVG(total_duration_ms) as avg_duration FROM workflow_executions WHERE status = 'completed' AND total_duration_ms IS NOT NULL AND started_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`
  );

  // Get token consumption
  const [tokenRows] = await pool.query<RowDataPacket[]>(
    `SELECT SUM(token_consumed) as total_tokens, SUM(cost_usd) as total_cost FROM workflow_executions WHERE started_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`
  );

  // Get execution trend (last 7 days by day)
  const [trendRows] = await pool.query<RowDataPacket[]>(
    `SELECT DATE(started_at) as date, COUNT(*) as count,
       SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as success_count,
       SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as fail_count
     FROM workflow_executions
     WHERE started_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
     GROUP BY DATE(started_at) ORDER BY date ASC`
  );

  return {
    summary: {
      total_prompts: promptRows[0].total,
      total_workflows: workflowRows[0].total,
      total_executions: executionRows[0].total,
      recent_executions: recentExecRows[0].total,
      success_rate: successRows[0].total > 0
        ? Math.round((successRows[0].completed / successRows[0].total) * 100)
        : 0,
      avg_duration_ms: Math.round(durationRows[0]?.avg_duration || 0),
      total_tokens: tokenRows[0]?.total_tokens || 0,
      total_cost: parseFloat(tokenRows[0]?.total_cost || 0).toFixed(6),
    },
    trend: trendRows,
  };
};

export const getExecutionMetrics = async (
  startDate: string,
  endDate: string,
  groupBy: string
): Promise<any[]> => {
  const dateFormat = groupBy === 'hour' ? '%Y-%m-%d %H:00:00' : '%Y-%m-%d';

  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT DATE_FORMAT(started_at, ?) as period,
            COUNT(*) as count,
            AVG(total_duration_ms) as avg_duration,
            SUM(token_consumed) as total_tokens,
            SUM(cost_usd) as total_cost
     FROM workflow_executions
     WHERE started_at BETWEEN ? AND ?
     GROUP BY period
     ORDER BY period ASC`,
    [dateFormat, startDate, endDate]
  );
  return rows;
};

export const getNodeMetrics = async (
  startDate: string,
  endDate: string
): Promise<any[]> => {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT ne.node_type,
            COUNT(*) as count,
            AVG(ne.duration_ms) as avg_duration,
            SUM(ne.input_tokens + ne.output_tokens) as total_tokens,
            SUM(ne.cost_usd) as total_cost
     FROM node_executions ne
     JOIN workflow_executions we ON ne.execution_id = we.id
     WHERE we.started_at BETWEEN ? AND ?
     GROUP BY ne.node_type
     ORDER BY count DESC`,
    [startDate, endDate]
  );
  return rows;
};

export const recordMetricSnapshot = async (data: {
  id: string;
  entity_type: string;
  entity_id: string;
  metric_name: string;
  value: number;
  value_type: string;
  period_start: string;
  period_end: string;
  period_type: string;
  dimensions?: any;
}): Promise<void> => {
  const dimensionsJson = data.dimensions ? JSON.stringify(data.dimensions) : null;
  await pool.execute(
    `INSERT INTO metric_snapshots (id, entity_type, entity_id, metric_name, value, value_type, dimensions, period_start, period_end, period_type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.id, data.entity_type, data.entity_id, data.metric_name, data.value, data.value_type, dimensionsJson, data.period_start, data.period_end, data.period_type]
  );
};

export const getMetricSnapshots = async (
  entityType: string,
  entityId: string,
  metricName?: string,
  page: number = 1,
  pageSize: number = 20
): Promise<{ list: any[]; total: number }> => {
  const conditions: string[] = ['entity_type = ?', 'entity_id = ?'];
  const params: any[] = [entityType, entityId];

  if (metricName) {
    conditions.push('metric_name = ?');
    params.push(metricName);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  const offset = (page - 1) * pageSize;

  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) as total FROM metric_snapshots ${whereClause}`,
    params
  );

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM metric_snapshots ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  rows.forEach((row: any) => {
    if (typeof row.dimensions === 'string') {
      try { row.dimensions = JSON.parse(row.dimensions); } catch { /* keep */ }
    }
  });

  return { list: rows, total: countRows[0].total };
};
