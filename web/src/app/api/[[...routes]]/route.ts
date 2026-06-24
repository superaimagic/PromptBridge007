import { NextRequest } from 'next/server';
import app from '@/lib/api';

// Extend CloudflareEnv to include D1 binding
declare global {
  interface CloudflareEnv {
    DB: D1Database;
  }
}

async function handleRequest(request: NextRequest) {
  // Try to set D1 binding if running in Cloudflare Workers
  try {
    const { getRequestContext } = await import('@cloudflare/next-on-pages');
    const { env } = getRequestContext();
    if (env?.DB) {
      const { setD1Binding } = await import('@/lib/db');
      setD1Binding(env.DB);
    }
  } catch {
    // Not in Cloudflare environment, use local db
  }

  return app.fetch(request);
}

export async function GET(request: NextRequest) {
  return handleRequest(request);
}

export async function POST(request: NextRequest) {
  return handleRequest(request);
}

export async function PUT(request: NextRequest) {
  return handleRequest(request);
}

export async function DELETE(request: NextRequest) {
  return handleRequest(request);
}

export async function PATCH(request: NextRequest) {
  return handleRequest(request);
}
