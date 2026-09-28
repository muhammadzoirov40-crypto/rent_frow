import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://renthub.qobus.tj/api/v1';

let token: string | null = null;

export async function loadToken(): Promise<void> {
  token = await AsyncStorage.getItem('renthub_token');
}

export async function setToken(value: string | null): Promise<void> {
  token = value;
  if (value) await AsyncStorage.setItem('renthub_token', value);
  else await AsyncStorage.removeItem('renthub_token');
}

export function getToken(): string | null {
  return token;
}

async function request<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = json?.detail ?? json?.message ?? `Ошибка ${res.status}`;
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
  }
  return json as T;
}

export interface ListingItem {
  id: number;
  title: string;
  price: number;
  price_unit: string;
  city_name?: string | null;
  district_name?: string | null;
  primary_image?: string | null;
  views_count?: number;
  average_rating?: number;
  available?: boolean;
  is_verified?: boolean;
  is_favorited?: boolean;
  rooms?: number | null;
  created_at?: string;
}

export interface Category {
  id: number;
  name: string;
  name_tj?: string | null;
  icon?: string | null;
  image_url?: string | null;
}

export interface City {
  id: number;
  name: string;
  name_tj?: string | null;
}

export interface User {
  id: number;
  email: string;
  role: string;
  display_name?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
}

interface Paginated<T> {
  data?: T[] | null;
  total: number;
  page: number;
  page_size: number;
}

function qs(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') search.set(key, String(value));
  });
  const str = search.toString();
  return str ? `?${str}` : '';
}

export const api = {
  listings: (params: Record<string, string | number | undefined> = {}) =>
    request<Paginated<ListingItem>>(`/listings${qs({ page: 1, page_size: 20, ...params })}`),

  listing: (id: number) => request<{ data: ListingItem & { description?: string } }>(`/listings/${id}`),

  categories: () => request<Paginated<Category>>(`/categories${qs({ skip: 0, limit: 30 })}`),

  cities: () => request<{ data: City[] }>('/cities'),

  favorites: () => request<Paginated<ListingItem>>(`/favorites${qs({ page: 1, page_size: 50 })}`),

  toggleFavorite: (id: number) =>
    request<{ data: { is_favorited: boolean } }>(`/listings/${id}/favorite`, { method: 'POST' }),

  sendOtp: (email: string) =>
    request<{ data: { sent_via_email: boolean; is_registered: boolean; dev_code?: string | null } }>(
      '/auth/send-otp',
      { method: 'POST', body: { email } },
    ),

  verifyOtp: (email: string, code: string) =>
    request<{ data: { valid: boolean } }>('/auth/verify-otp', { method: 'POST', body: { email, code } }),

  login: (email: string, otp_code: string) =>
    request<{ data: { access_token: string; user: User } }>('/auth/login', {
      method: 'POST',
      body: { email, otp_code },
    }),

  register: (email: string, otp_code: string, display_name: string) =>
    request<{ data: { access_token: string; user: User } }>('/auth/register', {
      method: 'POST',
      body: { email, otp_code, display_name },
    }),

  me: () => request<{ data: User }>('/auth/me'),

  logoutBackend: async () => setToken(null),
};
