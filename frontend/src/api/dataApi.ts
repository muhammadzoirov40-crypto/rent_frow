import api from './client'

export interface Equipment {
  id: number
  category_id: number
  category_name: string | null
  name: string
  description: string | null
  serial_number: string
  price_per_day: number
  deposit_amount: number
  status: string
  condition: string
  image_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Category {
  id: number
  name: string
  description: string | null
  created_at: string
}

export interface Booking {
  id: number
  customer_id: number
  equipment_id: number
  start_date: string
  end_date: string
  total_price: number
  deposit_amount: number
  status: string
  created_at: string
  updated_at: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  page_size: number
}

export interface Rental {
  id: number
  booking_id: number
  customer_id: number
  equipment_id: number
  status: string
  pickup_at: string | null
  expected_return_at: string | null
  returned_at: string | null
  created_at: string
  updated_at: string
}

export interface Payment {
  id: number
  booking_id: number
  customer_id: number
  amount: number
  payment_type: string
  status: string
  transaction_id: string | null
  created_at: string
}

export const equipmentApi = {
  list: (params?: Record<string, any>) => api.get<{ data: PaginatedResponse<Equipment> }>('/equipment', { params }),
  get: (id: number) => api.get<{ data: Equipment }>(`/equipment/${id}`),
}

export const categoryApi = {
  list: () => api.get<{ data: PaginatedResponse<Category> }>('/categories'),
}

export const bookingApi = {
  list: () => api.get<{ data: PaginatedResponse<Booking> }>('/bookings'),
  create: (data: { equipment_id: number; start_date: string; end_date: string }) => api.post<{ data: Booking }>('/bookings', data),
  cancel: (id: number) => api.post<{ data: Booking }>(`/bookings/${id}/cancel`),
}

export const rentalApi = {
  list: (params?: Record<string, any>) => api.get<{ data: PaginatedResponse<Rental> }>('/rentals', { params }),
  get: (id: number) => api.get<{ data: Rental }>(`/rentals/${id}`),
  requestReturn: (id: number) => api.post<{ data: Rental }>(`/rentals/${id}/request-return`),
}

export const paymentApi = {
  create: (data: { booking_id: number; amount: number; payment_type: string }) =>
    api.post<{ data: Payment }>('/payments', data),
  listMy: (params?: Record<string, any>) => api.get<{ data: PaginatedResponse<Payment> }>('/payments', { params }),
  getByBooking: (bookingId: number) => api.get<{ data: Payment[] }>(`/payments/booking/${bookingId}`),
}
