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
  is_active: boolean;
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
  latitude?: number | null;
  longitude?: number | null;
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
  available?: boolean;
}

export interface ListingListItem {
  id: number;
  title: string;
  price: number;
  price_unit: string;
  city_name: string | null;
  district_name?: string | null;
  primary_image: string | null;
  views_count: number;
  average_rating: number;
  rating_count?: number;
  available?: boolean;
  is_verified?: boolean;
  created_at: string;
  is_favorited: boolean;
  latitude?: number | null;
  longitude?: number | null;
  city_id?: number | null;
  distance_km?: number | null;
}

export interface SubCategory {
  id: number;
  category_id: number;
  name: string;
  name_tj?: string | null;
  name_en?: string | null;
  icon: string | null;
}

export interface Category {
  id: number;
  name: string;
  name_tj: string | null;
  name_en?: string | null;
  category_group?: string;
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
  latitude?: number | null;
  longitude?: number | null;
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
  reply_to_id?: number | null;
  reply_to_content?: string | null;
  reply_to_sender_name?: string | null;
  edited_at?: string | null;
  pinned?: boolean;
  reactions?: Record<string, number[]>;
  forwarded_from_name?: string | null;
}

export interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: string;
  data?: Record<string, string | number | boolean | null> | null;
  reference_id: number | null;
  reference_type: string | null;
  is_read: boolean;
  created_at: string;
}

export interface Review {
  id: number;
  customer_id: number;
  listing_id: number;
  rental_request_id?: number | null;
  rating: number;
  comment?: string | null;
  created_at: string;
  customer_name?: string | null;
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

export interface PaymentRecord {
  id: number;
  booking_id: number | null;
  rental_request_id?: number | null;
  customer_id: number;
  amount: number;
  payment_type: 'BOOKING' | 'DEPOSIT' | 'DAMAGE' | 'LATE_FEE' | 'REFUND';
  status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  transaction_id: string | null;
  created_at: string;
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
    client.post<APIResponse<{ email: string; sent_via_email: boolean; is_registered: boolean; dev_code?: string | null }>>('/auth/send-otp', { email }).then(unwrap),

  verifyOtp: (email: string, code: string) =>
    client.post<APIResponse<{ valid: boolean }>>('/auth/verify-otp', { email, code }).then(unwrap),

  register: (data: { email: string; otp_code: string; role?: string; display_name?: string }) =>
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

