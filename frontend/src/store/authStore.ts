import { create } from 'zustand';
import { jwtDecode } from 'jwt-decode';

interface AuthUser {
  id: number;
  email: string;
  role: 'CUSTOMER' | 'ADMIN' | 'OWNER';
  display_name: string | null;
  avatar_url?: string;
  phone?: string;
  is_verified: boolean;
  is_active: boolean;
  rating_sum: number;
  rating_count: number;
  listing_count: number;
  created_at: string;
  updated_at: string;
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

/** Neutrality defaults — populates fields the backend `UserResponse` always returns. */
const DEFAULT_USER_FIELDS = {
  is_verified: false,
  is_active: true,
  rating_sum: 0,
  rating_count: 0,
  listing_count: 0,
} as const;

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
        ...DEFAULT_USER_FIELDS,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
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

      const jwtRole = (decoded.role === 'ADMIN' || decoded.role === 'OWNER'
        ? decoded.role
        : 'CUSTOMER') as AuthUser['role'];

      set({
        token,
        isAuthenticated: true,
        user: {
          id: 0,
          email: '',
          role: jwtRole,
          display_name: null,
          ...DEFAULT_USER_FIELDS,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      });

      const res = await fetch('/api/v1/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          const me = json.data;
          set({
            user: {
              id: me.id,
              email: me.email,
              role: me.role,
              display_name: me.display_name,
              avatar_url: me.avatar_url,
              phone: me.phone,
              is_verified: me.is_verified ?? false,
              is_active: me.is_active ?? true,
              rating_sum: me.rating_sum ?? 0,
              rating_count: me.rating_count ?? 0,
              listing_count: me.listing_count ?? 0,
              created_at: me.created_at,
              updated_at: me.updated_at ?? me.created_at,
            },
          });
        }
      } else {
        localStorage.removeItem('rentflow_token');
        set({ token: null, user: null, isAuthenticated: false });
      }
    } catch {
      set({ token, isAuthenticated: true });
    } finally {
      set({ isInitialized: true });
    }
  },
}));

export default useAuthStore;
