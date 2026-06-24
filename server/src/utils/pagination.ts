export const parsePagination = (query: any): { page: number; pageSize: number; offset: number } => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize) || 10));
  const offset = (page - 1) * pageSize;
  return { page, pageSize, offset };
};

export const buildWhereClause = (conditions: Record<string, any>): { sql: string; params: any[] } => {
  const clauses: string[] = [];
  const params: any[] = [];
  for (const [key, value] of Object.entries(conditions)) {
    if (value !== undefined && value !== null && value !== '') {
      clauses.push(`${key} = ?`);
      params.push(value);
    }
  }
  const sql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  return { sql, params };
};
