import request from './request';
import type { ApiResponse } from '@/types/common';
import type { Tag } from '@/types/prompt';

export const tagAPI = {
  list: () =>
    request.get<unknown, ApiResponse<Tag[]>>('/tags'),

  create: (data: { name: string; color?: string }) =>
    request.post<unknown, ApiResponse<Tag>>('/tags', data),
};
