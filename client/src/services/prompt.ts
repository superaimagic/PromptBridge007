import request from './request';
import type { ApiResponse, PaginatedResponse, PageParams } from '@/types/common';
import type { Prompt, PromptVersion } from '@/types/prompt';

export interface PromptListParams extends PageParams {
  categoryId?: string;
  visibility?: string;
}

export const promptAPI = {
  list: (params: PromptListParams) =>
    request.get<unknown, ApiResponse<PaginatedResponse<Prompt>>>('/prompts', { params }),

  getById: (id: string) =>
    request.get<unknown, ApiResponse<Prompt>>(`/prompts/${id}`),

  create: (data: Partial<Prompt>) =>
    request.post<unknown, ApiResponse<Prompt>>('/prompts', data),

  update: (id: string, data: Partial<Prompt>) =>
    request.put<unknown, ApiResponse<Prompt>>(`/prompts/${id}`, data),

  delete: (id: string) =>
    request.delete<unknown, ApiResponse<null>>(`/prompts/${id}`),

  duplicate: (id: string) =>
    request.post<unknown, ApiResponse<Prompt>>(`/prompts/${id}/duplicate`),

  getVersions: (id: string) =>
    request.get<unknown, ApiResponse<PromptVersion[]>>(`/prompts/${id}/versions`),

  getVersion: (id: string, version: number) =>
    request.get<unknown, ApiResponse<PromptVersion>>(`/prompts/${id}/versions/${version}`),

  createVersion: (id: string, data: Partial<PromptVersion>) =>
    request.post<unknown, ApiResponse<PromptVersion>>(`/prompts/${id}/versions`, data),

  restoreVersion: (id: string, version: number) =>
    request.post<unknown, ApiResponse<PromptVersion>>(`/prompts/${id}/versions/${version}/restore`),
};
