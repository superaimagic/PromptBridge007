import { NextRequest } from 'next/server';
import app from '@/lib/api';

// Extend CloudflareEnv to include D1 binding
declare global {
  interface CloudflareEnv {
    DB: D1Database;
  }
}

async function handleRequest(request: NextRequest) {
  // D1 binding is now auto-detected by getDb() via getCloudflareContext()
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
