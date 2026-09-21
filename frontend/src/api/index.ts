import client from './client';

export interface APIResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface User {
  id: number;
  email: string;
  role: 'CUSTOMER' | 'ADMIN' | 'OWNER';
  display_name: string | null;
  avatar_url?: string;
  phone?: string;
  external_user_id: string;
  is_verified: boolean;
  rating_sum: number;
  rating_count: number;
  listing_count: number;
  created_at: string;
  updated_at: string;
}

export interface ListingImage {
  id: number;
  image_url: string;
  is_primary: boolean;
  sort_order: number;
}

export interface ListingOwner {
  id: number;
  display_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  is_verified: boolean;
  rating_sum: number;
  rating_count: number;
}

export interface Listing {
  id: number;
  owner_id: number;
  category_id: number;
  subcategory_id?: number;
  city_id: number;
  district_id?: number;
  title: string;
  description: string | null;
  price: number;
  price_unit: string;
  deposit: number;
  address: string | null;
  status: string;
  is_verified: boolean;
  views_count: number;
  rating_sum: number;
  rating_count: number;
  rental_rules: string | null;
  contact_phone: string | null;
  contact_name: string | null;
  created_at: string;
  updated_at: string;
  images: ListingImage[];
  owner: ListingOwner | null;
  category_name: string | null;
  city_name: string | null;
  district_name: string | null;
  is_favorited: boolean;
  average_rating: number;
}

export interface ListingListItem {
  id: number;
  title: string;
  price: number;
  price_unit: string;
  city_name: string | null;
  primary_image: string | null;
  views_count: number;
  average_rating: number;
  created_at: string;
  is_favorited: boolean;
}

export interface SubCategory {
  id: number;
  category_id: number;
  name: string;
  icon: string | null;
}

export interface Category {
  id: number;
  name: string;
  name_tj: string | null;
  description: string | null;
  icon: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  subcategories: SubCategory[];
}

export interface City {
  id: number;
  name: string;
  name_tj: string | null;
  is_active: boolean;
}

export interface District {
  id: number;
  city_id: number;
  name: string;
}

export interface Conversation {
  id: number;
  user1_id: number;
  user2_id: number;
  listing_id: number | null;
  last_message_at: string | null;
  created_at: string;
  other_user_name: string | null;
  other_user_avatar: string | null;
  last_message_content: string | null;
  unread_count: number;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  content: string;
  is_read: boolean;
  created_at: string;
  sender_name: string | null;
  sender_avatar: string | null;
}

export interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: string;
  reference_id: number | null;
  reference_type: string | null;
  is_read: boolean;
  created_at: string;
}

export interface Review {
  id: number;
  listing_id: number;
  reviewer_id: number;
  rating: number;
  comment: string;
  created_at: string;
  reviewer?: User;
}

export interface RentalRequest {
  id: number;
  listing_id: number;
  renter_id: number;
  owner_id: number;
  start_date: string;
  end_date: string;
  total_days: number;
  total_price: number;
  deposit_amount: number;
  message: string | null;
  owner_response: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  listing_title: string | null;
  renter_name: string | null;
  owner_name: string | null;
}

const unwrap = <T>(response: { data: APIResponse<T> }): T => response.data.data;
const unwrapPaginated = <T>(response: { data: PaginatedResponse<T> }): { items: T[]; total: number; page: number; pages: number } => ({
  items: response.data.data || [],
  total: response.data.total,
  page: response.data.page,
  pages: Math.ceil(response.data.total / response.data.page_size),
});

export const auth = {
  sendOtp: (email: string) =>
    client.post<APIResponse<{ email: string; sent_via_email: boolean; is_registered: boolean; dev_code?: string }>>('/auth/send-otp', { email }).then(unwrap),

  verifyOtp: (email: string, code: string) =>
    client.post<APIResponse<{ valid: boolean }>>('/auth/verify-otp', { email, code }).then(unwrap),

  register: (data: { email: string; otp_code: string; role?: string }) =>
    client.post<APIResponse<{ access_token: string; token_type: string; user: { id: number; email: string; role: string } }>>('/auth/register', data).then(unwrap),

  login: (email: string, otp_code: string) =>
    client.post<APIResponse<{ access_token: string; token_type: string; user: { id: number; email: string; role: string } }>>('/auth/login', { email, otp_code }).then(unwrap),

  getMe: () =>
    client.get<APIResponse<User>>('/auth/me').then(unwrap),

  updateProfile: (data: { display_name: string }) =>
    client.patch<APIResponse<User>>('/auth/profile', data).then(unwrap),

  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return client.post<APIResponse<User>>('/auth/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(unwrap);
  },
};

