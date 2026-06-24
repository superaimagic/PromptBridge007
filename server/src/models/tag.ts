import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';

export interface Tag {
  id: string;
  name: string;
  color: string;
  created_at: Date;
}

export const findById = async (id: string): Promise<Tag | null> => {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM tags WHERE id = ?',
    [id]
  );
  return rows.length > 0 ? rows[0] as Tag : null;
};

export const findByName = async (name: string): Promise<Tag | null> => {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM tags WHERE name = ?',
    [name]
  );
  return rows.length > 0 ? rows[0] as Tag : null;
};

export const create = async (data: {
  name: string;
  color?: string;
}): Promise<Tag> => {
  const id = uuidv4();
  await pool.execute(
    'INSERT INTO tags (id, name, color) VALUES (?, ?, ?)',
    [id, data.name, data.color || '#1890ff']
  );
  return (await findById(id))!;
};

export const update = async (id: string, data: {
  name?: string;
  color?: string;
}): Promise<Tag | null> => {
  const fields: string[] = [];
  const values: any[] = [];
  const allowedFields = ['name', 'color'] as const;
  for (const field of allowedFields) {
    if ((data as any)[field] !== undefined) {
      fields.push(`${field} = ?`);
      values.push((data as any)[field]);
    }
  }
  if (fields.length === 0) return findById(id);
  values.push(id);
  await pool.execute(`UPDATE tags SET ${fields.join(', ')} WHERE id = ?`, values);
  return findById(id);
};

export const deleteById = async (id: string): Promise<boolean> => {
  await pool.execute('DELETE FROM prompt_tags WHERE tag_id = ?', [id]);
  await pool.execute('DELETE FROM workflow_tags WHERE tag_id = ?', [id]);
  const [result] = await pool.execute<ResultSetHeader>(
    'DELETE FROM tags WHERE id = ?',
    [id]
  );
  return result.affectedRows > 0;
};

export const list = async (filters: { search?: string }): Promise<Tag[]> => {
  const conditions: string[] = [];
  const params: any[] = [];

  if (filters.search) {
    conditions.push('name LIKE ?');
    params.push(`%${filters.search}%`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM tags ${whereClause} ORDER BY created_at ASC`,
    params
  );
  return rows as Tag[];
};
