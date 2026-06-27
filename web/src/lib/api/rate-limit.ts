/**
 * 速率限制中间件
 * 基于 API Key 的内存滑动窗口限流
 * 注意：Workers 无状态，冷启动后重置。这是基础保护，后续可升级到 KV/Durable Objects
 */

import { NextResponse } from 'next/server';

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

// In-memory rate limit store (per Worker isolate)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupOldEntries(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  const cutoff = now - 60 * 1000; // 1 minute window
  for (const [key, entry] of rateLimitStore) {
    if (entry.windowStart < cutoff) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Check rate limit for an API Key.
 * Returns { allowed: true } or { allowed: false, retryAfter: number }
 */
export function checkRateLimit(
  apiKeyId: string,
  limit: number = 100,
  windowMs: number = 60 * 1000,
): { allowed: true } | { allowed: false; retryAfter: number } {
  cleanupOldEntries();
  const now = Date.now();
  const entry = rateLimitStore.get(apiKeyId);

  if (!entry || now - entry.windowStart > windowMs) {
    // New window
    rateLimitStore.set(apiKeyId, { count: 1, windowStart: now });
    return { allowed: true };
  }

  entry.count++;
  if (entry.count > limit) {
    const retryAfter = Math.ceil((entry.windowStart + windowMs - now) / 1000);
    return { allowed: false, retryAfter };
  }

  return { allowed: true };
}

/**
 * Rate limit response (429 Too Many Requests)
 */
export function rateLimitResponse(retryAfter: number): NextResponse {
  return NextResponse.json(
    {
      success: false,
      data: null,
      error: {
        code: 'RATE_LIMITED',
        message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
      },
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': '0',
      },
    },
  );
}
