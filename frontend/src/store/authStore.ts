import { create } from 'zustand';
import { jwtDecode } from 'jwt-decode';

interface AuthUser {
  id: number;
  email: string;
  role: 'CUSTOMER' | 'ADMIN' | 'OWNER';
  display_name: string | null;
  avatar_url?: string;
  phone?: string;
  created_at: string;
}

interface JwtPayload {
  sub: string;
  role: string;
  exp: number;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  login: (token: string, user: { id: number; email: string; role: string }) => void;
  logout: () => void;
  updateUser: (user: Partial<AuthUser>) => void;
  initialize: () => Promise<void>;
}

const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isInitialized: false,

  login: (token, user) => {
    localStorage.setItem('rentflow_token', token);
    set({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role as AuthUser['role'],
        display_name: null,
        created_at: new Date().toISOString(),
      },
      isAuthenticated: true,
    });
  },

  logout: () => {
    localStorage.removeItem('rentflow_token');
    set({ token: null, user: null, isAuthenticated: false });
  },

  updateUser: (userData) => {
    set((state) => ({
      user: state.user ? { ...state.user, ...userData } : null,
    }));
  },

  initialize: async () => {
    if (get().isInitialized) return;
    const token = localStorage.getItem('rentflow_token');
    if (!token) {
      set({ isInitialized: true });
      return;
    }

    try {
      const decoded = jwtDecode<JwtPayload>(token);
      if (decoded.exp * 1000 < Date.now()) {
        localStorage.removeItem('rentflow_token');
        set({ isInitialized: true });
        return;
      }

      set({ token, isAuthenticated: true });

      const res = await fetch('/api/v1/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          set({
            user: {
              id: json.data.id,
              email: json.data.email,
              role: json.data.role,
              display_name: json.data.display_name,
              avatar_url: json.data.avatar_url,
              phone: json.data.phone,
              created_at: json.data.created_at,
            },
          });
        }
      } else {
        localStorage.removeItem('rentflow_token');
        set({ token: null, isAuthenticated: false });
      }
    } catch {
      set({ token, isAuthenticated: true });
    } finally {
      set({ isInitialized: true });
    }
  },
}));

export default useAuthStore;
