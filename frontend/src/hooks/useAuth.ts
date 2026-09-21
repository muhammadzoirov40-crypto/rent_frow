import { useEffect, useState } from 'react';
import useAuthStore from '../store/authStore';
import { auth } from '../api';

export function useAuth() {
  const { token, isAuthenticated, user, updateUser, logout } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      if (token && !user) {
        try {
          setIsLoading(true);
          const userData = await auth.getMe();
          updateUser(userData);
        } catch {
          logout();
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [token, user, updateUser, logout]);

  return {
    user,
    isAuthenticated,
    isLoading,
  };
}
