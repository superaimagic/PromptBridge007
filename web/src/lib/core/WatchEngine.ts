import * as path from 'path';
// Lazy-load Node.js modules to avoid Workers runtime crash
let _fs: typeof import('fs') | null = null;
function getFs(): typeof import('fs') {
  if (!_fs) { _fs = require('fs'); }
  return _fs!;
}
let _os: typeof import('os') | null = null;
function getOs(): typeof import('os') {
  if (!_os) { _os = require('os'); }
  return _os!;
}
import { getDb } from '@/lib/db';
import { deployments } from '@/lib/db/schema';
import { getToolById } from './ToolRegistry';

function expandHomeDir(filePath: string): string {
  if (filePath.startsWith('~/')) {
    return path.join(getOs().homedir(), filePath.slice(2));
  }
  return filePath;
}

type WatchCallback = (event: { toolId: string; filePath: string; type: 'change' | 'create' | 'delete' }) => void;

/**
 * WatchEngine - Monitors tool directories for file changes
 *
 * Uses polling-based watching for reliability.
 * Polls every 2 seconds for changes.
 */
export class WatchEngine {
  private callbacks: WatchCallback[] = [];
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private fileHashes: Map<string, string> = new Map();
  private running = false;
  private watchedDirs: Set<string> = new Set();

  /**
   * Start watching all deployed tool directories
   */
  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;

    // Get all tools with deployments
    const deploymentRows = await getDb()
      .select({ toolId: deployments.toolId, targetPath: deployments.targetPath })
      .from(deployments);

    for (const row of deploymentRows) {
      const tool = getToolById(row.toolId);
      if (!tool) continue;

      // Watch the target directory
      const targetDir = path.dirname(expandHomeDir(row.targetPath));
      if (getFs().existsSync(targetDir)) {
        this.watchDirectory(row.toolId, targetDir);
      }
    }

    console.log(`WatchEngine started, monitoring ${this.watchedDirs.size} directories`);
  }

  /**
   * Stop all watchers
   */
  stop(): void {
    for (const [key, interval] of this.intervals) {
      clearInterval(interval);
    }
    this.intervals.clear();
    this.fileHashes.clear();
    this.watchedDirs.clear();
    this.running = false;
  }

  /**
   * Register a callback for file change events
   */
  onChange(callback: WatchCallback): void {
    this.callbacks.push(callback);
  }

  /**
   * Get current watch status
   */
  getStatus(): { running: boolean; watchedDirectories: number; trackedFiles: number } {
    return {
      running: this.running,
      watchedDirectories: this.watchedDirs.size,
      trackedFiles: this.fileHashes.size,
    };
  }

  private watchDirectory(toolId: string, dirPath: string): void {
    const key = `${toolId}:${dirPath}`;
    if (this.intervals.has(key)) return;

    this.watchedDirs.add(dirPath);

    // Initial scan to populate hashes
    this.pollDirectory(toolId, dirPath);

    // Use polling-based watching for reliability
    const interval = setInterval(() => {
      this.pollDirectory(toolId, dirPath);
    }, 2000);

    this.intervals.set(key, interval);
  }

  private async pollDirectory(toolId: string, dirPath: string): Promise<void> {
    try {
      const entries = getFs().readdirSync(dirPath);
      const currentHashes = new Map<string, string>();

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry);
        try {
          const stat = getFs().statSync(fullPath);
          if (stat.isFile()) {
            const content = getFs().readFileSync(fullPath, 'utf-8');
            const hash = this.simpleHash(content);
            currentHashes.set(fullPath, hash);

            const prevHash = this.fileHashes.get(fullPath);
            if (prevHash === undefined) {
              // New file
              this.notifyCallbacks({ toolId, filePath: fullPath, type: 'create' });
            } else if (prevHash !== hash) {
              // Changed file
              this.notifyCallbacks({ toolId, filePath: fullPath, type: 'change' });
            }
          }
        } catch {
          /* skip unreadable files */
        }
      }

      // Check for deleted files
      for (const [filePath] of this.fileHashes) {
        if (filePath.startsWith(dirPath) && !currentHashes.has(filePath)) {
          this.notifyCallbacks({ toolId, filePath, type: 'delete' });
        }
      }

      // Update hashes
      for (const [filePath, hash] of currentHashes) {
        this.fileHashes.set(filePath, hash);
      }
      // Remove deleted file hashes
      for (const [filePath] of this.fileHashes) {
        if (filePath.startsWith(dirPath) && !currentHashes.has(filePath)) {
          this.fileHashes.delete(filePath);
        }
      }
    } catch {
      /* directory might not exist */
    }
  }

  private notifyCallbacks(event: { toolId: string; filePath: string; type: 'change' | 'create' | 'delete' }): void {
    for (const cb of this.callbacks) {
      try {
        cb(event);
      } catch {
        /* ignore callback errors */
      }
    }
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }
}

export const watchEngine = new WatchEngine();
