import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';

export interface Workflow {
  id: string;
  name: string;
  description: string | null;
  workspace_id: string | null;
  created_by: string | null;
  config: any | null;
  input_schema: any | null;
  output_schema: any | null;
  current_version: number;
  is_published: number;
  category: string | null;
  role_id: string | null;
  execution_count: number;
  avg_duration_ms: number | null;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
  tags?: any[]; // populated from workflow_tags join
}

export interface WorkflowVersion {
  id: string;
  workflow_id: string;
  version: number;
  definition: any;
  change_log: string | null;
  created_by: string | null;
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

const WORKFLOW_JSON_FIELDS = ['config', 'input_schema', 'output_schema'];

export const findById = async (id: string): Promise<Workflow | null> => {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM workflows WHERE id = ? AND deleted_at IS NULL',
    [id]
  );
  if (rows.length === 0) return null;
  const row = parseJson(rows[0], WORKFLOW_JSON_FIELDS);

  // Get tags via workflow_tags join
  const [tagRows] = await pool.execute<RowDataPacket[]>(
    `SELECT t.* FROM tags t JOIN workflow_tags wt ON t.id = wt.tag_id WHERE wt.workflow_id = ?`,
    [id]
  );
  row.tags = tagRows;
  return row as Workflow;
};

export const create = async (data: {
  id: string;
  name: string;
  description?: string;
  config?: any;
  input_schema?: any;
  output_schema?: any;
  workspace_id?: string;
  category?: string;
  role_id?: string;
  tag_ids?: string[];
  created_by: string;
}): Promise<Workflow> => {
  const configJson = data.config ? JSON.stringify(data.config) : null;
  const inputSchemaJson = data.input_schema ? JSON.stringify(data.input_schema) : null;
  const outputSchemaJson = data.output_schema ? JSON.stringify(data.output_schema) : null;

  await pool.execute(
    `INSERT INTO workflows (id, name, description, workspace_id, created_by, config, input_schema, output_schema, current_version, is_published, category, role_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)`,
    [data.id, data.name, data.description || null, data.workspace_id || null, data.created_by,
     configJson, inputSchemaJson, outputSchemaJson, data.category || null, data.role_id || null]
  );

  // Create workflow_tags relations
  if (data.tag_ids && data.tag_ids.length > 0) {
    for (const tagId of data.tag_ids) {
      await pool.execute(
        'INSERT INTO workflow_tags (workflow_id, tag_id) VALUES (?, ?)',
        [data.id, tagId]
      );
    }
  }

  // Auto-create first version
  const versionId = uuidv4();
  const definitionJson = JSON.stringify({ config: data.config, input_schema: data.input_schema, output_schema: data.output_schema });
  await pool.execute(
    `INSERT INTO workflow_versions (id, workflow_id, version, definition, change_log, created_by)
     VALUES (?, ?, 1, ?, 'Initial version', ?)`,
    [versionId, data.id, definitionJson, data.created_by]
  );

  return (await findById(data.id))!;
};

