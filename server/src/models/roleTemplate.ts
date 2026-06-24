import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

const parseJson = (row: any, fields: string[]) => {
  for (const field of fields) {
    if (typeof row[field] === 'string') {
      try { row[field] = JSON.parse(row[field]); } catch { /* keep as string */ }
    }
  }
  return row;
};

export const findById = async (id: string): Promise<any | null> => {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM role_templates WHERE id = ?',
    [id]
  );
  if (rows.length === 0) return null;
  return parseJson(rows[0], ['workflow_ids', 'prompt_ids', 'metrics_config']);
};

export const create = async (data: {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  icon?: string;
  workflow_ids?: string[];
  prompt_ids?: string[];
  metrics_config?: any;
  is_builtin?: number;
  sort_order?: number;
  created_by?: string;
}): Promise<any> => {
  await pool.execute(
    `INSERT INTO role_templates (id, name, display_name, description, icon, workflow_ids, prompt_ids, metrics_config, is_builtin, sort_order, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.id, data.name, data.display_name, data.description || null, data.icon || null,
      JSON.stringify(data.workflow_ids || []),
      JSON.stringify(data.prompt_ids || []),
      JSON.stringify(data.metrics_config || {}),
      data.is_builtin || 0, data.sort_order || 0, data.created_by || null
    ]
  );
  return findById(data.id);
};

export const update = async (id: string, data: any): Promise<any | null> => {
  const fields: string[] = [];
  const values: any[] = [];
  const jsonFields = ['workflow_ids', 'prompt_ids', 'metrics_config'];
  const allowedFields = ['name', 'display_name', 'description', 'icon', 'workflow_ids', 'prompt_ids', 'metrics_config', 'sort_order'];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      fields.push(`${field} = ?`);
      const val = data[field];
      values.push(jsonFields.includes(field) && typeof val === 'object' ? JSON.stringify(val) : val);
    }
  }

  if (fields.length === 0) return findById(id);
  values.push(id);
  await pool.execute(`UPDATE role_templates SET ${fields.join(', ')} WHERE id = ?`, values);
  return findById(id);
};

export const deleteById = async (id: string): Promise<boolean> => {
  const [result] = await pool.execute<ResultSetHeader>(
    'DELETE FROM role_templates WHERE id = ? AND is_builtin = 0',
    [id]
  );
  return result.affectedRows > 0;
};

export const list = async (
  filters: { search?: string },
  page: number,
  pageSize: number
): Promise<{ list: any[]; total: number }> => {
  const conditions: string[] = [];
  const params: any[] = [];

  if (filters.search) {
    conditions.push('(name LIKE ? OR display_name LIKE ? OR description LIKE ?)');
    const term = `%${filters.search}%`;
    params.push(term, term, term);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * pageSize;

  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) as total FROM role_templates ${whereClause}`,
    params
  );
  const total = countRows[0].total;

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM role_templates ${whereClause} ORDER BY sort_order ASC, created_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  rows.forEach((row: any) => parseJson(row, ['workflow_ids', 'prompt_ids', 'metrics_config']));
  return { list: rows, total };
};
