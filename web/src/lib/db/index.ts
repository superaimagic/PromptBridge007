import { drizzle as drizzleD1 } from 'drizzle-orm/d1';
import * as schema from './schema';

// ─── Cloudflare D1 mode (primary) ──────────────────────────────────────────

type AppDb = ReturnType<typeof drizzleD1<typeof schema>>;

let _d1Db: AppDb | null = null;

/**
 * Set the D1 binding for Cloudflare Workers environment.
 * Called automatically by getDb() or manually in middleware.
 */
export function setD1Binding(binding: D1Database): void {
  _d1Db = drizzleD1(binding, { schema }) as AppDb;
}

// ─── Local mode: libsql (lazy) ─────────────────────────────────────────────

let _localDb: AppDb | null = null;
let _localDbInitAttempted = false;

function createLocalDb(): AppDb {
  // Use dynamic import to avoid loading @libsql/client in Cloudflare Workers
  // These modules are only needed in local Node.js environment
  let drizzleLibsql: typeof import('drizzle-orm/libsql').drizzle;
  let createClient: typeof import('@libsql/client').createClient;

  try {
    const libsqlModule = require('drizzle-orm/libsql');
    const clientModule = require('@libsql/client');
    drizzleLibsql = libsqlModule.drizzle;
    createClient = clientModule.createClient;
  } catch {
    throw new Error(
      'Failed to initialize local database. ' +
      'If running in Cloudflare Workers, ensure D1 binding is configured in wrangler.jsonc. ' +
      'If running locally, ensure @libsql/client is installed.'
    );
  }

  const fs = require('fs');
  const path = require('path');
  const dbPath = process.env.DATABASE_URL || 'file:./data/promptbridge007.db';

  // Ensure data directory exists
  if (dbPath.startsWith('file:')) {
    const filePath = dbPath.replace('file:', '');
    if (filePath !== ':memory:' && !filePath.startsWith('/')) {
      const dir = path.dirname(filePath);
      if (dir && dir !== '.' && !fs.existsSync(dir)) {
        try { fs.mkdirSync(dir, { recursive: true }); } catch { /* race condition */ }
      }
    }
  }

  let client;
  try {
    client = createClient({ url: dbPath });
  } catch {
    client = createClient({ url: dbPath });
  }

  return drizzleLibsql(client, { schema }) as unknown as AppDb;
}

/**
 * Try to auto-detect and set D1 binding from Cloudflare context.
 * Returns true if D1 binding was set, false otherwise.
 */
function tryAutoD1Binding(): boolean {
  if (_d1Db) return true;

  try {
    // Dynamic require - esbuild will bundle this but it only executes in Workers
    const { getCloudflareContext } = require('@opennextjs/cloudflare');
    const { env } = getCloudflareContext();
    if (env?.DB) {
      setD1Binding(env.DB);
      return true;
    }
  } catch {
    // Not in Cloudflare Workers environment
  }

  return false;
}

/**
 * Get the appropriate database instance.
 * - In Cloudflare Workers: auto-detects D1 binding from Cloudflare context
 * - In local development: returns libsql-backed drizzle (lazy initialized)
 */
export function getDb(): AppDb {
  // Try D1 first (Cloudflare Workers)
  if (_d1Db) return _d1Db;
  if (tryAutoD1Binding()) return _d1Db!;

  // Fall back to local libsql
  if (!_localDb && !_localDbInitAttempted) {
    _localDbInitAttempted = true;
    _localDb = createLocalDb();
  }

  if (!_localDb) {
    throw new Error(
      'Database not available. ' +
      'In Cloudflare Workers: ensure D1 binding is configured. ' +
      'Locally: ensure @libsql/client is installed and DATABASE_URL is set.'
    );
  }

  return _localDb;
}

/**
 * Default export: Proxy that delegates to getDb() at runtime.
 * This allows `import { db } from '@/lib/db'` to work in both
 * Cloudflare Workers (D1) and local (libsql) environments.
 */
export const db = new Proxy({} as AppDb, {
  get(_target, prop, receiver) {
    const actualDb = getDb();
    const value = Reflect.get(actualDb, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(actualDb);
    }
    return value;
  },
});

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
