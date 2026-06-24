import * as crypto from 'crypto';
import { nanoid } from 'nanoid';

export function success(data: unknown, meta?: { page: number; page_size: number; total: number }) {
  return { success: true as const, data, error: null, ...(meta ? { meta } : {}) };
}

export function error(code: string, message: string, status: number) {
  return { success: false as const, data: null, error: { code, message } };
}

export function now(): string {
  return new Date().toISOString();
}

export function sanitizeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

export function sanitizeInput(data: Record<string, any>): Record<string, any> {
  const sanitized = { ...data };
  if (typeof sanitized.name === 'string') {
    sanitized.name = sanitizeHtml(sanitized.name);
  }
  return sanitized;
}

export function validateInput(data: Record<string, any>): string | null {
  if (data.name && (typeof data.name !== 'string' || data.name.length > 200 || /[\/\\]/.test(data.name))) {
    return 'Invalid name: max 200 chars, no path separators';
  }
  if (data.content && (typeof data.content !== 'string' || data.content.length > 1024 * 1024)) {
    return 'Content too large: max 1MB';
  }
  if (data.tool_id && !/^[a-z0-9-]+$/.test(data.tool_id)) {
    return 'Invalid tool_id format';
  }
  if (data.value && typeof data.value === 'string' && data.value.length > 50) {
    return 'Tag value too long: max 50 chars';
  }
  return null;
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) + '-' + nanoid(6);
}

export function computeContentHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

export function escapeYamlValue(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

export function escapeTomlValue(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');
}
