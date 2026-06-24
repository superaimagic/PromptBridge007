export interface User {
  id: string;
  username: string;
  email: string;
  nickname: string | null;
  avatar?: string;
  roles?: { id: string; name: string; display_name: string }[];
  status: number;
  last_login_at: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  nickname?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

export interface UpdateUserRequest {
  nickname?: string;
  avatar?: string;
}
