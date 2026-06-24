import request from './request';
import type { ApiResponse, PaginatedResponse, PageParams } from '@/types/common';
import type { Execution, NodeExecution } from '@/types/execution';

export interface ExecutionListParams extends PageParams {
  workflowId?: string;
  status?: string;
}

export const executionAPI = {
  start: (data: { workflow_id: string; input_data?: any }) =>
    request.post<unknown, ApiResponse<Execution>>('/executions', data),

  list: (params: ExecutionListParams) =>
    request.get<unknown, ApiResponse<PaginatedResponse<Execution>>>('/executions', { params }),

  getById: (id: string) =>
    request.get<unknown, ApiResponse<Execution>>(`/executions/${id}`),

  cancel: (id: string) =>
    request.post<unknown, ApiResponse<Execution>>(`/executions/${id}/cancel`),

  retry: (id: string) =>
    request.post<unknown, ApiResponse<Execution>>(`/executions/${id}/retry`),

  getNodeExecutions: (id: string) =>
    request.get<unknown, ApiResponse<NodeExecution[]>>(`/executions/${id}/nodes`),
};
