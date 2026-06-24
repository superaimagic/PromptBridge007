import request from './request';
import type { ApiResponse } from '@/types/common';
import type { Category } from '@/types/prompt';

export const categoryAPI = {
  list: () =>
    request.get<unknown, ApiResponse<Category[]>>('/categories'),

  create: (data: { name: string; parent_id?: string | null; icon?: string; sort_order?: number }) =>
    request.post<unknown, ApiResponse<Category>>('/categories', data),
};