  googleAuth: (data: { token: string }) =>
    client.post<APIResponse<{ access_token: string; token_type: string; user: { id: number; email: string; role: string } }>>('/auth/google', data).then(unwrap),
};

export const listings = {
  search: (params: Record<string, unknown>) =>
    client.get<PaginatedResponse<ListingListItem>>('/listings', { params }).then(unwrapPaginated),

  nearby: (params: { lat: number; lng: number; radius?: number; limit?: number } & Record<string, unknown>) =>
    client.get<APIResponse<(ListingListItem & { distance_km?: number | null })[]>>('/listings/nearby', { params }).then(unwrap),

  getOne: (id: number) =>
    client.get<APIResponse<Listing>>(`/listings/${id}`).then(unwrap),

  getCalendar: (id: number, startDate: string, endDate: string) =>
    client
      .get<APIResponse<{ listing_id: number; days: { date: string; status: string }[] }>>(
        `/listings/${id}/calendar`,
        { params: { start_date: startDate, end_date: endDate } },
      )
      .then(unwrap),

  create: (data: ListingCreateData) =>
    client.post<APIResponse<Listing>>('/listings', data).then(unwrap),

  update: (id: number, data: Partial<ListingCreateData> & { status?: string; available?: boolean }) =>
    client.patch<APIResponse<Listing>>(`/listings/${id}`, data).then(unwrap),

  delete: (id: number) =>
    client.delete(`/listings/${id}`),

  deleteListing: (id: number) =>
    client.delete(`/listings/${id}`),

  submitForVerification: (id: number) =>
    client.post<APIResponse<Listing>>(`/listings/${id}/submit-for-verification`).then(unwrap),

  toggleFavorite: (id: number) =>
    client.post<APIResponse<{ is_favorited: boolean }>>(`/listings/${id}/favorite`).then(unwrap),

  getMyListings: (page = 1, page_size = 20) =>
    client.get<PaginatedResponse<Listing>>('/listings/owner/my', { params: { page, page_size } }).then(unwrapPaginated),

  getOwnerListings: (page = 1, page_size = 20) =>
    client.get<PaginatedResponse<Listing>>('/listings/owner/my', { params: { page, page_size } }).then((r) => r.data.data || []),
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

export interface PublicStats {
  listings: number;
  users: number;
  cities: number;
  avg_rating: number;
}

export const stats = {
  getPublic: () => client.get<APIResponse<PublicStats>>('/stats').then(unwrap),
};

export const favorites = {
  getAll: (page = 1, page_size = 20) =>
    client.get<PaginatedResponse<ListingListItem>>('/favorites', { params: { page, page_size } }).then(unwrapPaginated),

  getFavorites: (page = 1, page_size = 20) =>
    client.get<PaginatedResponse<ListingListItem>>('/favorites', { params: { page, page_size } }).then((r) => r.data.data || []),
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

  acceptRequest: (id: number) =>
    client.patch<APIResponse<RentalRequest>>(`/rental-requests/${id}/accept`).then(unwrap),

  reject: (id: number) =>
    client.patch<APIResponse<RentalRequest>>(`/rental-requests/${id}/reject`).then(unwrap),

  rejectRequest: (id: number) =>
    client.patch<APIResponse<RentalRequest>>(`/rental-requests/${id}/reject`).then(unwrap),

  cancel: (id: number) =>
    client.patch<APIResponse<RentalRequest>>(`/rental-requests/${id}/cancel`).then(unwrap),

  cancelRequest: (id: number) =>
    client.patch<APIResponse<RentalRequest>>(`/rental-requests/${id}/cancel`).then(unwrap),
};

export const messages = {
  getConversations: () =>
    client.get<APIResponse<Conversation[]>>('/messages/conversations').then(unwrap),

  createConversation: (data: { user_id: number; listing_id?: number }) =>
    client.post<APIResponse<Conversation>>('/messages/conversations', data).then(unwrap),

  getMessages: (conversationId: number, page = 1, page_size = 50) =>
    client.get<APIResponse<Message[]>>(`/messages/conversations/${conversationId}`, { params: { page, page_size } }).then(unwrap),

  sendMessage: (
    conversationId: number,
    content: string,
    opts?: { reply_to_id?: number | null; forwarded_from_name?: string | null },
  ) =>
    client.post<APIResponse<Message>>(`/messages/conversations/${conversationId}`, {
      content,
      reply_to_id: opts?.reply_to_id ?? null,
      forwarded_from_name: opts?.forwarded_from_name ?? null,
    }).then(unwrap),

  editMessage: (messageId: number, content: string) =>
    client.patch<APIResponse<Message>>(`/messages/${messageId}`, { content }).then(unwrap),

  toggleReaction: (messageId: number, emoji: string) =>
    client.post<APIResponse<Record<string, number[]>>>(`/messages/${messageId}/reactions`, { emoji }).then(unwrap),

  pinMessage: (messageId: number, pinned: boolean) =>
    client.patch<APIResponse<Message>>(`/messages/${messageId}/pin`, { pinned }).then(unwrap),

  markRead: (conversationId: number) =>
    client.post(`/messages/conversations/${conversationId}/read`),

  deleteMessage: (messageId: number) => client.delete(`/messages/${messageId}`),

  clearConversation: (conversationId: number) =>
    client.delete(`/messages/conversations/${conversationId}`),
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

export const payments = {
  listMine: (skip = 0, limit = 20) =>
    client
      .get<PaginatedResponse<PaymentRecord>>('/payments', { params: { skip, limit } })
      .then(unwrapPaginated),
  /** What has been paid against one rental request — visible to the renter,
   *  the owner of the listing, and admins. */
  forRequest: (rentalRequestId: number) =>
    client
      .get<APIResponse<PaymentRecord[]>>(`/payments/rental-request/${rentalRequestId}`)
      .then(unwrap),
  /** Pay for an accepted rental request. The amount is not sent: the server
   *  reads it off the request, so nobody can underpay from here. */
  payForRequest: (rentalRequestId: number, paymentType: 'BOOKING' | 'DEPOSIT' = 'BOOKING') =>
    client
      .post<APIResponse<PaymentRecord>>('/payments', {
        rental_request_id: rentalRequestId,
        payment_type: paymentType,
      })
      .then(unwrap),
  /** The owner of the listing (or an admin) marks the money as received. */
  confirm: (paymentId: number) =>
    client.post<APIResponse<PaymentRecord>>(`/payments/${paymentId}/confirm`).then(unwrap),
};

export const reviews = {
  getReviews: (listingId: number) =>
    client.get<APIResponse<Review[]>>(`/listings/${listingId}/reviews`).then(unwrap),

  createReview: (listingId: number, data: { rating: number; comment: string }) =>
    client.post<APIResponse<Review>>(`/listings/${listingId}/reviews`, data).then(unwrap),

  deleteReview: (reviewId: number) =>
    client.delete<APIResponse<null>>(`/reviews/${reviewId}`).then(unwrap),
};

export const upload = {
  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return client.post<APIResponse<{ image_url: string; image_key: string }>>('/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(unwrap);
  },
  uploadFile: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return client.post<
      APIResponse<{ file_url: string; file_key: string; name: string; size: number; content_type: string }>
    >('/upload/file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(unwrap);
  },
};

// ---------------------------------------------------------------------------
// In-app AI assistant (Gemini + RentHub tools)
// ---------------------------------------------------------------------------

export interface AIListingCard {
  id: number;
  title: string;
  price: number;
  price_unit: string;
  rooms: number | null;
  city_name: string | null;
  district_name: string | null;
  primary_image: string | null;
  average_rating: number | null;
  rating_count: number;
  available: boolean;
}

export interface AIMessageTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIChatResult {
  reply: string;
  listings: AIListingCard[];
  tools_used: string[];
}

export const ai = {
  chat: (message: string, history: AIMessageTurn[]) =>
    client.post<APIResponse<AIChatResult>>('/ai/chat', { message, history }).then(unwrap),
};
