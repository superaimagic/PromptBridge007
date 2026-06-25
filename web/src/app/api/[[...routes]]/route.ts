import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { setD1Binding, getDb } from '@/lib/db';

// Extend CloudflareEnv to include D1 binding
declare global {
  interface CloudflareEnv {
    DB: D1Database;
  }
}

/**
 * Set D1 binding from Cloudflare Workers context.
 * Must be called before any DB operations.
 */
async function initDbForRequest(): Promise<void> {
  try {
    const { env } = getCloudflareContext();
    if (env?.DB) {
      setD1Binding(env.DB as D1Database);
    }
  } catch {
    // Not in Cloudflare Workers - local mode uses libsql
  }
}

/**
 * Simple API router using Next.js Route Handler.
 * Replaces Hono's app.fetch() which is incompatible with Workers runtime.
 */

// GET /api/tools
async function handleToolsGet(request: NextRequest): Promise<NextResponse> {
  await initDbForRequest();
  const db = getDb();
  const { tools } = await import('@/lib/db/schema');
  const allTools = await db.select().from(tools);
  return NextResponse.json({ success: true, data: allTools });
}

// GET /api/projects
async function handleProjectsGet(request: NextRequest): Promise<NextResponse> {
  await initDbForRequest();
  const db = getDb();
  const { projects } = await import('@/lib/db/schema');
  const allProjects = await db.select().from(projects);
  return NextResponse.json({ success: true, data: allProjects });
}

// Main router
async function handleRequest(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const method = request.method;

  try {
    // Route: /api/tools
    if (pathname === '/api/tools' && method === 'GET') {
      return await handleToolsGet(request);
    }

    // Route: /api/projects
    if (pathname === '/api/projects' && method === 'GET') {
      return await handleProjectsGet(request);
    }

    // Fallback: delegate to Hono for all other routes
    const { default: app } = await import('@/lib/api');
    const response = await app.fetch(request);
    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
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
