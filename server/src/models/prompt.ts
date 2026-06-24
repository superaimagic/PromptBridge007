import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';

export interface Prompt {
  id: string;
  title: string;
  description: string | null;
  content: string;
  variables: any[] | null;
  model_config: any | null;
  current_version: number;
  workspace_id: string | null;
  created_by: string | null;
  category_id: string | null;
  visibility: 'private' | 'workspace' | 'public';
  metrics: any | null;
  metadata: any | null;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
  tags?: any[]; // populated from prompt_tags join
}

export interface PromptVersion {
  id: string;
  prompt_id: string;
  version: number;
  version_tag: string | null;
  content: string;
  variables: any[] | null;
  model_config: any | null;
  change_type: string;
  change_log: string | null;
  execution_count: number;
  avg_score: number | null;
  is_stable: number;
  is_current: number;
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

const PROMPT_JSON_FIELDS = ['variables', 'model_config', 'metrics', 'metadata'];
const VERSION_JSON_FIELDS = ['variables', 'model_config'];

export const findById = async (id: string): Promise<Prompt | null> => {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM prompts WHERE id = ? AND deleted_at IS NULL',
    [id]
  );
  if (rows.length === 0) return null;
  const row = parseJson(rows[0], PROMPT_JSON_FIELDS);

  // Get tags via prompt_tags join
  const [tagRows] = await pool.execute<RowDataPacket[]>(
    `SELECT t.* FROM tags t JOIN prompt_tags pt ON t.id = pt.tag_id WHERE pt.prompt_id = ?`,
    [id]
  );
  row.tags = tagRows;
  return row as Prompt;
};

export const create = async (data: {
  id: string;
  title: string;
  content: string;
  description?: string;
  category_id?: string;
  tag_ids?: string[];
  variables?: any[];
  model_config?: any;
  visibility?: string;
  workspace_id?: string;
  created_by: string;
}): Promise<Prompt> => {
  const variablesJson = data.variables ? JSON.stringify(data.variables) : null;
  const modelConfigJson = data.model_config ? JSON.stringify(data.model_config) : null;

  await pool.execute(
    `INSERT INTO prompts (id, title, content, description, variables, model_config, current_version, workspace_id, created_by, category_id, visibility)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`,
    [data.id, data.title, data.content, data.description || null, variablesJson, modelConfigJson,
     data.workspace_id || null, data.created_by, data.category_id || null, data.visibility || 'private']
  );

  // Create prompt_tags relations
  if (data.tag_ids && data.tag_ids.length > 0) {
    for (const tagId of data.tag_ids) {
      await pool.execute(
        'INSERT INTO prompt_tags (prompt_id, tag_id) VALUES (?, ?)',
        [data.id, tagId]
      );
    }
  }

  // Auto-create first version
  const versionId = uuidv4();
  await pool.execute(
    `INSERT INTO prompt_versions (id, prompt_id, version, content, variables, model_config, change_type, change_log, is_current, created_by)
     VALUES (?, ?, 1, ?, ?, ?, 'create', ?, 1, ?)`,
    [versionId, data.id, data.content, variablesJson, modelConfigJson, 'Initial version', data.created_by]
  );

  return (await findById(data.id))!;
};

