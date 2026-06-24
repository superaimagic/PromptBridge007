import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface User {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  nickname: string | null;
  avatar: string | null;
  status: number; // 1=active, 0=disabled
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  roles?: { id: string; name: string; display_name: string }[];
}

const mapUser = (row: any): any => {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    password_hash: row.password_hash,
    nickname: row.nickname,
    avatar: row.avatar,
    status: row.status,
    last_login_at: row.last_login_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
};

export const findById = async (id: string): Promise<any | null> => {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM users WHERE id = ? AND deleted_at IS NULL',
    [id]
  );
  if (rows.length === 0) return null;
  const user = mapUser(rows[0]);
  // Get user roles
  const [roleRows] = await pool.execute<RowDataPacket[]>(
    `SELECT r.id, r.name, r.display_name FROM roles r
     JOIN user_roles ur ON r.id = ur.role_id
     WHERE ur.user_id = ?`,
    [id]
  );
  user.roles = roleRows;
  return user;
};

export const findByIdWithPassword = async (id: string): Promise<any | null> => {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM users WHERE id = ? AND deleted_at IS NULL',
    [id]
  );
  return rows.length > 0 ? mapUser(rows[0]) : null;
};

export const findByUsername = async (username: string): Promise<any | null> => {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM users WHERE username = ? AND deleted_at IS NULL',
    [username]
  );
  if (rows.length === 0) return null;
  const user = mapUser(rows[0]);
  const [roleRows] = await pool.execute<RowDataPacket[]>(
    `SELECT r.id, r.name, r.display_name FROM roles r
     JOIN user_roles ur ON r.id = ur.role_id
     WHERE ur.user_id = ?`,
    [user.id]
  );
  user.roles = roleRows;
  return user;
};

export const findByEmail = async (email: string): Promise<any | null> => {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM users WHERE email = ? AND deleted_at IS NULL',
    [email]
  );
  if (rows.length === 0) return null;
  const user = mapUser(rows[0]);
  const [roleRows] = await pool.execute<RowDataPacket[]>(
    `SELECT r.id, r.name, r.display_name FROM roles r
     JOIN user_roles ur ON r.id = ur.role_id
     WHERE ur.user_id = ?`,
    [user.id]
  );
  user.roles = roleRows;
  return user;
};

export const create = async (data: {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  nickname?: string;
  roleNames?: string[]; // e.g. ['PROMPT_EDITOR']
}): Promise<any> => {
  await pool.execute(
    'INSERT INTO users (id, username, email, password_hash, nickname, status) VALUES (?, ?, ?, ?, ?, 1)',
    [data.id, data.username, data.email, data.password_hash, data.nickname || null]
  );

  // Assign default role
  const roleNames = data.roleNames || ['PROMPT_EDITOR'];
  for (const roleName of roleNames) {
    const [roleRows] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM roles WHERE name = ?',
      [roleName]
    );
    if (roleRows.length > 0) {
      const { v4: uuidv4 } = require('uuid');
      await pool.execute(
        'INSERT INTO user_roles (id, user_id, role_id) VALUES (?, ?, ?)',
        [uuidv4(), data.id, roleRows[0].id]
      );
    }
  }

  return findById(data.id);
};

export const update = async (id: string, data: Partial<{ nickname: string; avatar: string; password_hash: string }>): Promise<any | null> => {
  const fields: string[] = [];
  const values: any[] = [];

  const allowedFields = ['nickname', 'avatar', 'password_hash'] as const;
  for (const field of allowedFields) {
    if ((data as any)[field] !== undefined) {
      fields.push(`${field} = ?`);
      values.push((data as any)[field]);
    }
  }

  if (fields.length === 0) return findById(id);

  values.push(id);
  await pool.execute(
    `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
  return findById(id);
};

export const updateLastLogin = async (id: string): Promise<void> => {
  await pool.execute(
    'UPDATE users SET last_login_at = NOW() WHERE id = ?',
    [id]
  );
};

export const softDelete = async (id: string): Promise<boolean> => {
  const [result] = await pool.execute<ResultSetHeader>(
    'UPDATE users SET deleted_at = NOW() WHERE id = ?',
    [id]
  );
  return result.affectedRows > 0;
};

export const list = async (
  filters: { search?: string; status?: number },
  page: number,
  pageSize: number
): Promise<{ list: any[]; total: number }> => {
  const conditions: string[] = ['deleted_at IS NULL'];
  const params: any[] = [];

  if (filters.status !== undefined) {
    conditions.push('status = ?');
    params.push(filters.status);
  }
  if (filters.search) {
    conditions.push('(username LIKE ? OR email LIKE ? OR nickname LIKE ?)');
    const term = `%${filters.search}%`;
    params.push(term, term, term);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  const offset = (page - 1) * pageSize;

  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) as total FROM users ${whereClause}`,
    params
  );
  const total = countRows[0].total;

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, username, email, nickname, avatar, status, last_login_at, created_at, updated_at FROM users ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  return { list: rows, total };
};

export const getUserPermissions = async (userId: string): Promise<string[]> => {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT r.permissions FROM roles r
     JOIN user_roles ur ON r.id = ur.role_id
     WHERE ur.user_id = ?`,
    [userId]
  );
  const allPermissions: string[] = [];
  for (const row of rows) {
    try {
      const perms = typeof row.permissions === 'string' ? JSON.parse(row.permissions) : row.permissions;
      if (Array.isArray(perms)) {
        allPermissions.push(...perms);
      }
    } catch (e) { /* skip */ }
  }
  return allPermissions;
};
