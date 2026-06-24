import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';

export interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  icon: string | null;
  created_at: Date;
  updated_at: Date;
}

export const findById = async (id: string): Promise<Category | null> => {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM categories WHERE id = ?',
    [id]
  );
  return rows.length > 0 ? rows[0] as Category : null;
};

export const create = async (data: {
  name: string;
  parent_id?: string;
  sort_order?: number;
  icon?: string;
}): Promise<Category> => {
  const id = uuidv4();
  await pool.execute(
    'INSERT INTO categories (id, name, parent_id, sort_order, icon) VALUES (?, ?, ?, ?, ?)',
    [id, data.name, data.parent_id || null, data.sort_order || 0, data.icon || null]
  );
  return (await findById(id))!;
};

export const update = async (id: string, data: {
  name?: string;
  parent_id?: string;
  sort_order?: number;
  icon?: string;
}): Promise<Category | null> => {
  const fields: string[] = [];
  const values: any[] = [];
  const allowedFields = ['name', 'parent_id', 'sort_order', 'icon'] as const;
  for (const field of allowedFields) {
    if ((data as any)[field] !== undefined) {
      fields.push(`${field} = ?`);
      values.push((data as any)[field]);
    }
  }
  if (fields.length === 0) return findById(id);
  values.push(id);
  await pool.execute(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`, values);
  return findById(id);
};

export const deleteById = async (id: string): Promise<boolean> => {
  // Move children to parent
  const category = await findById(id);
  if (!category) return false;
  // Update children's parent_id
  await pool.execute(
    'UPDATE categories SET parent_id = ? WHERE parent_id = ?',
    [category.parent_id, id]
  );
  const [result] = await pool.execute<ResultSetHeader>(
    'DELETE FROM categories WHERE id = ?',
    [id]
  );
  return result.affectedRows > 0;
};

export const list = async (filters: { parent_id?: string }): Promise<Category[]> => {
  const conditions: string[] = [];
  const params: any[] = [];

  if (filters.parent_id !== undefined) {
    if (filters.parent_id === 'null' || filters.parent_id === '') {
      conditions.push('parent_id IS NULL');
    } else {
      conditions.push('parent_id = ?');
      params.push(filters.parent_id);
    }
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM categories ${whereClause} ORDER BY sort_order ASC, created_at ASC`,
    params
  );
  return rows as Category[];
};

export const getTree = async (): Promise<any[]> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM categories ORDER BY sort_order ASC, created_at ASC'
  );
  // Build tree
  const map: any = {};
  const roots: any[] = [];
  for (const row of rows) {
    map[row.id] = { ...row, children: [] };
  }
  for (const row of rows) {
    if (row.parent_id && map[row.parent_id]) {
      map[row.parent_id].children.push(map[row.id]);
    } else {
      roots.push(map[row.id]);
    }
  }
  return roots;
};
