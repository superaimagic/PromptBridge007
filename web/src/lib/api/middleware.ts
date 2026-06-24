import { ensureInitialized } from '@/lib/db';

export async function dbInitMiddleware(_c: any, next: any) {
  await ensureInitialized();
  await next();
}
