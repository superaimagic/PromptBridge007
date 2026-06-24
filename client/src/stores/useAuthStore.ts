import { create } from 'zustand';
import { authAPI } from '@/services/auth';
import type { User, LoginRequest, RegisterRequest } from '@/types/auth';
import {
  getToken,
  setToken,
  removeToken,
  setRefreshToken,
  removeRefreshToken,
  clearAuthTokens,
} from '@/utils/auth';

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  setUser: (user: User) => void;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  fetchUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: getToken(),
  loading: false,

  setUser: (user: User) => set({ user }),

  login: async (data: LoginRequest) => {
    set({ loading: true });
    try {
      const res = await authAPI.login(data);
      const { user, accessToken, refreshToken } = res.data;
      setToken(accessToken);
      setRefreshToken(refreshToken);
      set({ user, token: accessToken, loading: false });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  register: async (data: RegisterRequest) => {
    set({ loading: true });
    try {
      const res = await authAPI.register(data);
      const { user, accessToken, refreshToken } = res.data;
      setToken(accessToken);
      setRefreshToken(refreshToken);
      set({ user, token: accessToken, loading: false });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  logout: async () => {
    try {
      await authAPI.logout();
    } catch {
      // ignore error on logout
    } finally {
      clearAuthTokens();
      set({ user: null, token: null });
    }
  },

  refreshToken: async () => {
    const refreshTokenValue = localStorage.getItem('refresh_token');
    if (!refreshTokenValue) return;
    try {
      const res = await authAPI.refreshToken(refreshTokenValue);
      const { accessToken, refreshToken } = res.data;
      setToken(accessToken);
      if (refreshToken) {
        removeRefreshToken();
        setRefreshToken(refreshToken);
      }
      set({ token: accessToken });
    } catch {
      clearAuthTokens();
      set({ user: null, token: null });
    }
  },

  fetchUser: async () => {
    try {
      const res = await authAPI.getMe();
      set({ user: res.data });
    } catch {
      clearAuthTokens();
      set({ user: null, token: null });
    }
  },
}));
