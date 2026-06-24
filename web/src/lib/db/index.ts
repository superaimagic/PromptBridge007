import { drizzle } from 'drizzle-orm/libsql';
import { createClient, type Client } from '@libsql/client';
import * as fs from 'fs';
import * as path from 'path';
import * as schema from './schema';

const dbPath = process.env.DATABASE_URL || 'file:./data/promptbridge007.db';

// Ensure data directory exists for local SQLite
function ensureDataDir(): void {
  // Only for local file-based databases
  if (dbPath.startsWith('file:')) {
    const filePath = dbPath.replace('file:', '');
    // Skip if it's an absolute path or in-memory
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
  // Fallback: create client without path validation
  client = createClient({
    url: dbPath,
  });
}

export const db = drizzle(client, { schema });

// Lazy initialization flag
let _initialized = false;
let _initPromise: Promise<void> | null = null;

/**
 * Ensure the database is initialized (tables created + seeded).
 * Safe to call multiple times - only runs once.
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
