import { NextRequest } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import app from '@/lib/api';
import { setD1Binding } from '@/lib/db';

// Extend CloudflareEnv to include D1 binding
declare global {
  interface CloudflareEnv {
    DB: D1Database;
  }
}

async function handleRequest(request: NextRequest) {
  // Set D1 binding from Cloudflare Workers context
  try {
    const { env } = getCloudflareContext();
    if (env?.DB) {
      setD1Binding(env.DB as D1Database);
    }
  } catch {
    // Not in Cloudflare Workers environment, use local db
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
