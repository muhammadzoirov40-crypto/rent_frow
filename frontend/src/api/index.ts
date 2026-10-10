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
  dc_account?: string;
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
  /** True while a paid TOP window is live — server-computed, drives the badge. */
  is_top?: boolean;
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
  /** Live paid TOP window — the badge and the homepage section read this. */
  is_top?: boolean;
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
  /** Set when this chat was opened by a rental request — the chat then shows
   *  that request's card with the owner's accept/reject actions. */
  rental_request_id: number | null;
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
  /** The DC checkout reference this payment was opened under, when there is
   *  one — what the operator matches in the statement. Pinned by the API. */
  payment_reference?: string | null;
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

  updateProfile: (data: { display_name?: string; dc_account?: string }) =>
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

  /** The homepage TOP section: live paid windows only. Comes back empty
   *  (the section hides itself) when nobody is promoted. */
  top: (limit = 12) =>
    client.get<APIResponse<ListingListItem[]>>('/listings/top', { params: { limit } }).then(unwrap),

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

  update: (id: number, data: Partial<ListingCreateData> & { status?: string; available?: boolean; latitude?: number | null; longitude?: number | null }) =>
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

export interface GeocodeSearchResult {
  latitude: number;
  longitude: number;
  label: string;
}

export const geocode = {
  // The browser never calls the geocoder itself: the server does, under its
  // own User-Agent and rate limit. A miss comes back as data: null.
  search: (q: string) =>
    client.get<APIResponse<GeocodeSearchResult | null>>('/geocode/search', { params: { q } }).then(unwrap),
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
  latitude?: number | null;
  longitude?: number | null;
  rental_rules?: string;
  contact_phone?: string;
  contact_name?: string;
  image_urls?: string[];
  /** Collected while posting and folded into the owner's profile: one
   *  wallet per person, not one per listing. Omitted, it is left alone. */
  dc_account?: string;
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

  getById: (id: number) =>
    client.get<APIResponse<RentalRequest>>(`/rental-requests/${id}`).then(unwrap),

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

export interface WalletSummary {
  /** spendable right now */
  balance: number;
  /** reserved by open / accepted rental requests */
  held: number;
  /** balance + held — what the user actually owns */
  total: number;
  currency: string;
}

export interface WalletTransactionRecord {
  id: number;
  /** signed change to the available balance */
  amount: number;
  /** signed change to the reserved balance */
  held_amount: number;
  type: 'TOPUP' | 'HELD' | 'RELEASED' | 'REFUNDED' | 'COMPLETED';
  rental_request_id: number | null;
  listing_title: string | null;
  description: string | null;
  balance_after: number;
  held_after: number;
  created_at: string;
}

/** A top-up waiting for DC Wallet to confirm it — money that is on its way
 *  but does not exist yet. `reference` is what travels in the payment link. */
export interface TopupIntent {
  id: number;
  amount: number;
  reference: string;
  status: 'PENDING' | 'PAID' | 'FAILED';
  provider: string;
  created_at: string;
  paid_at: string | null;
}

export const wallet = {
  /** Available vs reserved — the backend is the source of truth. */
  get: () => client.get<APIResponse<WalletSummary>>('/wallet').then(unwrap),

  transactions: (page = 1, page_size = 20) =>
    client
      .get<PaginatedResponse<WalletTransactionRecord>>('/wallet/transactions', { params: { page, page_size } })
      .then(unwrapPaginated),

  /** Build the DC City payment link for this amount. Nothing is credited
   *  here — only a waiting row is opened, settled by the provider's callback. */
  prepare: (amount: number) =>
    client.post<APIResponse<TopupIntent & { url: string }>>('/wallet/topup/prepare', { amount }).then(unwrap),

  /** Pending and settled top-ups, newest first. */
  topups: (page = 1, page_size = 20) =>
    client
      .get<PaginatedResponse<TopupIntent>>('/wallet/topups', { params: { page, page_size } })
      .then(unwrapPaginated),

  /** An operator closes a top-up by hand. DC City exposes no status API, so
   *  until their callback is registered the payment is matched by reference
   *  in the statement and confirmed here — through the very same idempotent
   *  settle the callback uses. Admin only. Returns the whole envelope so the
   *  caller can tell CREDITED from ALREADY_PAID. */
  confirmTopup: (reference: string) =>
    client
      .post<APIResponse<TopupIntent>>(`/wallet/topups/${encodeURIComponent(reference)}/confirm`)
      .then((response) => response.data),

  /** Manual credit — admin only in production; the webhook is what settles a
   *  real payment. Kept for seeding and for the admin panel. */
  topUp: (amount: number, description?: string) =>
    client.post<APIResponse<WalletSummary>>('/wallet/topup', { amount, description }).then(unwrap),
};

// ---------------------------------------------------------------- TOP promo
export interface TopPlan {
  id: number;
  name: string;
  duration_key: string;
  price: number;
  is_active: boolean;
  created_at: string;
}

export interface TopPromotion {
  id: number;
  listing_id: number;
  listing_title: string | null;
  user_id: number;
  user_name: string | null;
  plan_id: number;
  plan_name: string;
  duration_key: string;
  price: number;
  status: 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'REJECTED' | 'CANCELLED';
  payment_status: 'UNPAID' | 'PAID' | 'APPROVED' | 'REFUNDED';
  started_at: string | null;
  expires_at: string | null;
  reject_reason: string | null;
  /** The DC Wallet reference this request is (or was) paid under — the
   *  string in the checkout's `f3` and in the statement the admin checks. */
  payment_reference: string | null;
  /** The receipt (screenshot) the owner attached after paying. */
  check_image_url: string | null;
  created_at: string;
}

export interface TopStats {
  total: number;
  active: number;
  pending: number;
  expired: number;
  rejected: number;
  cancelled: number;
  /** Sum of PAID promotions — money that actually moved, never a projection. */
  revenue: number;
  plans: TopPlan[];
}

export const topPromotions = {
  /** Public: only plans an admin switched on (a disabled plan with a
   *  placeholder price is never visible or purchasable). */
  plans: () => client.get<APIResponse<TopPlan[]>>('/promotions/plans').then(unwrap),

  mine: () => client.get<APIResponse<TopPromotion[]>>('/promotions/mine').then(unwrap),

  /** Buy (wallet balance) or request (admin approval). Two ids go out —
   *  price, status and expiry are computed by the server, so this form
   *  cannot discount, fast-track or pre-date anything. */
  request: (listingId: number, planId: number) =>
    client
      .post<APIResponse<{ promotion: TopPromotion; active: boolean }>>('/promotions', {
        listing_id: listingId,
        plan_id: planId,
      })
      .then(unwrap),

  /** Open a DC Wallet (Dushanbe City) checkout for this plan: the server
   *  creates (or re-links) the pending record and returns the link; the
   *  reference in it is what turns the record into a live window. */
  payDc: (listingId: number, planId: number) =>
    client
      .post<APIResponse<{ url: string; reference: string; promotion: TopPromotion }>>(
        '/promotions/pay-dc',
        { listing_id: listingId, plan_id: planId },
      )
      .then(unwrap),

  /** Send the payment receipt (screenshot) for a waiting request: the file
   *  goes straight to storage, only the key is stored, and the response
   *  carries a fresh link to it. Owner-only while still open and unpaid. */
  sendCheck: (promoId: number, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return client
      .post<APIResponse<TopPromotion>>(`/promotions/${promoId}/check`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then(unwrap);
  },

  admin: {
    plans: () => client.get<APIResponse<TopPlan[]>>('/promotions/admin/plans').then(unwrap),

    createPlan: (data: { name: string; duration_key: string; price: number; is_active: boolean }) =>
      client.post<APIResponse<TopPlan>>('/promotions/admin/plans', data).then(unwrap),

    updatePlan: (
      planId: number,
      data: Partial<{ name: string; duration_key: string; price: number; is_active: boolean }>,
    ) => client.put<APIResponse<TopPlan>>(`/promotions/admin/plans/${planId}`, data).then(unwrap),

    list: (
      params: {
        status?: string;
        listing_id?: number;
        user_id?: number;
        date_from?: string;
        date_to?: string;
        page?: number;
        page_size?: number;
      } = {},
    ) =>
      client
        .get<PaginatedResponse<TopPromotion>>('/promotions/admin/list', { params })
        .then(unwrapPaginated),

    stats: () => client.get<APIResponse<TopStats>>('/promotions/admin/stats').then(unwrap),

    approve: (id: number) =>
      client.post<APIResponse<TopPromotion>>(`/promotions/admin/${id}/approve`).then(unwrap),

    reject: (id: number, reason?: string) =>
      client
        .post<APIResponse<TopPromotion>>(`/promotions/admin/${id}/reject`, { reason })
        .then(unwrap),

    /** Manual deactivation of a live window (a wallet-charged one is refunded once). */
    cancel: (id: number) =>
      client.post<APIResponse<TopPromotion>>(`/promotions/admin/${id}/cancel`).then(unwrap),

    /** Manual (re)activation — the window starts fresh, from this moment. */
    activate: (id: number) =>
      client.post<APIResponse<TopPromotion>>(`/promotions/admin/${id}/activate`).then(unwrap),

    /** The DC money is visible in the statement: close the payment through
     *  the same idempotent settle the callback uses — once, never twice.
     *  Returns the flag too: the second click honestly says "already". */
    confirmPayment: (id: number) =>
      client
        .post<APIResponse<TopPromotion>>(`/promotions/admin/${id}/confirm-payment`)
        .then((r) => ({
          already: r.data.message === 'ALREADY_PAID',
          promotion: r.data.data,
        })),
  },
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
  /** The same payment, through DC Wallet (Dushanbe City): the browser follows
   *  the link the server built for the request's own amount, and the reference
   *  it carries is how the callback finds this exact payment. A checkout left
   *  half-finished re-opens its own link instead of refusing the second click. */
  payDc: (rentalRequestId: number, paymentType: 'BOOKING' | 'DEPOSIT' = 'BOOKING') =>
    client
      .post<APIResponse<{ url: string; reference: string; payment: PaymentRecord }>>(
        '/payments/pay-dc',
        {
          rental_request_id: rentalRequestId,
          payment_type: paymentType,
        },
      )
      .then(unwrap),
  /** The owner of the listing (or an admin) marks the money as received. */
  confirm: (paymentId: number) =>
    client.post<APIResponse<PaymentRecord>>(`/payments/${paymentId}/confirm`).then(unwrap),
  /** Admin: every payment on the platform, newest first — the panel's
   *  confirmation list, with each row's DC reference for the statement. */
  adminAll: (skip = 0, limit = 100) =>
    client
      .get<PaginatedResponse<PaymentRecord>>('/payments/admin/all', { params: { skip, limit } })
      .then(unwrapPaginated),
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
