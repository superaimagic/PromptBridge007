import request from './request';
import type { ApiResponse, PaginatedResponse, PageParams } from '@/types/common';
import type { Workflow, WorkflowVersion } from '@/types/workflow';

export interface WorkflowListParams extends PageParams {
  category?: string;
}

export const workflowAPI = {
  list: (params: WorkflowListParams) =>
    request.get<unknown, ApiResponse<PaginatedResponse<Workflow>>>('/workflows', { params }),

  getById: (id: string) =>
    request.get<unknown, ApiResponse<Workflow>>(`/workflows/${id}`),

  create: (data: Partial<Workflow>) =>
    request.post<unknown, ApiResponse<Workflow>>('/workflows', data),

  update: (id: string, data: Partial<Workflow>) =>
    request.put<unknown, ApiResponse<Workflow>>(`/workflows/${id}`, data),

  delete: (id: string) =>
    request.delete<unknown, ApiResponse<null>>(`/workflows/${id}`),

  duplicate: (id: string) =>
    request.post<unknown, ApiResponse<Workflow>>(`/workflows/${id}/duplicate`),

  publish: (id: string) =>
    request.put<unknown, ApiResponse<Workflow>>(`/workflows/${id}/publish`),

  getVersions: (id: string) =>
    request.get<unknown, ApiResponse<WorkflowVersion[]>>(`/workflows/${id}/versions`),

  saveVersion: (id: string, data: Partial<WorkflowVersion>) =>
    request.post<unknown, ApiResponse<WorkflowVersion>>(`/workflows/${id}/versions`, data),
};