export const listings = {
  search: (params: Record<string, unknown>) =>
    client.get<PaginatedResponse<ListingListItem>>('/listings', { params }).then(unwrapPaginated),

  getOne: (id: number) =>
    client.get<APIResponse<Listing>>(`/listings/${id}`).then(unwrap),

  create: (data: ListingCreateData) =>
    client.post<APIResponse<Listing>>('/listings', data).then(unwrap),

  update: (id: number, data: Partial<ListingCreateData>) =>
    client.patch<APIResponse<Listing>>(`/listings/${id}`, data).then(unwrap),

  delete: (id: number) =>
    client.delete(`/listings/${id}`),

  toggleFavorite: (id: number) =>
    client.post<APIResponse<{ is_favorited: boolean }>>(`/listings/${id}/favorite`).then(unwrap),

  getMyListings: (page = 1, page_size = 20) =>
    client.get<PaginatedResponse<Listing>>('/listings/owner/my', { params: { page, page_size } }).then(unwrapPaginated),
};

export interface ListingCreateData {
  title: string;
  description?: string;
  price: number;
  price_unit?: string;
  deposit?: number;
  category_id: number;
  subcategory_id?: number;
  city_id: number;
  district_id?: number;
  address?: string;
  rental_rules?: string;
  contact_phone?: string;
  contact_name?: string;
  image_urls?: string[];
}

export const categories = {
  getAll: (page = 1, page_size = 100) =>
    client.get<PaginatedResponse<Category>>('/categories', { params: { skip: (page - 1) * page_size, limit: page_size } }).then(unwrapPaginated),

  getOne: (id: number) =>
    client.get<APIResponse<Category>>(`/categories/${id}`).then(unwrap),
};

export const cities = {
  getAll: () =>
    client.get<APIResponse<City[]>>('/cities').then(unwrap),

  getDistricts: (cityId: number) =>
    client.get<APIResponse<District[]>>(`/cities/${cityId}/districts`).then(unwrap),
};

export const favorites = {
  getAll: (page = 1, page_size = 20) =>
    client.get<PaginatedResponse<ListingListItem>>('/favorites', { params: { page, page_size } }).then(unwrapPaginated),
};

export const rentalRequests = {
  create: (data: { listing_id: number; start_date: string; end_date: string; message?: string }) =>
    client.post<APIResponse<RentalRequest>>('/rental-requests', data).then(unwrap),

  getMyRequests: (page = 1, page_size = 20) =>
    client.get<PaginatedResponse<RentalRequest>>('/rental-requests/my', { params: { page, page_size } }).then(unwrapPaginated),

  getOwnerRequests: (page = 1, page_size = 20) =>
    client.get<PaginatedResponse<RentalRequest>>('/rental-requests/owner', { params: { page, page_size } }).then(unwrapPaginated),

  accept: (id: number) =>
    client.patch<APIResponse<RentalRequest>>(`/rental-requests/${id}/accept`).then(unwrap),

  reject: (id: number) =>
    client.patch<APIResponse<RentalRequest>>(`/rental-requests/${id}/reject`).then(unwrap),

  cancel: (id: number) =>
    client.patch<APIResponse<RentalRequest>>(`/rental-requests/${id}/cancel`).then(unwrap),
};

export const messages = {
  getConversations: () =>
    client.get<APIResponse<Conversation[]>>('/messages/conversations').then(unwrap),

  createConversation: (data: { user_id: number; listing_id?: number }) =>
    client.post<APIResponse<Conversation>>('/messages/conversations', data).then(unwrap),

  getMessages: (conversationId: number, page = 1, page_size = 50) =>
    client.get<APIResponse<Message[]>>(`/messages/conversations/${conversationId}`, { params: { page, page_size } }).then(unwrap),

  sendMessage: (conversationId: number, content: string) =>
    client.post<APIResponse<Message>>(`/messages/conversations/${conversationId}`, { content }).then(unwrap),

  markRead: (conversationId: number) =>
    client.post(`/messages/conversations/${conversationId}/read`),
};

export const notifications = {
  getAll: (page = 1, page_size = 20) =>
    client.get<PaginatedResponse<Notification>>('/notifications', { params: { page, page_size } }).then(unwrapPaginated),

  getUnreadCount: () =>
    client.get<APIResponse<{ count: number }>>('/notifications/unread-count').then(unwrap),

  markRead: (id: number) =>
    client.patch<APIResponse<null>>(`/notifications/${id}/read`),

  markAllRead: () =>
    client.patch<APIResponse<null>>('/notifications/read-all'),
};

export const reviews = {
  getReviews: (listingId: number) =>
    client.get<APIResponse<Review[]>>(`/listings/${listingId}/reviews`).then(unwrap),

  createReview: (listingId: number, data: { rating: number; comment: string }) =>
    client.post<APIResponse<Review>>(`/listings/${listingId}/reviews`, data).then(unwrap),
};

export const upload = {
  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return client.post<APIResponse<{ image_url: string; image_key: string }>>('/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(unwrap);
  },
};
