/**
 * API Key 认证中间件
 * 提供 API Key 验证、项目上下文注入、管理员认证
 */

import * as crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { apiKeys } from '@/lib/db/schema';
import { error as apiError } from '@/lib/api/types';

// Admin token from environment variable
const ADMIN_TOKEN = process.env.PB_ADMIN_TOKEN || 'pb-admin-change-me-in-production';

export interface AuthContext {
  projectId: string;
  apiKeyId: string;
  keyPrefix: string;
  rateLimit: number;
  isAdmin: boolean;
}

/**
 * Generate a new API Key for a project.
 * Format: pb_[project-id-prefix]_[32 random hex chars]
 */
export function generateApiKey(projectId: string): { fullKey: string; keyHash: string; keyPrefix: string } {
  const randomPart = crypto.randomBytes(16).toString('hex'); // 32 chars
  const projectIdPrefix = projectId.replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 12);
  const fullKey = `pb_${projectIdPrefix}_${randomPart}`;
  const keyHash = crypto.createHash('sha256').update(fullKey).digest('hex');
  const keyPrefix = fullKey.slice(0, 20) + '...';
  return { fullKey, keyHash, keyPrefix };
}

/**
 * Hash an API Key for lookup.
 */
export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Verify API Key from request header and return auth context.
 * Returns null if authentication fails.
 */
export async function verifyApiKey(request: NextRequest): Promise<AuthContext | null> {
  const apiKey = request.headers.get('x-api-key');
  if (!apiKey) return null;

  const keyHash = hashApiKey(apiKey);
  const db = getDb();

  const keyRow = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.keyHash, keyHash), eq(apiKeys.status, 'active')))
    .limit(1);

  if (keyRow.length === 0) return null;

  // Update last_used_at (fire-and-forget)
  db.update(apiKeys)
    .set({ lastUsedAt: new Date().toISOString() })
    .where(eq(apiKeys.id, keyRow[0].id))
    .execute()
    .catch(() => {});

  return {
    projectId: keyRow[0].projectId,
    apiKeyId: keyRow[0].id,
    keyPrefix: keyRow[0].keyPrefix,
    rateLimit: keyRow[0].rateLimit ?? 100,
    isAdmin: false,
  };
}

/**
 * Verify admin token from request header.
 */
export function verifyAdminToken(request: NextRequest): boolean {
  const token = request.headers.get('x-admin-token');
  return token === ADMIN_TOKEN;
}

/**
 * CORS headers for API responses.
 */
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, X-Admin-Token',
  'Access-Control-Max-Age': '86400',
};

/**
 * Handle CORS preflight requests.
 */
export function handleCors(): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

/**
 * Add CORS headers to a response.
 */
export function withCors(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

/**
 * Unauthorized response (missing API Key).
 */
export function unauthorizedResponse(): NextResponse {
  return NextResponse.json(
    apiError('UNAUTHORIZED', 'API Key is required. Provide X-API-Key header.', 401),
    { status: 401 },
  );
}

/**
 * Forbidden response (invalid or revoked API Key).
 */
export function forbiddenResponse(): NextResponse {
  return NextResponse.json(
    apiError('FORBIDDEN', 'Invalid or revoked API Key.', 403),
    { status: 403 },
  );
}

/**
 * Admin unauthorized response.
 */
export function adminUnauthorizedResponse(): NextResponse {
  return NextResponse.json(
    apiError('UNAUTHORIZED', 'Admin token is required. Provide X-Admin-Token header.', 401),
    { status: 401 },
  );
}