export const update = async (
  id: string,
  data: {
    name?: string;
    description?: string;
    config?: any;
    input_schema?: any;
    output_schema?: any;
    category?: string;
    role_id?: string;
    tag_ids?: string[];
    changelog?: string;
  },
  userId: string
): Promise<Workflow | null> => {
  const current = await findById(id);
  if (!current) return null;

  const newVersion = current.current_version + 1;
  const name = data.name !== undefined ? data.name : current.name;
  const description = data.description !== undefined ? data.description : current.description;
  const config = data.config !== undefined ? data.config : current.config;
  const input_schema = data.input_schema !== undefined ? data.input_schema : current.input_schema;
  const output_schema = data.output_schema !== undefined ? data.output_schema : current.output_schema;
  const category = data.category !== undefined ? data.category : current.category;
  const role_id = data.role_id !== undefined ? data.role_id : current.role_id;

  const configJson = config ? JSON.stringify(config) : null;
  const inputSchemaJson = input_schema ? JSON.stringify(input_schema) : null;
  const outputSchemaJson = output_schema ? JSON.stringify(output_schema) : null;

  await pool.execute(
    `UPDATE workflows SET name = ?, description = ?, config = ?, input_schema = ?, output_schema = ?, current_version = ?, category = ?, role_id = ? WHERE id = ?`,
    [name, description, configJson, inputSchemaJson, outputSchemaJson, newVersion, category, role_id, id]
  );

  // Create new version
  const versionId = uuidv4();
  const definitionJson = JSON.stringify({ config, input_schema, output_schema });
  await pool.execute(
    `INSERT INTO workflow_versions (id, workflow_id, version, definition, change_log, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [versionId, id, newVersion, definitionJson, data.changelog || null, userId]
  );

  // Update tag relations if provided
  if (data.tag_ids !== undefined) {
    await pool.execute('DELETE FROM workflow_tags WHERE workflow_id = ?', [id]);
    for (const tagId of data.tag_ids) {
      await pool.execute(
        'INSERT INTO workflow_tags (workflow_id, tag_id) VALUES (?, ?)',
        [id, tagId]
      );
    }
  }

  return findById(id);
};

export const publish = async (id: string): Promise<Workflow | null> => {
  await pool.execute(
    'UPDATE workflows SET is_published = 1 WHERE id = ?',
    [id]
  );
  return findById(id);
};

export const unpublish = async (id: string): Promise<Workflow | null> => {
  await pool.execute(
    'UPDATE workflows SET is_published = 0 WHERE id = ?',
    [id]
  );
  return findById(id);
};

export const softDelete = async (id: string): Promise<boolean> => {
  const [result] = await pool.execute<ResultSetHeader>(
    'UPDATE workflows SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL',
    [id]
  );
  return result.affectedRows > 0;
};

export const deleteById = async (id: string): Promise<boolean> => {
  await pool.execute('DELETE FROM workflow_tags WHERE workflow_id = ?', [id]);
  await pool.execute('DELETE FROM workflow_versions WHERE workflow_id = ?', [id]);
  const [result] = await pool.execute<ResultSetHeader>(
    'DELETE FROM workflows WHERE id = ?',
    [id]
  );
  return result.affectedRows > 0;
};

export const list = async (
  filters: { is_published?: number; search?: string; category?: string; workspace_id?: string },
  page: number,
  pageSize: number
): Promise<{ list: Workflow[]; total: number }> => {
  const conditions: string[] = ['deleted_at IS NULL'];
  const params: any[] = [];

  if (filters.is_published !== undefined) {
    conditions.push('is_published = ?');
    params.push(filters.is_published);
  }
  if (filters.search) {
    conditions.push('(name LIKE ? OR description LIKE ?)');
    const term = `%${filters.search}%`;
    params.push(term, term);
  }
  if (filters.category) {
    conditions.push('category = ?');
    params.push(filters.category);
  }
  if (filters.workspace_id) {
    conditions.push('workspace_id = ?');
    params.push(filters.workspace_id);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  const offset = (page - 1) * pageSize;

  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) as total FROM workflows ${whereClause}`,
    params
  );
  const total = countRows[0].total;

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM workflows ${whereClause} ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  rows.forEach((row: any) => parseJson(row, WORKFLOW_JSON_FIELDS));

  // Get tags for each workflow
  for (const row of rows) {
    const [tagRows] = await pool.execute<RowDataPacket[]>(
      `SELECT t.* FROM tags t JOIN workflow_tags wt ON t.id = wt.tag_id WHERE wt.workflow_id = ?`,
      [row.id]
    );
    row.tags = tagRows;
  }

  return { list: rows as Workflow[], total };
};

export const getVersions = async (workflowId: string): Promise<WorkflowVersion[]> => {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM workflow_versions WHERE workflow_id = ? ORDER BY version DESC',
    [workflowId]
  );
  rows.forEach((row: any) => {
    if (typeof row.definition === 'string') {
      try { row.definition = JSON.parse(row.definition); } catch { /* keep */ }
    }
  });
  return rows as WorkflowVersion[];
};

export const saveVersion = async (
  workflowId: string,
  data: { name?: string; description?: string; definition: any; changelog?: string },
  userId: string
): Promise<WorkflowVersion> => {
  const current = await findById(workflowId);
  const newVersion = (current?.current_version || 0) + 1;
  const definitionJson = data.definition ? JSON.stringify(data.definition) : null;
  const versionId = uuidv4();

  await pool.execute(
    'INSERT INTO workflow_versions (id, workflow_id, version, definition, change_log, created_by) VALUES (?, ?, ?, ?, ?, ?)',
    [versionId, workflowId, newVersion, definitionJson, data.changelog || null, userId]
  );

  // Update current_version on workflow
  await pool.execute(
    'UPDATE workflows SET current_version = ? WHERE id = ?',
    [newVersion, workflowId]
  );

  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM workflow_versions WHERE id = ?',
    [versionId]
  );
  const row = rows[0];
  if (typeof row.definition === 'string') {
    try { row.definition = JSON.parse(row.definition); } catch { /* keep */ }
  }
  return row as WorkflowVersion;
};