export const update = async (
  id: string,
  data: {
    title?: string;
    content?: string;
    description?: string;
    category_id?: string;
    tag_ids?: string[];
    variables?: any[];
    model_config?: any;
    visibility?: string;
    changelog?: string;
  },
  userId: string
): Promise<Prompt | null> => {
  const current = await findById(id);
  if (!current) return null;

  const newVersion = current.current_version + 1;
  const title = data.title !== undefined ? data.title : current.title;
  const content = data.content !== undefined ? data.content : current.content;
  const description = data.description !== undefined ? data.description : current.description;
  const category_id = data.category_id !== undefined ? data.category_id : current.category_id;
  const variables = data.variables !== undefined ? data.variables : current.variables;
  const model_config = data.model_config !== undefined ? data.model_config : current.model_config;
  const visibility = data.visibility !== undefined ? data.visibility : current.visibility;

  const variablesJson = variables ? JSON.stringify(variables) : null;
  const modelConfigJson = model_config ? JSON.stringify(model_config) : null;

  await pool.execute(
    `UPDATE prompts SET title = ?, content = ?, description = ?, category_id = ?, variables = ?, model_config = ?, visibility = ?, current_version = ? WHERE id = ?`,
    [title, content, description, category_id, variablesJson, modelConfigJson, visibility, newVersion, id]
  );

  // Create new version
  const versionId = uuidv4();
  await pool.execute(
    `INSERT INTO prompt_versions (id, prompt_id, version, content, variables, model_config, change_type, change_log, is_current, created_by)
     VALUES (?, ?, ?, ?, ?, ?, 'update', ?, 1, ?)`,
    [versionId, id, newVersion, content, variablesJson, modelConfigJson, data.changelog || null, userId]
  );

  // Reset is_current on old versions
  await pool.execute(
    'UPDATE prompt_versions SET is_current = 0 WHERE prompt_id = ? AND id != ?',
    [id, versionId]
  );

  // Update tag relations if provided
  if (data.tag_ids !== undefined) {
    await pool.execute('DELETE FROM prompt_tags WHERE prompt_id = ?', [id]);
    for (const tagId of data.tag_ids) {
      await pool.execute(
        'INSERT INTO prompt_tags (prompt_id, tag_id) VALUES (?, ?)',
        [id, tagId]
      );
    }
  }

  return findById(id);
};

export const softDelete = async (id: string): Promise<boolean> => {
  const [result] = await pool.execute<ResultSetHeader>(
    'UPDATE prompts SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL',
    [id]
  );
  return result.affectedRows > 0;
};

export const deleteById = async (id: string): Promise<boolean> => {
  await pool.execute('DELETE FROM prompt_tags WHERE prompt_id = ?', [id]);
  await pool.execute('DELETE FROM prompt_versions WHERE prompt_id = ?', [id]);
  const [result] = await pool.execute<ResultSetHeader>(
    'DELETE FROM prompts WHERE id = ?',
    [id]
  );
  return result.affectedRows > 0;
};

export const list = async (
  filters: { category_id?: string; visibility?: string; search?: string; workspace_id?: string },
  page: number,
  pageSize: number
): Promise<{ list: Prompt[]; total: number }> => {
  const conditions: string[] = ['deleted_at IS NULL'];
  const params: any[] = [];

  if (filters.category_id) {
    conditions.push('category_id = ?');
    params.push(filters.category_id);
  }
  if (filters.visibility) {
    conditions.push('visibility = ?');
    params.push(filters.visibility);
  }
  if (filters.search) {
    conditions.push('(title LIKE ? OR content LIKE ? OR description LIKE ?)');
    const term = `%${filters.search}%`;
    params.push(term, term, term);
  }
  if (filters.workspace_id) {
    conditions.push('workspace_id = ?');
    params.push(filters.workspace_id);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  const offset = (page - 1) * pageSize;

  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) as total FROM prompts ${whereClause}`,
    params
  );
  const total = countRows[0].total;

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM prompts ${whereClause} ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  rows.forEach((row: any) => parseJson(row, PROMPT_JSON_FIELDS));

  // Get tags for each prompt
  for (const row of rows) {
    const [tagRows] = await pool.execute<RowDataPacket[]>(
      `SELECT t.* FROM tags t JOIN prompt_tags pt ON t.id = pt.tag_id WHERE pt.prompt_id = ?`,
      [row.id]
    );
    row.tags = tagRows;
  }

  return { list: rows as Prompt[], total };
};

export const getVersions = async (promptId: string): Promise<PromptVersion[]> => {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM prompt_versions WHERE prompt_id = ? ORDER BY version DESC',
    [promptId]
  );
  rows.forEach((row: any) => parseJson(row, VERSION_JSON_FIELDS));
  return rows as PromptVersion[];
};

export const getVersion = async (promptId: string, version: number): Promise<PromptVersion | null> => {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM prompt_versions WHERE prompt_id = ? AND version = ?',
    [promptId, version]
  );
  if (rows.length === 0) return null;
  return parseJson(rows[0], VERSION_JSON_FIELDS) as PromptVersion;
};
