import { drizzle } from 'drizzle-orm/libsql';
import { drizzle as drizzleD1 } from 'drizzle-orm/d1';
import { createClient, type Client } from '@libsql/client';
import * as fs from 'fs';
import * as path from 'path';
import * as schema from './schema';

// ─── Local mode: libsql ─────────────────────────────────────────────────────

const dbPath = process.env.DATABASE_URL || 'file:./data/promptbridge007.db';

function ensureDataDir(): void {
  if (dbPath.startsWith('file:')) {
    const filePath = dbPath.replace('file:', '');
    if (filePath === ':memory:' || filePath.startsWith('/')) return;
    const dir = path.dirname(filePath);
    if (dir && dir !== '.' && !fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch {
        // Directory may already exist (race condition)
      }
    }
  }
}

let client: Client;

try {
  ensureDataDir();
  client = createClient({
    url: dbPath,
  });
} catch {
  client = createClient({
    url: dbPath,
  });
}

const localDb = drizzle(client, { schema });

// ─── Cloudflare D1 mode ─────────────────────────────────────────────────────

// Use the local db type as the canonical type for getDb().
// D1 and libsql drivers share the same query builder API at runtime.
type AppDb = typeof localDb;

let _d1Db: AppDb | null = null;

/**
 * Set the D1 binding for Cloudflare Workers environment.
 * Called once per request in the API middleware.
 */
export function setD1Binding(binding: D1Database): void {
  _d1Db = drizzleD1(binding, { schema }) as unknown as AppDb;
}

/**
 * Get the appropriate database instance.
 * - In Cloudflare Workers: returns D1-backed drizzle if setD1Binding was called
 * - In local development: returns libsql-backed drizzle
 */
export function getDb(): AppDb {
  return _d1Db || localDb;
}

/**
 * Default export: local db for backward compatibility.
 * Used by CLI, MCP server, and other non-HTTP contexts.
 */
export const db = localDb;

// ─── Lazy initialization ────────────────────────────────────────────────────

let _initialized = false;
let _initPromise: Promise<void> | null = null;

/**
 * Ensure the database is initialized (tables created + seeded).
 * Safe to call multiple times - only runs once.
 * Only works in local mode (libsql). D1 uses migrations.
 */
export async function ensureInitialized(): Promise<void> {
  if (_initialized) return;
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    try {
      const { initAndSeed } = await import('./init');
      const result = await initAndSeed();
      if (result.seeded) {
        console.log('Database seeded with initial data.');
      }
      _initialized = true;
    } catch (error) {
      console.error('Database initialization failed:', error);
      _initPromise = null; // Allow retry
      throw error;
    }
  })();

  return _initPromise;
}
