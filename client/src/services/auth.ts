import request from './request';
import type {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  RefreshTokenResponse,
  ChangePasswordRequest,
  UpdateUserRequest,
  User,
} from '@/types/auth';
import type { ApiResponse } from '@/types/common';

export const authAPI = {
  login: (data: LoginRequest) =>
    request.post<unknown, ApiResponse<AuthResponse>>('/auth/login', data),

  register: (data: RegisterRequest) =>
    request.post<unknown, ApiResponse<AuthResponse>>('/auth/register', data),

  refreshToken: (refreshToken: string) =>
    request.post<unknown, ApiResponse<RefreshTokenResponse>>('/auth/refresh', {
      refreshToken,
    }),

  logout: () => request.post<unknown, ApiResponse<null>>('/auth/logout'),

  getMe: () => request.get<unknown, ApiResponse<User>>('/auth/me'),

  updateMe: (data: UpdateUserRequest) =>
    request.put<unknown, ApiResponse<User>>('/auth/me', data),

  changePassword: (data: ChangePasswordRequest) =>
    request.put<unknown, ApiResponse<null>>('/auth/me/password', data),
};
