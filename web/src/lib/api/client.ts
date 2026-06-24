// Frontend API client for PromptBridge007

const BASE_URL = '/api';

interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: { code: string; message: string } | null;
  meta?: { page: number; page_size: number; total: number };
}

async function request<T>(path: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  return res.json();
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ToolInfo {
  id: string;
  name: string;
  display_name: string;
  category: 'international' | 'domestic';
  detect_commands: string[];
  prompt_paths: string[];
  format_spec: Record<string, unknown> | null;
  deploy_config: Record<string, unknown> | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ToolTag {
  value: string;
  confidence: string | null;
}

export interface FileTags {
  tool?: ToolTag[];
  role?: string;
  domain?: string | string[];
  language?: string;
  quality?: string;
  source_type?: string;
  custom?: string | string[];
  [key: string]: unknown;
}

export interface FileItem {
  id: string;
  slug: string;
  name: string;
  tags: FileTags;
  license: string;
  install_count: number;
  rating: number;
  created_at: string;
  updated_at: string;
}

export interface FileDetail extends FileItem {
  content: string;
  content_hash: string;
  format: string;
  source: {
    type: string;
    repo_name: string | null;
    repo_url: string | null;
    repo_license: string | null;
    author: string | null;
    author_url: string | null;
    file_path: string | null;
    commit_hash: string | null;
    fetched_at: string | null;
  };
  license_url: string | null;
  version: number;
  deployments: Array<{
    tool_id: string;
    status: string;
    deployed_at: string;
  }>;
}

export interface DeploymentInfo {
  deploy_id: string;
  file_id: string;
  tool_id: string;
  mode: 'original' | 'customized' | 'incremental';
  target_path: string;
  status: string;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface PublicSource {
  id: string;
  name: string;
  repo_url: string;
  repo_license: string | null;
  description: string | null;
  local_path: string | null;
  last_sync_at: string | null;
  last_commit_hash: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ScanResult {
  scan_id: string;
  status: string;
  started_at: string;
  files_found?: number;
  files_imported?: number;
  files_updated?: number;
  files_skipped?: number;
  completed_at?: string | null;
  error_message?: string | null;
}

// ─── API Client ───────────────────────────────────────────────────────────────

export const api = {
  // Tools
  getTools: () => request<ToolInfo[]>('/tools'),

  // Scan
  startScan: (toolIds?: string[], scanType?: string) =>
    request<ScanResult>('/scan', {
      method: 'POST',
      body: JSON.stringify({ tool_ids: toolIds, scan_type: scanType || 'full' }),
    }),
  getScanStatus: (scanId: string) => request<ScanResult>(`/scan/${scanId}`),

  // Files
  getFiles: (params?: Record<string, string | number | undefined>) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== '') query.set(k, String(v));
      });
    }
    return request<FileItem[]>(`/files?${query.toString()}`);
  },

  getFile: (fileId: string) => request<FileDetail>(`/files/${fileId}`),

  createFile: (data: {
    name: string;
    content: string;
    format: string;
    license: string;
    tags?: Record<string, unknown>;
  }) =>
    request<{ id: string; slug: string; name: string }>('/files', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateFile: (fileId: string, data: {
    name?: string;
    content?: string;
    tags?: Record<string, unknown>;
  }) =>
    request<{ id: string; updated_at: string; version: number }>(`/files/${fileId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteFile: (fileId: string) =>
    request<{ id: string; deleted: boolean }>(`/files/${fileId}`, {
      method: 'DELETE',
    }),

  // Tags
  addTag: (fileId: string, dimension: string, value: string, confidence?: string) =>
    request<{ id: string; file_id: string; dimension: string; value: string }>(
      `/files/${fileId}/tags`,
      {
        method: 'POST',
        body: JSON.stringify({ dimension, value, confidence }),
      }
    ),

  removeTag: (fileId: string, dimension: string, value: string) =>
    request<{ file_id: string; dimension: string; value: string; deleted: boolean }>(
      `/files/${fileId}/tags/${dimension}/${encodeURIComponent(value)}`,
      { method: 'DELETE' }
    ),

  // Search
  searchFiles: (params: {
    query?: string;
    tags?: Record<string, string | string[]>;
    must_have_all_tags?: boolean;
    page?: number;
    page_size?: number;
  }) =>
    request<FileItem[]>('/files/search', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  // Convert
  convertFormat: (fileId: string, targetFormat: string) =>
    request<{ converted_content: string; format: string; preview: boolean }>('/convert', {
      method: 'POST',
      body: JSON.stringify({ file_id: fileId, target_format: targetFormat }),
    }),

  // Deploy
  deploy: (data: {
    file_id: string;
    tool_id: string;
    mode: 'original' | 'customized' | 'incremental';
    custom_content?: string;
  }) =>
    request<{ deploy_id: string; status: string; target_path: string; deployed_at: string }>(
      '/deploy',
      { method: 'POST', body: JSON.stringify(data) }
    ),

  getDeployment: (deployId: string) => request<DeploymentInfo>(`/deploy/${deployId}`),

  getDeployments: (params?: Record<string, string | undefined>) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== '') query.set(k, String(v));
      });
    }
    return request<DeploymentInfo[]>(`/deployments?${query.toString()}`);
  },

  // Sync
  sync: (data: { direction: 'to_tool' | 'from_tool'; file_id: string; tool_id: string }) =>
    request<{ direction: string; file_id: string; tool_id: string; status: string; synced_at: string }>(
      '/sync',
      { method: 'POST', body: JSON.stringify(data) }
    ),

  // Public Sources
  getPublicSources: () => request<PublicSource[]>('/public-sources'),

  syncPublicSource: (sourceId: string) =>
    request<{ source_id: string; status: string; started_at: string }>(
      `/public-sources/${sourceId}/sync`,
      { method: 'POST' }
    ),
};
