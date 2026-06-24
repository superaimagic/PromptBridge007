import { useAuthStore } from '@/stores/useAuthStore';
import { isAuthenticated } from '@/utils/auth';

export function useAuth() {
  const { user, token, loading, login, register, logout, fetchUser } =
    useAuthStore();

  return {
    user,
    token,
    loading,
    isAuthenticated: isAuthenticated(),
    login,
    register,
    logout,
    fetchUser,
  };
}
