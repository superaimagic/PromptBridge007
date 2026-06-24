import axios from 'axios';
import { getToken, setToken, clearAuthTokens, getRefreshToken } from '@/utils/auth';

const request = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

request.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

request.interceptors.response.use(
  (response) => {
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = getRefreshToken();
      if (refreshToken) {
        try {
          const res = await axios.post('/api/v1/auth/refresh', {
            refreshToken,
          });
          const { accessToken, refreshToken: newRefreshToken } = res.data.data;
          setToken(accessToken);
          if (newRefreshToken) {
            localStorage.setItem('refresh_token', newRefreshToken);
          }
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return request(originalRequest);
        } catch {
          clearAuthTokens();
          window.location.href = '/login';
          return Promise.reject(error);
        }
      }

      clearAuthTokens();
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default request;
